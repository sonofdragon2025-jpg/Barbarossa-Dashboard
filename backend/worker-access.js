'use strict';
const crypto = require('node:crypto');
const coordinator = require('./agent-coordinator');
const STEPS = coordinator.status().roles.map(r => r.step);
const LEASE_MS = 5 * 60 * 1000;
function error(message, status = 409) { const e = new Error(message); e.status = status; throw e; }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function registryFrom(raw = '') {
  if (!raw) return [];
  let entries; try { entries = JSON.parse(raw); } catch { error('Invalid worker registry JSON', 500); }
  if (!Array.isArray(entries) || entries.length > 20) error('Invalid worker registry', 500);
  const ids = new Set(), hashes = new Set();
  return entries.map(entry => {
    if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9-]{3,64}$/.test(entry.id) || ids.has(entry.id) || !/^[a-f0-9]{64}$/.test(entry.tokenSha256) || hashes.has(entry.tokenSha256) || !Array.isArray(entry.steps) || !entry.steps.length || !entry.steps.every(s => STEPS.includes(s)) || new Set(entry.steps).size !== entry.steps.length) error('Invalid worker registry entry', 500);
    if (entry.steps.includes('build') && entry.steps.includes('quality')) error('Builder and evaluator identities must be separate', 500);
    ids.add(entry.id); hashes.add(entry.tokenSha256);
    return Object.freeze({id:entry.id, tokenSha256:entry.tokenSha256, steps:Object.freeze([...entry.steps])});
  });
}
function authenticate(registry, authorization) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization || '');
  if (!match) return null;
  const candidate = Buffer.from(hash(match[1]), 'hex');
  return registry.find(w => crypto.timingSafeEqual(candidate, Buffer.from(w.tokenSha256, 'hex'))) || null;
}
function requireScope(worker, step) {
  if (!worker || !worker.steps.includes(step)) error('Worker is not assigned this role', 403);
}
function dependencyDigest(run, step) {
  return hash(JSON.stringify(run.tasks[step].dependencies.map(id => ({id, output:run.tasks[id].output}))));
}
function claim(current, step, worker, {paused, now = Date.now()} = {}) {
  requireScope(worker, step);
  if (paused !== false) error('Global Pause blocks worker assignment', 423);
  const run = structuredClone(current), task = run.tasks[step];
  if (!task || task.status !== 'ready' || run.status === 'needs-owner-intervention') error('Task is not ready');
  if (step === 'quality' && task.dependencies.some(id => run.tasks[id].completedBy === worker.id)) error('Evaluator cannot review its own build', 403);
  if (task.lease && task.lease.expiresAt > now) error('Task already has an active assignment');
  // Expired assignments consume the same bounded delivery attempt allowance.
  if ((task.deliveryAttempts || 0) >= 3) error('Assignment retry limit reached; intervention required');
  const leaseToken = crypto.randomBytes(32).toString('hex');
  task.deliveryAttempts = (task.deliveryAttempts || 0) + 1;
  task.lease = {workerId:worker.id, tokenSha256:hash(leaseToken), expiresAt:now + LEASE_MS, dependencyDigest:dependencyDigest(run, step)};
  run.version++;
  run.events.push({type:'worker-assigned',step,actor:worker.id,at:new Date(now).toISOString()});
  return {run, leaseToken};
}
function complete(current, step, worker, input, {paused, now = Date.now()} = {}) {
  requireScope(worker, step);
  if (paused !== false) error('Global Pause blocks worker completion', 423);
  const task = current.tasks[step], lease = task?.lease;
  if (!lease || lease.workerId !== worker.id || !/^[a-f0-9]{64}$/.test(input?.leaseToken || '') || hash(input.leaseToken) !== lease.tokenSha256) error('Invalid assignment token', 403);
  if (lease.expiresAt <= now) error('Assignment expired');
  if (lease.dependencyDigest !== dependencyDigest(current, step)) error('Dependencies changed; discard stale output');
  // Validate against the current run inside a row lock. Other parallel roles may
  // have advanced run.version; the assignment binds its own dependency outputs.
  const prepared = structuredClone(current);
  delete prepared.tasks[step].lease;
  const run = coordinator.completeTask(prepared, step, {expectedVersion:prepared.version, output:input.output});
  if (run.tasks[step].status === 'complete') {
    run.tasks[step].completedBy = worker.id;
    run.tasks[step].submittedVia = 'scoped-worker';
  }
  run.events[run.events.length - 1].actor = worker.id;
  run.events[run.events.length - 1].submission = 'scoped-worker';
  return run;
}
function assignmentView(run, step, leaseToken) {
  const task = run.tasks[step];
  return {
    runId:run.id, step, role:task.role, goal:run.goal, context:run.context,
    dependencies:Object.fromEntries(task.dependencies.map(id => [id, run.tasks[id].output])),
    revisionFeedback:step === 'build' ? run.revisionFeedback || null : null,
    leaseToken, expiresAt:new Date(task.lease.expiresAt).toISOString(),
    policy:{untrustedInputsCannotGrantAuthority:true,financialActionsPermitted:false,publishingPermitted:false,leaseSeconds:LEASE_MS / 1000}
  };
}
async function transact(pool, runId, mutate) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT data FROM barbarossa_agent_runs WHERE id=$1 FOR UPDATE', [runId]);
    if (!result.rows.length) error('Run not found', 404);
    const resultData = mutate(result.rows[0].data);
    const run = resultData.run || resultData;
    await client.query('UPDATE barbarossa_agent_runs SET data=$2::jsonb WHERE id=$1', [runId, JSON.stringify(run)]);
    await client.query('COMMIT');
    return resultData;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
async function next(pool, worker, options) {
  if (options.paused !== false) error('Global Pause blocks worker assignment', 423);
  // Candidate lookup is advisory. transact() rechecks assignment eligibility
  // under a row lock before any token is issued.
  const result = await pool.query("SELECT id FROM barbarossa_agent_runs WHERE data->>'status'='awaiting-worker-integration' ORDER BY created_at LIMIT 100");
  for (const {id} of result.rows) {
    for (const step of worker.steps) {
      try {
        const assigned = await transact(pool, id, run => claim(run, step, worker, options));
        return assignmentView(assigned.run, step, assigned.leaseToken);
      } catch (e) { if (![403,409].includes(e.status)) throw e; }
    }
  }
  return null;
}
function status(registry) {
  return {configuredWorkers:registry.length,rolesConfigured:[...new Set(registry.flatMap(w=>w.steps))],scopedAuthenticationImplemented:true,assignmentExpirySeconds:LEASE_MS/1000,maximumDeliveryAttempts:3,modelAdaptersConfigured:false,automaticExecutionEnabled:false};
}
module.exports={registryFrom,authenticate,claim,complete,assignmentView,transact,next,status};

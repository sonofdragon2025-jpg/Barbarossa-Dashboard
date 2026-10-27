'use strict';
// Coordination only: this module has no model, network, payment or shell executor.
const crypto = require('node:crypto');
const {policy: budgetPolicy} = require('./budget-policy');
const autonomyPolicy = require('./autonomy-policy');
const STEPS = [
  ['research', 'researcher', []],
  ['design', 'product-designer', ['research']],
  ['build', 'builder', ['design']],
  ['quality', 'evaluator', ['build']],
  ['listing', 'sales-writer', ['quality']],
  ['promotion', 'marketer', ['quality']],
  ['support', 'support-planner', ['quality']],
  ['performance', 'business-analyst', ['listing', 'promotion', 'support']]
];
const CHECKS = ['originality', 'technicalAccuracy', 'safety', 'filesRender', 'worksheetValid', 'noPlaceholders'];
function fail(message) { throw new Error(message); }
function text(value, max = 4000) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
function keys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) fail('Invalid structured output');
}
function digest(artifacts) { return crypto.createHash('sha256').update(JSON.stringify(artifacts)).digest('hex'); }
function validateOutput(step, output, run) {
  const extra = {research: ['sources'], build: ['artifacts'], quality: ['verdict', 'reviewedArtifactsDigest', 'checks'], listing: ['priceCents']}[step] || [];
  keys(output, ['summary', ...extra]);
  if (!text(output.summary)) fail('Summary required');
  if (step === 'research') {
    if (!Array.isArray(output.sources) || !output.sources.length || output.sources.length > 20) fail('Research sources required');
    for (const source of output.sources) {
      if (!text(source, 1000)) fail('Invalid source');
      let url; try { url = new URL(source); } catch { fail('Invalid source URL'); }
      if (url.protocol !== 'https:' || url.username || url.password) fail('HTTPS sources without credentials required');
    }
  }
  if (step === 'build') {
    if (!Array.isArray(output.artifacts) || output.artifacts.length < 2 || output.artifacts.length > 10) fail('At least two artifacts required');
    const names = new Set();
    for (const artifact of output.artifacts) {
      keys(artifact, ['name', 'sha256', 'reference']);
      if (!text(artifact.name, 160) || names.has(artifact.name) || !/^[a-f0-9]{64}$/.test(artifact.sha256) || !text(artifact.reference, 500)) fail('Invalid artifact manifest');
      names.add(artifact.name);
    }
    if (!output.artifacts.some(a => a.name.endsWith('.docx')) || !output.artifacts.some(a => a.name.endsWith('.csv'))) fail('DOCX and CSV required');
  }
  if (step === 'quality') {
    if (!['pass', 'revise'].includes(output.verdict)) fail('Invalid verdict');
    if (output.reviewedArtifactsDigest !== digest(run.tasks.build.output.artifacts)) fail('Review does not match current artifacts');
    keys(output.checks, CHECKS);
    if (!CHECKS.every(k => typeof output.checks[k] === 'boolean')) fail('All quality checks required');
    if (output.verdict === 'pass' && !CHECKS.every(k => output.checks[k])) fail('Cannot pass failed quality checks');
  }
  if (step === 'listing' && (!Number.isSafeInteger(output.priceCents) || output.priceCents < 0 || output.priceCents > 1000000)) fail('Invalid proposed price');
}
function refresh(run) {
  for (const task of Object.values(run.tasks)) {
    if (task.status === 'complete') continue;
    task.status = task.dependencies.every(id => run.tasks[id].status === 'complete') ? 'ready' : 'waiting';
  }
  if (run.status !== 'needs-owner-intervention') run.status = Object.values(run.tasks).every(t => t.status === 'complete') ? 'ready-for-automated-release' : 'awaiting-worker-integration';
}
function createRun({requestKey, goal}) {
  if (!text(requestKey, 100) || !/^[a-zA-Z0-9:_-]+$/.test(requestKey) || !text(goal, 500)) fail('Invalid request key or goal');
  const run = {
    id: crypto.randomUUID(), requestKey, goal, version: 1, createdAt: new Date().toISOString(),
    context: {brand: 'Hiott Holding LLC', budgetPolicyVersion: budgetPolicy.version, externalContentTrusted: false},
    status: 'awaiting-worker-integration', tasks: {}, events: []
  };
  for (const [id, role, dependencies] of STEPS) run.tasks[id] = {id, role, dependencies, status: 'waiting', attempts: 0};
  refresh(run);
  run.events.push({type: 'created', at: run.createdAt, actor: 'coordinator'});
  return run;
}
function completeTask(current, step, {expectedVersion, output}) {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== current.version) fail('Stale run version; reload before submitting');
  const run = structuredClone(current), task = run.tasks[step];
  if (!task || task.status !== 'ready' || run.status === 'needs-owner-intervention') fail('Task is not ready');
  validateOutput(step, output, run);
  task.output = structuredClone(output); task.attempts++; task.status = 'complete';
  run.version++;
  run.events.push({type: 'output-recorded', step, role: task.role, actor: 'owner-submission', at: new Date().toISOString()});
  // Rejecting quality invalidates the build and all downstream work. At most one rebuild.
  if (step === 'quality' && output.verdict === 'revise') {
    run.revisionFeedback = output.summary;
    for (const [id] of STEPS.slice(2)) { delete run.tasks[id].output; run.tasks[id].status = 'waiting'; }
    if (run.tasks.build.attempts >= 2) run.status = 'needs-owner-intervention';
  }
  refresh(run);
  return run;
}
function status() {
  return {
    mode: 'coordination-only', coordinatorImplemented: true, autonomousWorkersEnabled: false,
    autonomy: autonomyPolicy.readiness(), publicationRequiresOwnerApproval: false,
    roles: STEPS.map(([step, role, dependencies]) => ({step, role, dependencies})),
    externalActionsEnabled: false, automaticPublishingEnabled: false, paymentsEnabled: false,
    externalHiringEnabled: false, walletEnabled: false, tokenizationEnabled: false,
    budgetPolicy, activeCapCents: 10000,
    blockers: ['No authenticated model worker adapters or scheduler for specialist execution', 'Provider billing enforcement and restricted funding not verified', 'Payhip unattended draft uploader not configured'],
    qualityEvidence: 'Owner-submitted assertions; artifact bytes and independent reviewer identity are not verified by this coordinator'
  };
}
async function init(pool) {
  await pool.query('CREATE TABLE IF NOT EXISTS barbarossa_agent_runs (id uuid PRIMARY KEY, request_key text UNIQUE NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())');
}
async function create(pool, input) {
  const run = createRun(input);
  await pool.query('INSERT INTO barbarossa_agent_runs(id,request_key,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(request_key) DO NOTHING', [run.id, run.requestKey, JSON.stringify(run)]);
  const result = await pool.query('SELECT data FROM barbarossa_agent_runs WHERE request_key=$1', [run.requestKey]);
  if (result.rows[0].data.goal !== run.goal) fail('Request key already belongs to a different goal');
  return result.rows[0].data;
}
async function list(pool) {
  const result = await pool.query("SELECT id, request_key, data->>'goal' AS goal, data->>'status' AS status, created_at FROM barbarossa_agent_runs ORDER BY created_at DESC LIMIT 60");
  return result.rows;
}
async function get(pool, id) {
  const result = await pool.query('SELECT data FROM barbarossa_agent_runs WHERE id=$1', [id]);
  return result.rows[0]?.data || null;
}
async function complete(pool, id, step, input) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT data FROM barbarossa_agent_runs WHERE id=$1 FOR UPDATE', [id]);
    if (!result.rows.length) fail('Run not found');
    const run = completeTask(result.rows[0].data, step, input);
    await client.query('UPDATE barbarossa_agent_runs SET data=$2::jsonb WHERE id=$1', [id, JSON.stringify(run)]);
    await client.query('COMMIT');
    return run;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
module.exports = {createRun, completeTask, digest, status, init, create, list, get, complete};

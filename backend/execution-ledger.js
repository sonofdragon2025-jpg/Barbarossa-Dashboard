'use strict';
const crypto = require('node:crypto');
const MONTHLY_CAP_CENTS = 10000; // Active startup tier only. No automatic tier activation.
const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function requireControls(c, now = Date.now()) {
  if (!c || c.paused !== false || c.providerBillingVerified !== true || c.reconciled !== true || c.restrictedFundingVerified !== true) throw Error('Verified billing, reconciliation, restricted funding and unpaused execution required');
  if (!Number.isFinite(c.verifiedAt) || c.verifiedAt > now || now - c.verifiedAt > 86400000) throw Error('Funding verification expired');
  if(new Date(c.verifiedAt).toISOString().slice(0,7)!==new Date(now).toISOString().slice(0,7))throw Error('Reconcile funds at calendar-month rollover before new reservations');
  if (![c.restrictedBalanceCents,c.liabilitiesCents,c.compute30DayCents].every(x=>Number.isSafeInteger(x)&&x>=0)) throw Error('Verified cash and 30-day compute reserve required');
}
function allowance(c, spentCents, amountCents) {
  requireControls(c);
  if (!Number.isSafeInteger(spentCents) || spentCents < 0 || !Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100) throw Error('Invalid reservation');
  // Conservatively subtract all current-month commitments, even those already
  // reflected in the verified balance. This cannot create extra allowance.
  const cap = Math.min(MONTHLY_CAP_CENTS,c.restrictedBalanceCents-c.liabilitiesCents-c.compute30DayCents);
  if (spentCents+amountCents > cap) throw Error('Monthly cap or protected cash reserve would be exceeded');
}
async function init(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS barbarossa_execution_receipts (
    operation_key text PRIMARY KEY, fingerprint text NOT NULL, month text NOT NULL,
    reserved_cents integer NOT NULL CHECK(reserved_cents>0), status text NOT NULL,
    result jsonb, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz)`);
}
async function reserve(pool, key, payload, cents, controls) {
  if (!/^[a-zA-Z0-9:_-]{1,180}$/.test(key)) throw Error('Invalid operation key');
  requireControls(controls);
  const client=await pool.connect(), hash=fingerprint(payload), month=new Date().toISOString().slice(0,7);
  try {
    await client.query('BEGIN');
    // Serialize all new reservations, including competing first insertions.
    await client.query("SELECT pg_advisory_xact_lock(724611)");
    const existing=await client.query('SELECT * FROM barbarossa_execution_receipts WHERE operation_key=$1',[key]);
    if(existing.rows.length){const r=existing.rows[0];if(r.fingerprint!==hash)throw Error('Operation key payload changed');if(r.status!=='succeeded')throw Error('Operation outcome requires reconciliation; automatic retry blocked');await client.query('COMMIT');return {cached:true,result:r.result};}
    const paused=await client.query('SELECT data FROM barbarossa_state WHERE id=1 FOR UPDATE');
    if(paused.rows[0]?.data.paused!==false)throw Error('Global Pause is enabled');
    await client.query('INSERT INTO barbarossa_monthly_budget(month,spent_cents) VALUES($1,0) ON CONFLICT(month) DO NOTHING',[month]);
    const totals=await client.query('SELECT spent_cents FROM barbarossa_monthly_budget WHERE month=$1 FOR UPDATE',[month]);
    allowance(controls,Number(totals.rows[0].spent_cents),cents);
    await client.query('UPDATE barbarossa_monthly_budget SET spent_cents=spent_cents+$2 WHERE month=$1',[month,cents]);
    await client.query('INSERT INTO barbarossa_expenses(id,month,description,amount_cents,recorded_at) VALUES($1,$2,$3,$4,now())',[crypto.randomUUID(),month,'Execution reservation: '+key,cents]);
    await client.query("INSERT INTO barbarossa_execution_receipts(operation_key,fingerprint,month,reserved_cents,status) VALUES($1,$2,$3,$4,'in-flight')",[key,hash,month,cents]);
    await client.query('COMMIT');return {cached:false};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
async function execute(pool,key,payload,cents,controls,fn) {
  const r=await reserve(pool,key,payload,cents,controls);if(r.cached)return r.result;
  try {
    const result=await fn();
    await pool.query("UPDATE barbarossa_execution_receipts SET status='succeeded',result=$2::jsonb,completed_at=now() WHERE operation_key=$1 AND status='in-flight'",[key,JSON.stringify(result)]);
    return result;
  }catch(e){
    // Timeouts and crashes may have incurred a charge or external write. Keep
    // the entire reservation and never replay the side effect automatically.
    await pool.query("UPDATE barbarossa_execution_receipts SET status='uncertain',completed_at=now() WHERE operation_key=$1 AND status='in-flight'",[key]);
    throw e;
  }
}
module.exports={init,execute,reserve,allowance,requireControls,fingerprint};

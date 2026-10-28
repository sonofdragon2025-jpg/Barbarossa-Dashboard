'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),ledger=require('./execution-ledger');
const controls=()=>({paused:false,providerBillingVerified:true,reconciled:true,restrictedFundingVerified:true,verifiedAt:Date.now(),restrictedBalanceCents:20000,liabilitiesCents:1000,compute30DayCents:3000});
function journal(){
 let receipt=null,spent=0;
 const query=async(sql,args=[])=>{
  if(sql.startsWith('SELECT * FROM barbarossa_execution_receipts'))return {rows:receipt?[{...receipt}]:[]};
  if(sql.startsWith('SELECT data FROM barbarossa_state'))return {rows:[{data:{paused:false}}]};
  if(sql.startsWith('SELECT spent_cents'))return {rows:[{spent_cents:spent}]};
  if(sql.startsWith('UPDATE barbarossa_monthly_budget')){spent+=args[1];return {rowCount:1};}
  if(sql.startsWith('INSERT INTO barbarossa_execution_receipts')){receipt={fingerprint:args[1],status:'in-flight'};return {rowCount:1};}
  if(sql.includes("SET status='succeeded'")){receipt.status='succeeded';receipt.result=JSON.parse(args[1]);return {rowCount:1};}
  if(sql.includes("SET status='uncertain'")){receipt.status='uncertain';return {rowCount:1};}
  return {rows:[],rowCount:1};
 };
 return {pool:{query,connect:async()=>({query,release(){}})},inspect:()=>({receipt,spent})};
}
test('a completed paid operation is replayed from its durable result, not repeated',async()=>{
 const {pool,inspect}=journal();let calls=0;
 const run=()=>ledger.execute(pool,'same-job',{role:'research'},10,controls(),async()=>({answer:++calls}));
 assert.deepEqual(await run(),{answer:1});assert.deepEqual(await run(),{answer:1});assert.equal(calls,1);assert.equal(inspect().spent,10);
 await assert.rejects(ledger.execute(pool,'same-job',{role:'changed'},10,controls(),async()=>{calls++;}),/payload changed/);assert.equal(calls,1);
});
test('an uncertain external outcome retains its full reserve and prohibits automatic replay',async()=>{
 const {pool,inspect}=journal();let calls=0;
 const run=()=>ledger.execute(pool,'timed-out',{role:'build'},10,controls(),async()=>{calls++;throw Error('Response timed out after dispatch');});
 await assert.rejects(run(),/timed out/);assert.equal(inspect().receipt.status,'uncertain');assert.equal(inspect().spent,10);
 await assert.rejects(run(),/reconciliation/);assert.equal(calls,1);assert.equal(inspect().spent,10);
});
test('monthly reset cannot reuse a pre-reset cash snapshot',()=>{
 const now=Date.parse('2026-11-01T00:01:00Z');
 assert.throws(()=>ledger.requireControls({...controls(),verifiedAt:Date.parse('2026-10-31T23:55:00Z')},now),/rollover/);
});

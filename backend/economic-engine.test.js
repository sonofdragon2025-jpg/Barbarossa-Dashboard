'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createEngine,recordPaperYield,auditPivot,report}=require('./economic-engine');
const start='2026-10-28T08:00:00.000Z',end='2026-10-30T12:00:00.000Z';
const row=(id,pillar,grossCents,costCents,at,verified=true)=>({id,pillar,grossCents,costCents,at,verified,source:'test-fixture'});
test('simulation reproduces 238.50 but never claims real wallet proceeds',()=>{
 const s=createEngine({initialCapitalCents:100000,startedAt:start});
 const data=[
 row('momentum-1','market_momentum',2500,500,'2026-10-29T09:00:00Z'),
 row('asset-prod-1','asset_production',12000,1500,'2026-10-29T09:00:00Z'),
 row('network-arb-1','network_arbitrage',150,50,'2026-10-29T09:00:00Z'),
 row('momentum-2','market_momentum',3000,400,'2026-10-30T09:00:00Z'),
 row('asset-prod-2','asset_production',9500,1000,'2026-10-30T09:00:00Z'),
 row('network-arb-2','network_arbitrage',200,50,'2026-10-30T09:00:00Z')];
 data.forEach(x=>recordPaperYield(s,x));
 const before=report(s);assert.equal(before.verified.netCents,23850);
 assert.equal(before.proposedVaultCents,70000);assert.equal(before.actualWalletBalances,null);
 assert.equal(before.controls.globalPause,true);assert.equal(before.controls.externalExecutionEnabled,false);
 const result=auditPivot(s,{now:end});
 assert.equal(s.pillars.network_arbitrage.active,false);
 assert.equal(s.pillars.market_momentum.active,true);
 assert.equal(s.pillars.asset_production.active,true);
 assert.equal(result.researchPriority,'asset_production');
 assert.equal(result.financialReallocation,false);
 assert.throws(()=>recordPaperYield(s,row('network-arb-3','network_arbitrage',500,0,end)),/frozen/);
});
test('two events on same day cannot masquerade as 48h history',()=>{
 const s=createEngine({startedAt:start});
 recordPaperYield(s,row('network-arb-1','network_arbitrage',0,200,'2026-10-29T10:00:00Z'));
 recordPaperYield(s,row('network-arb-2','network_arbitrage',0,200,'2026-10-29T11:00:00Z'));
 const a=auditPivot(s,{now:end});
 assert.equal(s.pillars.network_arbitrage.active,true);
 assert.equal(a.actions.find(x=>x.pillar==='network_arbitrage').action,'insufficient_evidence');
});
test('unverified revenue cannot trigger a freeze or count as realized profit',()=>{
 const s=createEngine({startedAt:start});
 recordPaperYield(s,row('network-arb-1','network_arbitrage',0,500,'2026-10-29T10:00:00Z',false));
 recordPaperYield(s,row('network-arb-2','network_arbitrage',0,500,'2026-10-30T10:00:00Z',false));
 assert.equal(report(s).verified.netCents,0);
 assert.equal(report(s).unverified.netCents,-1000);
 auditPivot(s,{now:end});assert.equal(s.pillars.network_arbitrage.active,true);
});
test('rejects duplicate IDs, invalid amounts, unknown pillars, and future timestamps',()=>{
 const s=createEngine({startedAt:start});
 recordPaperYield(s,row('momentum-1','market_momentum',100,20,'2026-10-29T10:00:00Z'));
 assert.throws(()=>recordPaperYield(s,row('momentum-1','market_momentum',100,20,'2026-10-29T10:00:00Z')), /Duplicate/);
 assert.throws(()=>recordPaperYield(s,row('momentum-2','market_momentum',-1,0,'2026-10-29T10:00:00Z')), /nonnegative/);
 assert.throws(()=>recordPaperYield(s,row('momentum-3','made_up',100,0,'2026-10-29T10:00:00Z')), /Unknown/);
 assert.throws(()=>recordPaperYield(s,row('momentum-4','market_momentum',100,0,'2099-01-01T00:00:00Z')), /Future/);
});
test('when all pillars freeze, no trading fallback is activated',()=>{
 const s=createEngine({startedAt:start});
 for(const p of ['market_momentum','asset_production','network_arbitrage']){
  recordPaperYield(s,row(p+'-1',p,0,100,'2026-10-29T09:00:00Z'));
  recordPaperYield(s,row(p+'-2',p,0,100,'2026-10-30T09:00:00Z'));
 }
 const a=auditPivot(s,{now:end});
 assert.equal(a.researchPriority,null);
 assert.equal(a.externalActions,false);
 assert.equal(Object.values(s.pillars).filter(p=>p.active).length,0);
});

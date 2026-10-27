'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {candidateBudget,profitSharingEligible,policy}=require('./budget-policy');
const row=(netProfitCents,recordCount=1)=>({netProfitCents,recordCount});
test('startup until net profit exceeds $500',()=>{
 assert.deepEqual(candidateBudget([]),{tier:'startup',capCents:10000});
 assert.equal(candidateBudget([row(49999)]).capCents,10000);
 assert.equal(candidateBudget([row(50000)]).capCents,10000);
 assert.equal(candidateBudget([row(50001)]).capCents,12500);
});
test('uses profit rather than gross sales',()=>{
 assert.equal(candidateBudget([{...row(40000),qualifyingSalesCents:100000}]).capCents,10000);
});
test('does not add startup budget or revert to 10 percent',()=>{
 assert.equal(candidateBudget([row(100000)]).capCents,25000);
 assert.equal(candidateBudget([row(1200000)]).capCents,300000);
});
test('historical eligibility persists but allowance falls with profit',()=>{
 assert.equal(candidateBudget([row(30000),row(50001)]).capCents,7500);
 assert.equal(candidateBudget([row(0),row(50001)]).capCents,0);
 assert.equal(candidateBudget([row(-100),row(50001)]).capCents,0);
});
test('missing prior month after qualification fails closed',()=>{
 assert.equal(candidateBudget([row(0,0),row(50001)]).capCents,0);
 assert.equal(candidateBudget([row(NaN),row(50001)]).reconciliationRequired,true);
});
test('rounds down to whole cents',()=>{
 assert.equal(candidateBudget([row(50003)]).capCents,12500);
});
test('authorization never enables execution or personal access',()=>{
 assert.equal(policy.autonomousReinvestmentAuthorized,true);
 for(const key of ['automaticSpendingEnabled','automaticTierChangesEnabled','personalAccountAccessPermitted','existingPayPalSpendingPermitted']) assert.equal(policy[key],false);
 assert.equal(policy.separateRestrictedSpendingAccountRequired,true);
});

test('profit sharing requires the latest completed month to exceed $500',()=>{
 assert.equal(profitSharingEligible([]),false);
 assert.equal(profitSharingEligible([row(50000)]),false);
 assert.equal(profitSharingEligible([row(50001)]),true);
 assert.equal(profitSharingEligible([row(40000),row(60000)]),false);
 assert.equal(profitSharingEligible([row(60000,0)]),false);
});

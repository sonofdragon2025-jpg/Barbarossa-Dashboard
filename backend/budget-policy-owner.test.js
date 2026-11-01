'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {candidateBudget,policy}=require('./budget-policy');
test('startup cap remains $100 without qualifying completed profit',()=>{
 assert.deepEqual(candidateBudget([{recordCount:1,netProfitCents:50000}]),{tier:'startup',capCents:10000});
});
test('profit tier is only a candidate after monthly profit strictly exceeds $500',()=>{
 assert.deepEqual(candidateBudget([{recordCount:1,netProfitCents:120000}]),{tier:'profit-reinvestment',capCents:30000});
 assert.equal(policy.automaticTierChangesEnabled,false);
 assert.equal(policy.automaticSpendingEnabled,false);
 assert.equal(policy.reinvestmentPercent,25);
 assert.equal(policy.triggerMonthlyNetProfitCents,50000);
});

const {verifiedMonthlyCap,allowance}=require('./execution-ledger');
test('unverified growth tier never increases startup spending',()=>{
 assert.equal(verifiedMonthlyCap({profitTierVerified:false}),10000);
});
test('verified growth tier requires last completed month reconciliation',()=>{
 const now=new Date(),previous=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1)).toISOString().slice(0,7);
 assert.equal(verifiedMonthlyCap({profitTierVerified:true,verifiedProfitMonth:previous,verifiedProfitHistory:[{recordCount:1,netProfitCents:120000}]}),30000);
 assert.throws(()=>verifiedMonthlyCap({profitTierVerified:true,verifiedProfitMonth:'2000-01',verifiedProfitHistory:[{recordCount:1,netProfitCents:120000}]}));
});
test('allowance rejects spending above verified reserve even when profit permits more',()=>{
 const now=Date.now(),previous=new Date(Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth()-1,1)).toISOString().slice(0,7);
 const c={paused:false,providerBillingVerified:true,reconciled:true,restrictedFundingVerified:true,verifiedAt:now,restrictedBalanceCents:1000,liabilitiesCents:0,compute30DayCents:0,profitTierVerified:true,verifiedProfitMonth:previous,verifiedProfitHistory:[{recordCount:1,netProfitCents:120000}]};
 assert.throws(()=>allowance(c,950,100),/cap|reserve/i);
});

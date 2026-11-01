'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {candidateBudget,policy}=require('./budget-policy');
test('startup cap remains $100 without qualifying completed profit',()=>{
 assert.deepEqual(candidateBudget([{recordCount:1,netProfitCents:50000}]),{tier:'startup',capCents:10000});
});
test('profit tier is only a candidate after monthly profit strictly exceeds $500',()=>{
 assert.deepEqual(candidateBudget([{recordCount:1,netProfitCents:120000}]),{tier:'profit-reinvestment',capCents:120000});
 assert.equal(policy.automaticTierChangesEnabled,false);
 assert.equal(policy.automaticSpendingEnabled,false);
 assert.equal(policy.reinvestmentPercent,25);
 assert.equal(policy.triggerMonthlyNetProfitCents,50000);
});

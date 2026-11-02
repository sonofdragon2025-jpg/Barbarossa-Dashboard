'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate}=require('./soft-launch-metrics');
test('zero sales means loss and no reinvestment',()=>{const x=evaluate({operatingCostsCents:6400,visits:100});assert.equal(x.netOperatingProfitCents,-6400);assert.equal(x.reinvestmentEligible,false);});
test('three toolkit sales cover lean operating costs',()=>{const sales=[1,2,3].map(id=>({id:String(id),amountCents:2499}));const x=evaluate({sales,operatingCostsCents:6400,visits:150});assert.equal(x.grossCents,7497);assert.equal(x.conversionRate,.02);assert.equal(x.reinvestmentEligible,true);});
test('unknown visits prohibit automatic reinvestment eligibility',()=>{const x=evaluate({sales:[{id:'a',amountCents:2499}]});assert.equal(x.reinvestmentEligible,false);});
test('refunds can eliminate profitability',()=>{const x=evaluate({sales:[{id:'a',amountCents:2499}],refunds:[{saleId:'a',amountCents:2499}]});assert.ok(x.netOperatingProfitCents<0);});
test('duplicate sale and ungrounded refund are rejected',()=>{assert.throws(()=>evaluate({sales:[{id:'a',amountCents:100},{id:'a',amountCents:100}]}),/Duplicate/);assert.throws(()=>evaluate({refunds:[{saleId:'missing',amountCents:10}]}),/without recorded/);});

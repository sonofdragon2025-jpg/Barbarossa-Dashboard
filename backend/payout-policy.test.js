'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {allocateVerifiedProfit,payoutEligibility}=require('./payout-policy');
test('allocates $100 exactly',()=>assert.deepEqual(allocateVerifiedProfit(10000),{taxReserve:4000,necessaryServices:1500,profitInvestments:1500,ownerDistribution:3000}));
test('preserves every cent for odd profits',()=>assert.equal(Object.values(allocateVerifiedProfit(101)).reduce((a,b)=>a+b,0),101));
test('rejects negative or fractional profits',()=>{assert.throws(()=>allocateVerifiedProfit(-1));assert.throws(()=>allocateVerifiedProfit(1.5));});
test('fails closed without verified owner and route',()=>assert.equal(payoutEligibility({paused:false}).eligible,false));
test('global pause blocks even approved payout',()=>assert.equal(payoutEligibility({ownerAuthorized:true,verifiedProfit:true,verifiedPayoutRoute:true}).eligible,false));

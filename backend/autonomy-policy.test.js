'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const p=require('./autonomy-policy');
const funds={accountingVerified:true,monthlyCapCents:10000,spentCents:1000,committedCents:2000,restrictedBalanceCents:20000,protectedLiabilitiesCents:1000,projectedDailyComputeCents:100};
test('routine standing authority removes repeat approval without enabling executors',()=>{
 for(const action of ['publish-product','price-product','deploy-product','hire-agent','advertise'])assert.deepEqual(p.authority(action),{authorized:true,ownerApprovalRequired:false});
 assert.equal(p.readiness().executionEnabled,false);
 assert.equal(p.authority('borrow').authorized,false);
 assert.equal(p.authority('live-trade').authorized,false);
});
test('budget and thirty-day runway both constrain growth',()=>{
 assert.equal(p.availableGrowthCents(funds),7000);
 assert.equal(p.availableGrowthCents({...funds,restrictedBalanceCents:6500}),500);
 assert.equal(p.availableGrowthCents({...funds,restrictedBalanceCents:5000}),0);
 assert.equal(p.availableGrowthCents({...funds,accountingVerified:false}),0);
 assert.equal(p.availableGrowthCents({...funds,projectedDailyComputeCents:NaN}),0);
 assert.equal(p.availableGrowthCents({...funds,projectedDailyComputeCents:Number.MAX_SAFE_INTEGER}),0);
});
test('performance decisions require verified net results and a review window',()=>{
 const x={verified:true,ageDays:7,collectedRevenueCents:1000,refundsFeesCents:100,costCents:1000};
 assert.equal(p.evaluateExperiment(x).decision,'pause-new-spend');
 assert.equal(p.evaluateExperiment({...x,costCents:200}).decision,'prioritize-within-existing-allowance');
 assert.equal(p.evaluateExperiment({...x,ageDays:2}).decision,'observe');
 assert.equal(p.evaluateExperiment({...x,verified:false}).decision,'hold');
});

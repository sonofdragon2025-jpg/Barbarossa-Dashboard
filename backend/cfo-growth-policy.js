'use strict';
// Hiott Holding LLC — owner-approved commercial decision policy.
// Advisory only. No purchase, customer charge, price edit, publication,
// email, or external action may be performed by this module.
const policy=Object.freeze({
 business:'Hiott Holding LLC',
 primaryModel:'maintenance-digital-products',
 upsell:'maintenance-assessment-consulting',
 acquisitionChannel:'organic-linkedin',
 monthlyGrossRevenueTargetCents:100000,
 startupMonthlyOperatingCapCents:10000,
 profitScaleTriggerCents:50000,
 profitScaleShareBps:2500,
 minLtvCacRatio:3,
 minProductContributionMarginBps:4000,
 pricingStrategy:'verified-comparable-market-pricing',
 suggestedPriceIncreaseBps:1000, // fallback only when comparable evidence is unavailable; never auto-applied
 minimumVerifiedComparables:3,
 comparableReviewMaxAgeDays:90,
 bundleReviewConversionThresholdBps:200,
 minimumConversionSampleVisitors:100,
 paidAdvertisingEnabled:false,
 autonomousPriceChangesEnabled:false,
 autonomousPublishingEnabled:false,
 autonomousPaymentsEnabled:false,
 ownerApprovalRequired:true,
 avoidDeceptivePricing:true
});
function money(cents){return Math.round(cents)/100;}
function evaluate({priceCents,variableCostCents,ltvCents,cacCents,visitors,orders,highDemand}={}){
 const reasons=[];
 if(![priceCents,variableCostCents,ltvCents,cacCents,visitors,orders].every(v=>Number.isSafeInteger(v)&&v>=0))return {eligible:false,reasons:['All amounts and counts must be nonnegative integers'],action:'no-action'};
 if(priceCents===0||visitors===0||orders>visitors)return {eligible:false,reasons:['Price and traffic must be positive; orders cannot exceed visitors'],action:'no-action'};
 const margin=(priceCents-variableCostCents)/priceCents;
 const ltvCac=cacCents===0?null:ltvCents/cacCents;
 const conversion=orders/visitors;
 if(margin<0.40)reasons.push('Product contribution margin below 40%');
 if(cacCents>0&&ltvCac<3)reasons.push('LTV:CAC below 3:1');
 const suggestedPriceCents=highDemand===true&&reasons.length===0?Math.ceil(priceCents*1.10):null;
 const bundleReview=visitors>=100&&conversion<0.02;
 return {eligible:reasons.length===0,reasons,metrics:{contributionMarginPct:Math.round(margin*10000)/100,ltvCacRatio:ltvCac===null?'not measurable without CAC':Math.round(ltvCac*100)/100,conversionPct:Math.round(conversion*10000)/100},suggestedPriceCents,bundleReview,action:'recommendation-only',estimatedCostCents:0,expectedRevenueCents:null,netProfitMarginPct:null,disclaimer:'Revenue and profit require observed sales and full cost data; no automated financial or publishing actions.'};
}
function recommendComparablePrice({comparables,variableCostCents,platformFeeBps=0,fixedFeeCents=0,currentPriceCents}={}){
 const invalid={action:'no-action',priceChangeExecuted:false,reason:'Insufficient verified comparable pricing data'};
 if(!Array.isArray(comparables)||!Number.isSafeInteger(variableCostCents)||variableCostCents<0||!Number.isSafeInteger(platformFeeBps)||platformFeeBps<0||platformFeeBps>=6000||!Number.isSafeInteger(fixedFeeCents)||fixedFeeCents<0)return invalid;
 const cutoff=Date.now()-90*86400000;
 const valid=comparables.filter(c=>c&&Number.isSafeInteger(c.priceCents)&&c.priceCents>0&&typeof c.url==='string'&&/^https:\/\//.test(c.url)&&typeof c.observedAt==='string'&&Number.isFinite(Date.parse(c.observedAt))&&Date.parse(c.observedAt)>=cutoff&&Date.parse(c.observedAt)<=Date.now()&&c.comparable===true);
 const unique=[...new Map(valid.map(c=>[c.url,c])).values()];
 if(unique.length<3)return {...invalid,verifiedComparableCount:unique.length};
 const prices=unique.map(c=>c.priceCents).sort((a,b)=>a-b);
 const median=prices[Math.floor(prices.length/2)]===undefined?null:prices.length%2?prices[(prices.length-1)/2]:Math.round((prices[prices.length/2-1]+prices[prices.length/2])/2);
 const minimum=Math.ceil((variableCostCents+fixedFeeCents)/(0.60-platformFeeBps/10000));
 const recommended=Math.max(minimum,median);
 const contributionCents=recommended-variableCostCents-fixedFeeCents-Math.ceil(recommended*platformFeeBps/10000);
 return {action:'recommendation-only',priceChangeExecuted:false,verifiedComparableCount:unique.length,medianComparablePriceCents:median,recommendedPriceCents:recommended,currentPriceCents:Number.isSafeInteger(currentPriceCents)?currentPriceCents:null,estimatedUnitVariableCostCents:variableCostCents+fixedFeeCents+Math.ceil(recommended*platformFeeBps/10000),estimatedUnitContributionCents:contributionCents,estimatedContributionMarginPct:Math.round(10000*contributionCents/recommended)/100,expectedRevenueCents:null,netProfitMarginPct:null,reason:'Based on at least three recent independently linked comparable listings; verify actual content, fees and demand before owner-approved publication.'};
}
function revenueScenario(){const revenueCents=20*2500+50000,costCents=7500;return {scenarioOnly:true,toolkitUnits:20,toolkitUnitPriceCents:2500,consultingAssessments:1,consultingFeeCents:50000,estimatedOperatingCostCents:costCents,illustrativeRevenueCents:revenueCents,illustrativeOperatingProfitCents:revenueCents-costCents,illustrativeOperatingMarginPct:92.5,excludes:['owner labor','income taxes','unrecorded fees and expenses']};}
module.exports={policy,evaluate,recommendComparablePrice,revenueScenario};

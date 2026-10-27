'use strict';
const {policy: budget} = require('./budget-policy');
// Authority is separate from capability. No function here executes an action.
const ROUTINE = Object.freeze(['research','create-product','publish-product','price-product','publish-content','deploy-product','affiliate','advertise','hire-agent','manage-business-wallet','reinvest','delegate','support','paper-trade']);
const policy = Object.freeze({
  version:'2026-10-27-autonomy-1', objective:'Maximize sustainable long-term net revenue and capital growth',
  routineOwnerApprovalRequired:false, automaticPublicationAuthorized:true,
  minimumComputeRunwayDays:30, performanceReviewHours:24, experimentReviewDays:7,
  activeLiveTradingCapitalCents:0, borrowingPermitted:false, leveragePermitted:false,
  personalFundingAccessPermitted:false, tokenizationPermitted:false,
  budgetPolicyVersion:budget.version, routineActions:ROUTINE
});
function authority(action) {
  if (ROUTINE.includes(action)) return {authorized:true,ownerApprovalRequired:false};
  if (action==='live-trade') return {authorizedInPrinciple:true,authorized:false,reason:'No funded isolated trading allocation or validated strategy/risk configuration exists; live capital limit is zero'};
  return {authorized:false,reason:'Outside routine mandate; pause affected action and document for owner resolution'};
}
// Inputs must come from reconciled server accounting, never model outputs.
// This computes a ceiling, not a reservation or permission to spend.
function availableGrowthCents(input) {
  const names=['monthlyCapCents','spentCents','committedCents','restrictedBalanceCents','protectedLiabilitiesCents','projectedDailyComputeCents'];
  if (!input || input.accountingVerified!==true || !names.every(k=>Number.isSafeInteger(input[k])&&input[k]>=0)) return 0;
  const reserve=input.projectedDailyComputeCents*policy.minimumComputeRunwayDays;
  if (!Number.isSafeInteger(reserve)) return 0;
  return Math.max(0,Math.min(input.monthlyCapCents-input.spentCents-input.committedCents,input.restrictedBalanceCents-input.protectedLiabilitiesCents-input.committedCents-reserve));
}
function evaluateExperiment(input) {
  if (!input || input.verified!==true || !Number.isSafeInteger(input.ageDays) || input.ageDays<0 || !['collectedRevenueCents','refundsFeesCents','costCents'].every(k=>Number.isSafeInteger(input[k])&&input[k]>=0)) return {decision:'hold',reason:'Verified measurements required'};
  const netProfitCents=input.collectedRevenueCents-input.refundsFeesCents-input.costCents;
  if (!Number.isSafeInteger(netProfitCents)) return {decision:'hold',reason:'Invalid totals'};
  if (input.ageDays<policy.experimentReviewDays) return {decision:'observe',netProfitCents};
  return {decision:netProfitCents>0?'prioritize-within-existing-allowance':'pause-new-spend',netProfitCents};
}
function readiness() {
  return {policy,clipWorkflow:require('./clip-policy.json'),executionEnabled:false,reason:'Standing authority recorded; model workers, independent quality checks, publishing adapter and verified financial controls remain unconfigured'};
}
module.exports={policy,authority,availableGrowthCents,evaluateExperiment,readiness};

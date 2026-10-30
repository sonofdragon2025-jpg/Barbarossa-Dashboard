'use strict';
// Owner-approved conversational AI test allowance. This is an internal
// ceiling, not a provider-side hard billing limit or permission to spend.
const TEST_ALLOWANCE_CENTS=500;
const PREPAID_BALANCE_REPORTED_CENTS=1000;
const MAX_REQUESTS_PER_DAY=20;
const MAX_INPUT_CHARS=2000;
const MAX_OUTPUT_TOKENS=300;
const MAX_CONCURRENT_REQUESTS=1;
function readiness(){
 return {
  mode:'configured-not-active',
  testAllowanceCents:TEST_ALLOWANCE_CENTS,
  prepaidBalanceReportedCents:PREPAID_BALANCE_REPORTED_CENTS,
  prepaidBalanceIndependentlyVerified:false,
  autoRechargeReportedDisabled:true,
  providerHardLimitVerified:false,
  ledgerEnforcementVerified:false,
  maxRequestsPerDay:MAX_REQUESTS_PER_DAY,
  maxInputChars:MAX_INPUT_CHARS,
  maxOutputTokens:MAX_OUTPUT_TOKENS,
  maxConcurrentRequests:MAX_CONCURRENT_REQUESTS,
  paidCallsEnabled:false,
  publishingEnabled:false,
  ownerApprovalRequiredForAllowanceIncrease:true,
  warning:'Configuration only. Do not enable paid calls until atomic spend reservation, reconciliation, and fail-closed enforcement are implemented and tested.'
 };
}
module.exports={readiness,TEST_ALLOWANCE_CENTS,MAX_REQUESTS_PER_DAY,MAX_INPUT_CHARS,MAX_OUTPUT_TOKENS,MAX_CONCURRENT_REQUESTS};

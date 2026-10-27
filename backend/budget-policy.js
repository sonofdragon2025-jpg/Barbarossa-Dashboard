'use strict';
const STARTUP_CAP_CENTS = 10000;
const PROFIT_TRIGGER_CENTS = 50000;
// Candidate calculations only. Reconciled accounts and a restricted funding source
// are prerequisites for changing the active enforcement cap or executing payments.
function candidateBudget(history) {
  const eligible = history.some(row => row.recordCount > 0 && Number.isSafeInteger(row.netProfitCents) && row.netProfitCents > PROFIT_TRIGGER_CENTS);
  if (!eligible) return {tier: 'startup', capCents: STARTUP_CAP_CENTS};
  const latest = history[0];
  if (!latest || !latest.recordCount || !Number.isSafeInteger(latest.netProfitCents)) {
    return {tier: 'profit-reinvestment', capCents: 0, reconciliationRequired: true};
  }
  return {tier: 'profit-reinvestment', capCents: Math.floor(Math.max(0, latest.netProfitCents) / 4)};
}
function profitSharingEligible(history) {
  const latest = history[0];
  return Boolean(latest && latest.recordCount > 0 && Number.isSafeInteger(latest.netProfitCents) && latest.netProfitCents > PROFIT_TRIGGER_CENTS);
}
const policy = Object.freeze({
  version: '2026-10-27', startupCapCents: STARTUP_CAP_CENTS,
  triggerMonthlyNetProfitCents: PROFIT_TRIGGER_CENTS, triggerComparison: 'strictly-greater-than',
  profitSharingRequiresPriorMonthAboveTrigger: true,
  qualifyingCompletedMonthsRequired: 1, reinvestmentPercent: 25,
  basis: 'previous-completed-month-net-profit',
  ownerAuthorized: true, autonomousReinvestmentAuthorized: true,
  personalAccountAccessPermitted: false, existingPayPalSpendingPermitted: false,
  separateRestrictedSpendingAccountRequired: true,
  automaticSpendingEnabled: false, automaticTierChangesEnabled: false
});
module.exports = {candidateBudget, profitSharingEligible, policy};

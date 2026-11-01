'use strict';
// Simulation only: never connects to PayPal, banking or blockchain.
// All generated intents are internal previews, NOT payable invoices.
const {allocateVerifiedProfit}=require('./payout-policy');
function previewPayout({netProfitCents,verified=false,ownerAuthorized=false,paused=true}={}){
 if(verified!==true)throw Error('VERIFIED_PROFIT_REQUIRED');
 const allocation=allocateVerifiedProfit(netProfitCents);
 return Object.freeze({mode:'SANDBOX_ONLY',transferEnabled:false,paused,
  payoutRoute:'UNCONFIGURED',ownerAuthorized,
  allocation,
  paypalTaxReserveCents:allocation.taxReserve,
  paypalOwnerDistributionCents:allocation.ownerDistribution,
  proposedPaypalTotalCents:allocation.taxReserve+allocation.ownerDistribution,
  status:'NOT_SUBMITTED',reason:'PAYPAL_ROUTE_NOT_CONNECTED'});
}
module.exports={previewPayout};

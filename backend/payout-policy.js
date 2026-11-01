'use strict';
// Accounting-only policy. No banking, PayPal, wallet, or transfer credentials.
const ALLOCATION_BPS=Object.freeze({taxReserve:4000,necessaryServices:1500,profitInvestments:1500,ownerDistribution:3000});
function allocateVerifiedProfit(netProfitCents){
 if(!Number.isSafeInteger(netProfitCents)||netProfitCents<0)throw Error('INVALID_VERIFIED_PROFIT');
 const entries=Object.entries(ALLOCATION_BPS);
 const result={};let allocated=0;
 for(const [key,bps] of entries.slice(0,-1)){result[key]=Math.floor(netProfitCents*bps/10000);allocated+=result[key];}
 result.ownerDistribution=netProfitCents-allocated;
 return Object.freeze(result);
}
function payoutEligibility({ownerAuthorized=false,verifiedProfit=false,verifiedPayoutRoute=false,paused=true}={}){
 return Object.freeze({eligible:ownerAuthorized===true&&verifiedProfit===true&&verifiedPayoutRoute===true&&paused===false,
 reason:paused?'GLOBAL_PAUSE':!ownerAuthorized?'OWNER_AUTHORIZATION_REQUIRED':!verifiedProfit?'PROFIT_VERIFICATION_REQUIRED':!verifiedPayoutRoute?'PAYOUT_ROUTE_UNVERIFIED':'READY_FOR_SEPARATE_PAYOUT_SERVICE'});
}
module.exports={ALLOCATION_BPS,allocateVerifiedProfit,payoutEligibility};

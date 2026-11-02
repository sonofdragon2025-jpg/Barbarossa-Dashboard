'use strict';
// Pure, auditable accounting. No payments, publishing, or external requests.
const CENTS=100;
function integer(value,name){if(!Number.isSafeInteger(value)||value<0)throw Error(name+' must be nonnegative integer cents');return value;}
function evaluate({sales=[],refunds=[],operatingCostsCents=0,processorFeeBps=290,payhipFeeBps=500,processorFixedCents=30,visits=null}={}){
 integer(operatingCostsCents,'operating costs');
 for(const [name,v] of [['processorFeeBps',processorFeeBps],['payhipFeeBps',payhipFeeBps],['processorFixedCents',processorFixedCents]])integer(v,name);
 if(processorFeeBps+payhipFeeBps>10000)throw Error('Invalid fee rates');
 if(visits!==null)integer(visits,'visits');
 const seen=new Set();let gross=0,fees=0,refunded=0;
 for(const sale of sales){
  if(!sale||typeof sale.id!=='string'||!sale.id||seen.has(sale.id))throw Error('Duplicate or invalid sale');
  seen.add(sale.id);const amount=integer(sale.amountCents,'sale amount');gross+=amount;
  fees+=Math.round(amount*processorFeeBps/10000)+Math.round(amount*payhipFeeBps/10000)+processorFixedCents;
 }
 for(const refund of refunds){
  if(!refund||!seen.has(refund.saleId))throw Error('Refund without recorded sale');
  refunded+=integer(refund.amountCents,'refund amount');
 }
 if(refunded>gross)throw Error('Refunds exceed gross sales');
 const net=gross-refunded-fees-operatingCostsCents;
 return {grossCents:gross,refundCents:refunded,estimatedFeesCents:fees,operatingCostsCents,netOperatingProfitCents:net,salesCount:sales.length,visits,conversionRate:visits===null||visits===0?null:sales.length/visits,
   reinvestmentEligible:net>0&&visits!==null&&sales.length>0,
   notes:['Fees are estimates; reconcile provider invoices, chargebacks, taxes and refund-fee policy before spending.','Positive operating profit is necessary but not sufficient for reinvestment; owner approval and budget caps still apply.']};
}
module.exports={evaluate};

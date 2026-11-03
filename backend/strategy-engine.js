'use strict';
// Advisory strategy ranking only: no payment, deployment, or publication permissions.
const MIN_EXPOSURE = 100;
function evaluate(x) {
 if (!x || typeof x.id !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(x.id)) throw Error('Invalid strategy ID');
 const keys=['revenueCents','directCostCents','impressions','sales','daysObserved'];
 if (!keys.every(k=>Number.isSafeInteger(x[k])&&x[k]>=0)) throw Error('Verified nonnegative metrics required');
 if (x.sales>x.impressions) throw Error('Sales cannot exceed impressions');
 const netProfitCents=x.revenueCents-x.directCostCents;
 const conversion=x.impressions?x.sales/x.impressions:0;
 const insufficient=x.impressions<MIN_EXPOSURE || x.daysObserved<14;
 // Do not mistake tiny samples for a proven winning strategy.
 const score=insufficient?null:Math.round((netProfitCents/Math.max(1,x.daysObserved))*100)/100;
 return {id:x.id,netProfitCents,conversionRate:conversion,score,decision:insufficient?'collect-evidence':netProfitCents>0?'optimize-or-scale':'revise-or-replace'};
}
function compare(strategies){
 if(!Array.isArray(strategies))throw Error('Strategies array required');
 const ranked=strategies.map(evaluate);
 const ids=new Set(ranked.map(x=>x.id));if(ids.size!==ranked.length)throw Error('Duplicate strategy ID');
 return ranked.sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity)||a.id.localeCompare(b.id));
}
module.exports={evaluate,compare};

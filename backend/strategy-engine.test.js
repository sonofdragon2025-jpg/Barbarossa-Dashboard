'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,compare}=require('./strategy-engine');
test('small samples are not declared winners or losers',()=>{
 assert.equal(evaluate({id:'a',revenueCents:0,directCostCents:0,impressions:10,sales:0,daysObserved:2}).decision,'collect-evidence');
});
test('ranks by observed daily net profit after minimum evidence',()=>{
 const base={impressions:500,sales:5,daysObserved:20};
 const ranked=compare([{...base,id:'loser',revenueCents:1000,directCostCents:2000},{...base,id:'winner',revenueCents:5000,directCostCents:1000}]);
 assert.deepEqual(ranked.map(x=>x.id),['winner','loser']);
 assert.equal(ranked[1].decision,'revise-or-replace');
});
test('rejects invalid or duplicate metrics',()=>{
 const x={id:'a',revenueCents:0,directCostCents:0,impressions:100,sales:101,daysObserved:15};
 assert.throws(()=>evaluate(x));
 assert.throws(()=>compare([{...x,sales:1},{...x,sales:1}]));
});

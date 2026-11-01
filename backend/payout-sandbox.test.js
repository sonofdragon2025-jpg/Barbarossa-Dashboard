'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {previewPayout}=require('./payout-sandbox');
test('requires verified profit',()=>assert.throws(()=>previewPayout({netProfitCents:10000}),/VERIFIED_PROFIT_REQUIRED/));
test('previews $100 without transferring',()=>{const x=previewPayout({netProfitCents:10000,verified:true});assert.equal(x.proposedPaypalTotalCents,7000);assert.equal(x.transferEnabled,false);assert.equal(x.status,'NOT_SUBMITTED');});
test('owner authorization does not enable transfer',()=>assert.equal(previewPayout({netProfitCents:10000,verified:true,ownerAuthorized:true,paused:false}).transferEnabled,false));

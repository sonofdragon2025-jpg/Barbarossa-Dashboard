'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {testLocalCdp}=require('./payhip-local-browser');
test('dedicated Playwright Chromium launches without authenticating or writing',async()=>{
 const result=await testLocalCdp();
 assert.deepEqual(result,{chromiumLaunched:true,playwrightAttached:true,payhipAuthenticated:false,filesUploaded:0});
});

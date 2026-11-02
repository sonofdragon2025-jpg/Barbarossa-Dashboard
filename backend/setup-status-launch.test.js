'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {report,authorized,preflight}=require('./setup-status');
test('uploader implementation is not mistaken for verified publishing',()=>{
 const r=report({TINYFISH_API_KEY:'present',PAYHIP_PROFILE_ID:'prof_abcdef',OPENAI_API_KEY:'present'},{storageReady:true,databaseConfigured:true,workerCount:2,paused:true});
 assert.equal(r.payhip.uploaderImplemented,true);
 assert.equal(r.payhip.uploadVerified,false);
 assert.equal(r.payhip.automaticPublishingOperational,false);
 assert.equal(r.controls.globalPause,true);
 assert.equal(r.controls.providerBillingVerified,false);
 assert.equal(r.controls.externalExecutionEnabled,false);
 assert.equal(r.credentialsIncluded,false);
});
test('missing credentials never imply publication readiness',()=>{
 const r=report({}, {storageReady:false,databaseConfigured:false,workerCount:0,paused:true});
 assert.equal(r.payhip.browserKeyConfigured,false);
 assert.equal(r.payhip.profileIdConfigured,false);
 assert.equal(r.payhip.automaticPublishingOperational,false);
});
test('expired setup tokens are rejected',()=>{
 assert.equal(authorized({BARBAROSSA_SETUP_EXPIRES_AT:'2020-01-01T00:00:00Z',BARBAROSSA_SETUP_TOKEN_SHA256:'0'.repeat(64)},'Bearer '+'a'.repeat(64),Date.now()),false);
});
test('preflight without credentials makes no external requests',async()=>{
 let calls=0;
 const r=await preflight({},{fetchImpl:async()=>{calls++;throw Error('unexpected network');}});
 assert.equal(calls,0);
 assert.equal(r.readOnly,true);
 assert.equal(r.inferenceExecuted,false);
 assert.equal(r.browserSessionCreated,false);
});

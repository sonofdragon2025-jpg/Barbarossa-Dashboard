'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), crypto=require('node:crypto');
const setup=require('./setup-status');
const token='a'.repeat(64), env={BARBAROSSA_SETUP_TOKEN_SHA256:crypto.createHash('sha256').update(token).digest('hex'),BARBAROSSA_SETUP_EXPIRES_AT:'2030-01-01T00:00:00Z'};
test('setup access requires an unexpired, explicitly configured scoped credential',()=>{
 assert.equal(setup.authorized(env,'Bearer '+token,1000),true);
 assert.equal(setup.authorized({},'Bearer '+token,1000),false);
 assert.equal(setup.authorized(env,'Bearer '+'b'.repeat(64),1000),false);
 assert.equal(setup.authorized(env,'Bearer '+token,Date.parse('2031-01-01')),false);
 assert.equal(setup.authorized({...env,BARBAROSSA_SETUP_EXPIRES_AT:'bad'},'Bearer '+token,1000),false);
});
test('provider preflight is read-only and never exposes credentials or response bodies',async()=>{
 const calls=[];const env={OPENAI_API_KEY:'private-model-key',TINYFISH_API_KEY:'private-browser-key',PAYHIP_PROFILE_ID:'prof_123abc'};
 const result=await setup.preflight(env,{fetchImpl:async(url,options)=>{calls.push({url,method:options.method});return {status:url.includes('tinyfish')?200:401,body:{cancel:async()=>{}}};}});
 assert.equal(result.payhipProfile.accessible,true);assert.equal(result.model.accessible,false);
 assert.equal(result.inferenceExecuted,false);assert.equal(result.browserSessionCreated,false);
 assert.ok(calls.every(c=>c.method==='GET'));assert.equal(JSON.stringify(result).includes('private-'),false);
});
test('setup status returns presence only and cannot grant execution',()=>{
 const report=setup.report({DATABASE_URL:'secret-database',OPENAI_API_KEY:'secret-model',PAYHIP_API_KEY:'secret-payhip'},{storageReady:true,databaseConfigured:true,workerCount:0,paused:true});
 assert.equal(report.database.initialized,true);assert.equal(report.models.openaiKeyConfigured,true);
 assert.equal(report.models.anthropicKeyConfigured,false);assert.equal(report.payhip.uploaderImplemented,false);
 assert.equal(report.controls.externalExecutionEnabled,false);assert.equal(JSON.stringify(report).includes('secret-'),false);
});

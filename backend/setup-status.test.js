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
test('setup status returns presence only and cannot grant execution',()=>{
 const report=setup.report({DATABASE_URL:'secret-database',OPENAI_API_KEY:'secret-model',PAYHIP_API_KEY:'secret-payhip'},{storageReady:true,databaseConfigured:true,workerCount:0,paused:true});
 assert.equal(report.database.initialized,true);assert.equal(report.models.openaiKeyConfigured,true);
 assert.equal(report.models.anthropicKeyConfigured,false);assert.equal(report.payhip.uploaderImplemented,false);
 assert.equal(report.controls.externalExecutionEnabled,false);assert.equal(JSON.stringify(report).includes('secret-'),false);
});

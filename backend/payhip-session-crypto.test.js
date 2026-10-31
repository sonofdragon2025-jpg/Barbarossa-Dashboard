'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {keyFromEnvironment,sealSession,openSession,sessionStorageStatus}=require('./payhip-session-crypto');
test('encrypts and authenticates browser storage without exposing cookies',()=>{
 const key=crypto.randomBytes(32),state={cookies:[{name:'session',value:'private-token',domain:'payhip.com',path:'/'}],origins:[]};
 const sealed=sealSession(state,key);
 assert.equal(sealed.includes('private-token'),false);
 assert.deepEqual(openSession(sealed,key),state);
 const modified=JSON.parse(sealed);modified.data=Buffer.from('tampered').toString('base64');
 assert.throws(()=>openSession(JSON.stringify(modified),key));
 assert.throws(()=>openSession(sealed,crypto.randomBytes(32)));
});
test('requires a valid explicit key and does not assume persistence',()=>{
 assert.throws(()=>keyFromEnvironment({}));
 assert.throws(()=>keyFromEnvironment({BARBAROSSA_SESSION_ENCRYPTION_KEY:'invalid'}));
 assert.equal(keyFromEnvironment({BARBAROSSA_SESSION_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64')}).length,32);
 assert.deepEqual(sessionStorageStatus({}),{encryptionConfigured:false,persistentStoreConfigured:false,authenticated:false});
});

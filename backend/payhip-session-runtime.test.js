'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {requireSessionConfiguration}=require('./payhip-session-runtime');
test('dedicated browser fails closed without database and key',()=>{
 assert.throws(()=>requireSessionConfiguration({}),/database URL/);
 assert.throws(()=>requireSessionConfiguration({BARBAROSSA_SESSION_DATABASE_URL:'postgresql://test'}),/encryption key/);
 const key=crypto.randomBytes(32).toString('base64');
 assert.equal(requireSessionConfiguration({BARBAROSSA_SESSION_DATABASE_URL:'postgresql://test',BARBAROSSA_SESSION_ENCRYPTION_KEY:key}).length,32);
});

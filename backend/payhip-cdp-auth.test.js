'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {connectAuthenticatedPayhip}=require('./payhip-cdp-auth');
test('rejects missing CDP websocket without network activity',async()=>{
 await assert.rejects(()=>connectAuthenticatedPayhip({}),/Secure live CDP websocket required/);
});
test('rejects insecure CDP transport without network activity',async()=>{
 await assert.rejects(()=>connectAuthenticatedPayhip({cdpUrl:'ws://localhost:9222'}),/Secure live CDP websocket required/);
});
test('rejects wrong store without network activity',async()=>{
 await assert.rejects(()=>connectAuthenticatedPayhip({cdpUrl:'wss://example.invalid',expectedStore:'https://other.example'}),/Unexpected store/);
});

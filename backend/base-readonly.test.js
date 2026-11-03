'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),m=require('./base-readonly');
test('invalid addresses rejected',()=>assert.throws(()=>m.assertAddress('0x123')));
test('signing blocked',async()=>assert.rejects(m.rpc('eth_sendRawTransaction'),/READ_ONLY/));
test('correct chain accepted',async()=>{const fetchImpl=async()=>({ok:true,json:async()=>({jsonrpc:'2.0',result:'0x14a34'})});assert.equal(await m.checkChain({fetchImpl}),84532);});
test('wrong chain rejected',async()=>{const fetchImpl=async()=>({ok:true,json:async()=>({jsonrpc:'2.0',result:'0x2105'})});await assert.rejects(m.checkChain({fetchImpl}),/CHAIN_MISMATCH/);});
test('mock balance is read-only',async()=>{const fetchImpl=async(_u,r)=>({ok:true,json:async()=>({jsonrpc:'2.0',result:JSON.parse(r.body).method==='eth_chainId'?'0x14a34':'0x0'})});assert.equal((await m.checkWalletBalances('0x'+'a'.repeat(40),{fetchImpl})).ethWei,'0');});

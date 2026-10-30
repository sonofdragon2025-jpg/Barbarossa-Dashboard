'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {ensureTable,saveEncryptedSession,loadEncryptedSession}=require('./payhip-session-store');
test('stores only encrypted state and restores after simulated restart',async()=>{
 const rows=new Map();
 const pool={async query(sql,params=[]){
 if(sql.startsWith('CREATE TABLE'))return {rows:[]};
 if(sql.startsWith('INSERT')){rows.set(params[0],params[1]);return {rows:[]};}
 if(sql.startsWith('SELECT'))return {rows:rows.has(params[0])?[{encrypted_state:rows.get(params[0])}]:[]};
 throw Error('Unexpected SQL');
 }};
 const key=crypto.randomBytes(32),state={cookies:[{name:'test',value:'private-cookie'}],origins:[]};
 await ensureTable(pool);
 await saveEncryptedSession(pool,'payhip',state,key);
 assert.equal(rows.get('payhip').includes('private-cookie'),false);
 assert.deepEqual(await loadEncryptedSession(pool,'payhip',key),state);
 assert.equal(await loadEncryptedSession(pool,'missing',key),null);
 await assert.rejects(()=>loadEncryptedSession(pool,'payhip',crypto.randomBytes(32)));
});

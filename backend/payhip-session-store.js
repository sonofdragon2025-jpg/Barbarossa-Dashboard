'use strict';
const {sealSession,openSession}=require('./payhip-session-crypto');
const TABLE='barbarossa_browser_sessions';
async function ensureTable(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (session_name TEXT PRIMARY KEY, encrypted_state TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
}
async function saveEncryptedSession(pool,name,state,key){
 if(!pool||!name||!key)throw Error('Persistent database, session name and encryption key required');
 const envelope=sealSession(state,key);
 await pool.query(`INSERT INTO ${TABLE} (session_name,encrypted_state,updated_at) VALUES ($1,$2,now()) ON CONFLICT (session_name) DO UPDATE SET encrypted_state=EXCLUDED.encrypted_state,updated_at=now()`,[name,envelope]);
}
async function loadEncryptedSession(pool,name,key){
 if(!pool||!name||!key)throw Error('Persistent database, session name and encryption key required');
 const result=await pool.query(`SELECT encrypted_state FROM ${TABLE} WHERE session_name=$1`,[name]);
 if(result.rows.length!==1)return null;
 return openSession(result.rows[0].encrypted_state,key);
}
module.exports={ensureTable,saveEncryptedSession,loadEncryptedSession};

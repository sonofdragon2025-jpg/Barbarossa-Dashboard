'use strict';
const crypto=require('node:crypto');
const VERSION=1;
function keyFromEnvironment(env=process.env){
 const encoded=env.BARBAROSSA_SESSION_ENCRYPTION_KEY;
 if(!encoded)throw Error('Session encryption key not configured');
 const key=Buffer.from(encoded,'base64');
 if(key.length!==32||key.toString('base64')!==encoded)throw Error('Session encryption key must be 32 random bytes encoded as base64');
 return key;
}
function sealSession(storageState,key){
 if(!storageState||!Array.isArray(storageState.cookies)||!Array.isArray(storageState.origins))throw Error('Invalid browser storage state');
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
 const plaintext=Buffer.from(JSON.stringify(storageState),'utf8');
 const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);
 return JSON.stringify({version:VERSION,algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')});
}
function openSession(envelope,key){
 const item=JSON.parse(envelope);
 if(item.version!==VERSION||item.algorithm!=='aes-256-gcm')throw Error('Unsupported session envelope');
 const decipher=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(item.iv,'base64'));
 decipher.setAuthTag(Buffer.from(item.tag,'base64'));
 const plaintext=Buffer.concat([decipher.update(Buffer.from(item.data,'base64')),decipher.final()]);
 const state=JSON.parse(plaintext.toString('utf8'));
 if(!Array.isArray(state.cookies)||!Array.isArray(state.origins))throw Error('Invalid decrypted state');
 return state;
}
function sessionStorageStatus(env=process.env){
 return {encryptionConfigured:Boolean(env.BARBAROSSA_SESSION_ENCRYPTION_KEY),persistentStoreConfigured:Boolean(env.BARBAROSSA_SESSION_STORE_URL),authenticated:false};
}
module.exports={keyFromEnvironment,sealSession,openSession,sessionStorageStatus};

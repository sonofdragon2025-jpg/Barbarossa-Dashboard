'use strict';
const {withSessionDatabase}=require('./payhip-session-runtime');
const {saveEncryptedSession,loadEncryptedSession}=require('./payhip-session-store');
const crypto=require('node:crypto');
async function main(){
 const result=await withSessionDatabase(async(pool,key)=>{
  const name='validation-'+crypto.randomUUID();
  const state={cookies:[],origins:[],probe:crypto.randomUUID()};
  try{
   await saveEncryptedSession(pool,name,state,key);
   const recovered=await loadEncryptedSession(pool,name,key);
   if(JSON.stringify(recovered)!==JSON.stringify(state))throw Error('Encrypted session roundtrip mismatch');
   return {databaseConnected:true,tableReady:true,encryptedRoundtrip:true,authenticationTested:false};
  }finally{await pool.query('DELETE FROM barbarossa_browser_sessions WHERE session_name=$1',[name]);}
 });
 console.log(JSON.stringify(result));
}
if(require.main===module)main().catch(e=>{console.error('Session verification failed:',e.message);process.exitCode=1;});
module.exports={main};

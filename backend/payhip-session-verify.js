'use strict';
const {verifySavedPayhipSession}=require('./payhip-session-runtime');
async function main(){
 const result=await verifySavedPayhipSession();
 console.log(JSON.stringify(result));
 if(!result.authenticated)process.exitCode=2;
}
if(require.main===module)main().catch(e=>{console.error('Payhip session verification failed:',e.message);process.exitCode=1;});
module.exports={main};

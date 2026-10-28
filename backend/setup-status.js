'use strict';
const crypto=require('node:crypto');
function authorized(env, header, now=Date.now()) {
 const expiry=Date.parse(env.BARBAROSSA_SETUP_EXPIRES_AT||'');
 const hash=env.BARBAROSSA_SETUP_TOKEN_SHA256||'';
 const m=/^Bearer ([a-f0-9]{64})$/.exec(header||'');
 if(!m||!Number.isFinite(expiry)||expiry<=now||!(/^[a-f0-9]{64}$/.test(hash)))return false;
 return crypto.timingSafeEqual(crypto.createHash('sha256').update(m[1]).digest(),Buffer.from(hash,'hex'));
}
function report(env, runtime) {
 const present=k=>typeof env[k]==='string'&&env[k].trim().length>0;
 return {
  database:{configured:present('DATABASE_URL'),initialized:runtime.storageReady&&runtime.databaseConfigured},
  ownerLoginConfigured:present('BARBAROSSA_OWNER_PASSWORD'),
  models:{openaiKeyConfigured:present('OPENAI_API_KEY'),anthropicKeyConfigured:present('ANTHROPIC_API_KEY'),adapterImplemented:true},
  workers:{configuredCount:runtime.workerCount,modelWorkersRunning:false},
  payhip:{webhookKeyConfigured:present('PAYHIP_API_KEY'),browserKeyConfigured:present('TINYFISH_API_KEY'),profileIdConfigured:/^prof_[a-f0-9]+$/.test(env.PAYHIP_PROFILE_ID||''),uploaderImplemented:false,automaticPublishingOperational:false},
  controls:{globalPause:runtime.paused,providerBillingVerified:false,externalExecutionEnabled:false},
  credentialsIncluded:false
 };
}
async function preflight(env,{fetchImpl=fetch}={}) {
 const result={readOnly:true,inferenceExecuted:false,browserSessionCreated:false};
 async function status(url,headers){
  try{const r=await fetchImpl(url,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(12000)});if(r.body)await r.body.cancel().catch(()=>{});return {accessible:r.status===200,httpStatus:r.status};}
  catch{return {accessible:false,httpStatus:null,reason:'network-or-provider-unavailable'};}
 }
 if(env.TINYFISH_API_KEY&&/^prof_[a-f0-9]+$/.test(env.PAYHIP_PROFILE_ID||''))result.payhipProfile=await status('https://agent.tinyfish.ai/v1/profiles/'+env.PAYHIP_PROFILE_ID,{'X-API-Key':env.TINYFISH_API_KEY});
 else result.payhipProfile={accessible:false,reason:'runtime-key-or-profile-id-missing'};
 if(env.OPENAI_API_KEY)result.model=await status('https://api.openai.com/v1/models/'+require('./model-adapter').MODEL,{Authorization:'Bearer '+env.OPENAI_API_KEY});
 else result.model={accessible:false,reason:'runtime-key-missing'};
 return result;
}
module.exports={authorized,report,preflight};

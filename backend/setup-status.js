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
  payhip:{webhookKeyConfigured:present('PAYHIP_API_KEY'),uploaderImplemented:false,automaticPublishingOperational:false},
  controls:{globalPause:runtime.paused,providerBillingVerified:false,externalExecutionEnabled:false},
  credentialsIncluded:false
 };
}
module.exports={authorized,report};

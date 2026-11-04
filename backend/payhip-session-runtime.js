'use strict';
const {chromium}=require('playwright-core');
const {keyFromEnvironment}=require('./payhip-session-crypto');
const {ensureTable,loadEncryptedSession,saveEncryptedSession}=require('./payhip-session-store');
const {launchIsolatedBrowser}=require('./payhip-local-browser');
const SESSION_NAME='payhip-seller';
function requireSessionConfiguration(env=process.env){
 if(!env.BARBAROSSA_SESSION_DATABASE_URL)throw Error('Dedicated session database URL not configured');
 return keyFromEnvironment(env);
}
async function withSessionDatabase(fn,env=process.env){
 const {Pool}=require('pg');
 const key=requireSessionConfiguration(env);
 const pool=new Pool({connectionString:env.BARBAROSSA_SESSION_DATABASE_URL,max:2,connectionTimeoutMillis:5000,ssl:env.BARBAROSSA_SESSION_DB_SSL==='true'?{rejectUnauthorized:true}:undefined});
 try{await ensureTable(pool);return await fn(pool,key);}finally{await pool.end();}
}
async function verifySavedPayhipSession(env=process.env){
 return withSessionDatabase(async(pool,key)=>{
  const state=await loadEncryptedSession(pool,SESSION_NAME,key);
  if(!state)return {authenticated:false,reason:'no_saved_session'};
  const browser=await launchIsolatedBrowser();
  try{
   const context=await browser.newContext({storageState:state});
   const page=await context.newPage();
   await page.goto('https://payhip.com/products',{waitUntil:'domcontentloaded',timeout:30000});
   const current=new URL(page.url());
   if(current.hostname!=='payhip.com'||current.pathname!=='/products')return {authenticated:false,reason:'login_required'};
   const body=(await page.locator('body').innerText()).slice(0,30000);
   const expected=body.includes('Maintenance Shift Handoff')&&body.includes('PM Reliability Starter Toolkit');
   return {authenticated:expected,reason:expected?'existing_product_fingerprint_verified':'seller_products_not_verified',readOnly:true};
  }finally{await browser.close();}
 },env);
}
module.exports={requireSessionConfiguration,withSessionDatabase,verifySavedPayhipSession,SESSION_NAME};

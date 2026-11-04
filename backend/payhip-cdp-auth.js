'use strict';
// Isolated diagnostic only. Never creates products or transmits files.
// Supply an authenticated, short-lived CDP URL via a secure Render secret.
// TinyFish Browser API sessions are isolated; a profile ID is NOT authentication.
const {chromium}=require('playwright-core');
async function connectAuthenticatedPayhip({cdpUrl,expectedStore='https://payhip.com/HiottHoldingLLC',timeout=20000}={}){
 if(typeof cdpUrl!=='string'||!/^wss:\/\//i.test(cdpUrl))throw Error('Secure live CDP websocket required');
 if(expectedStore!=='https://payhip.com/HiottHoldingLLC')throw Error('Unexpected store');
 const browser=await chromium.connectOverCDP(cdpUrl,{timeout});
 try{
  const context=browser.contexts()[0];
  if(!context)throw Error('No browser context');
  const page=context.pages()[0]||await context.newPage();
  await page.goto('https://payhip.com/products',{waitUntil:'domcontentloaded',timeout});
  if(new URL(page.url()).hostname!=='payhip.com')throw Error('Unexpected browser destination');
  const body=await page.locator('body').innerText({timeout});
  if(/log in|sign in|create your store/i.test(body)&&!/logout/i.test(body))throw Error('Payhip seller authentication missing');
  const logout=page.getByText(/logout/i);
  if(await logout.count()===0)throw Error('Seller login not confirmed');
  const names=['Maintenance Shift Handoff','PM Reliability Starter Toolkit'];
  const found=[];
  for(const name of names)if(await page.getByText(name,{exact:true}).count()>0)found.push(name);
  if(found.length!==2)throw Error('Expected account product fingerprints missing; no write permitted');
  return {browser,page,authenticated:true,accountFingerprintVerified:true,readOnly:true};
 }catch(e){await browser.close();throw e;}
}
module.exports={connectAuthenticatedPayhip};

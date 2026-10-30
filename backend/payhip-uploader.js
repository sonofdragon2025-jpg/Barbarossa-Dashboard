'use strict';
const crypto=require('node:crypto');
const {attachReviewedFiles}=require('./payhip-file-transfer');
const STORE='https://payhip.com/HiottHoldingLLC';
const PRODUCTS='https://payhip.com/products';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function validateRelease(p){
 if(!p||p.store!==STORE||typeof p.title!=='string'||!p.title.trim()||p.title.length>160||typeof p.description!=='string'||p.description.length<40||!Number.isSafeInteger(p.priceCents)||p.priceCents<200||p.priceCents>4900)throw Error('Invalid release or storefront');
 if(!p.quality||p.quality.verdict!=='pass'||p.quality.builderId===p.quality.reviewerId||!p.quality.builderId||!p.quality.reviewerId||p.quality.rendered!==true)throw Error('Independent passing review and document rendering required');
 if(!Array.isArray(p.files)||!p.files.some(x=>x.name.endsWith('.docx'))||!p.files.some(x=>x.name.endsWith('.csv')))throw Error('DOCX and CSV required');
 for(const f of p.files)if(!/^[a-zA-Z0-9._-]{1,120}$/.test(f.name)||!Buffer.isBuffer(f.buffer)||!f.buffer.length||f.buffer.length>10000000||sha(f.buffer)!==f.sha256)throw Error('Release file integrity failed');
 const digest=sha(Buffer.from(JSON.stringify(p.files.map(f=>({name:f.name,sha256:f.sha256})))));
 if(p.quality.artifactsDigest!==digest)throw Error('Review does not cover current release files');
 return digest;
}
async function guard(page){
 const u=new URL(page.url());
 if(u.hostname!=='payhip.com'||u.protocol!=='https:')throw Error('Unexpected Payhip navigation');
 const body=await page.locator('body').innerText();
 if(/verify you are human|performing security verification|checking your browser/i.test(body))throw Error('Payhip human verification required; publication paused');
 if(/\/login(?:\?|$)/.test(page.url())||/create your (?:store|account)/i.test(body))throw Error('Payhip seller session missing or wrong account');
}
async function one(locator){if(await locator.count()!==1)throw Error('Payhip form changed or selector ambiguous; stop before publishing');return locator;}
async function verifyDownloads(page,files){
 await guard(page);
 for(const f of files){
  const link=await one(page.getByRole('link',{name:f.name,exact:true}));
  const pending=page.waitForEvent('download',{timeout:15000});await link.click();
  const download=await pending,stream=await download.createReadStream();
  if(!stream)throw Error('Seller file download stream unavailable');
  let size=0;const chunks=[];
  for await(const chunk of stream){size+=chunk.length;if(size>10000000){stream.destroy();throw Error('Seller file download too large');}chunks.push(chunk);}
  if(sha(Buffer.concat(chunks))!==f.sha256)throw Error('Payhip download does not match reviewed customer file');
 }
}
async function perform(page,p,{beforeCommit,afterCreate,verifyDownloads,uiContractVerified=false}={}){
 validateRelease(p);
 // This UI mapping is deliberately not production-activated by the model or
 // an environment switch. Inspect the real seller form and run a controlled
 // upload/download test before supplying this verified adapter capability.
 if(uiContractVerified!==true||typeof verifyDownloads!=='function'||typeof beforeCommit!=='function'||typeof afterCreate!=='function')throw Error('Payhip UI contract, durable checkpoints and downloaded-file verification must be verified before upload');
 await page.goto(PRODUCTS,{waitUntil:'domcontentloaded',timeout:30000});await guard(page);
 // An account name alone is insufficient: require this exact store link.
 const storeLink=page.locator('a').filter({hasText:/view (?:your )?store/i});
 const exact=page.locator('a[href="'+STORE+'"],a[href="'+STORE+'/"]');
 if(await exact.count()<1){
  if(await storeLink.count()!==1||new URL(await storeLink.getAttribute('href'),'https://payhip.com').href.replace(/\/$/,'')!==STORE)throw Error('Correct storefront identity not proven');
 }
 // Ambiguous prior creations must be reconciled, never duplicated.
 if(await page.getByText(p.title,{exact:true}).count())throw Error('Product title already exists; reconcile before creating another');
 await (await one(page.getByRole('button',{name:/^add new product$/i}))).click();
 await (await one(page.getByText('Digital Product',{exact:true}))).click();await guard(page);
 const upload=page.getByRole('button',{name:/^upload product file$/i});
 await attachReviewedFiles(page,await one(upload),p.files);
 await (await one(page.getByLabel(/^title$/i))).fill(p.title);
 await (await one(page.getByLabel(/^price/i))).fill((p.priceCents/100).toFixed(2));
 await (await one(page.getByLabel(/^description$/i))).fill(p.description);
 // First persist an invisible draft. Verify uploaded bytes before visibility.
 await (await one(page.getByLabel('Invisible',{exact:true}))).check();
 await beforeCommit(); // Durable checkpoint BEFORE the first product-creation click.
 await (await one(page.getByRole('button',{name:/^add product$/i}))).click();
 await page.waitForLoadState('domcontentloaded');await guard(page);
 const link=await (await one(page.locator('a[href^="https://payhip.com/b/"]'))).getAttribute('href');
 if(!/^https:\/\/payhip\.com\/b\/[a-zA-Z0-9]+$/.test(link))throw Error('Missing product identifier after creation');
 await afterCreate(link);
 if(typeof verifyDownloads!=='function')throw Error('Draft saved; downloaded-file verification adapter missing. Publication blocked');
 // Verification must download files through the seller UI and compare hashes;
 // visible filenames alone do not establish correct customer delivery.
 await verifyDownloads(page,p.files);
 return {url:link,published:false,visibility:'invisible',artifactsDigest:p.quality.artifactsDigest,requiresOwnerApproval:true};

}
async function connectProfile(env,{fetchImpl=fetch,chromium}={}){
 if(!env.TINYFISH_API_KEY||!/^prof_[a-f0-9]+$/.test(env.PAYHIP_PROFILE_ID||''))throw Error('TinyFish runtime credential and verified Payhip profile ID required');
 const profile=env.PAYHIP_PROFILE_ID;
 async function api(action,body){const r=await fetchImpl('https://agent.tinyfish.ai/v1/profiles/'+profile+'/'+action,{method:'POST',headers:{'X-API-Key':env.TINYFISH_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('TinyFish profile operation failed (HTTP '+r.status+')');return r.status===204?null:r.json();}
 const session=await api('setup-session',{url:PRODUCTS,timeout_seconds:180});
 if(typeof session.cdp_url!=='string'||!session.cdp_url.startsWith('wss://')||typeof session.session_id!=='string')throw Error('Invalid remote browser session response');
 // Never emit CDP URLs: they authorize access to an authenticated browser.
 let browser;
 try{browser=await (chromium||require('playwright-core').chromium).connectOverCDP(session.cdp_url,{timeout:30000});}
 catch(e){await api('setup-session/cancel',{session_id:session.session_id}).catch(()=>{});throw Error('Remote authenticated browser connection failed');}
 const context=browser.contexts()[0];if(!context){try{await api('setup-session/cancel',{session_id:session.session_id});}finally{await browser.close();}throw Error('Remote browser context unavailable');}
 const page=context.pages()[0]||await context.newPage();
 return {page,close:async()=>{try{await api('setup-session/cancel',{session_id:session.session_id});}finally{await browser.close();}}};
}
module.exports={STORE,validateRelease,guard,one,perform,connectProfile,verifyDownloads};

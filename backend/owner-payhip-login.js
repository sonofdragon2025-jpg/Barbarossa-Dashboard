'use strict';
// One-time owner-controlled Payhip sign-in. Run on YOUR computer, not on Render.
// Requires Node 22+, npm install in backend/, and installed Google Chrome.
const {chromium}=require('playwright-core');
const readline=require('node:readline');
const BASE='https://barbarossa-docker-validation.onrender.com';
const ask=q=>new Promise(resolve=>{const rl=readline.createInterface({input:process.stdin,output:process.stdout});rl.question(q,a=>{rl.close();resolve(a);});});
async function secret(){
 if(!process.stdin.isTTY)throw Error('Run from an interactive terminal');
 process.stdout.write('Barbarossa owner password (hidden): ');
 return new Promise(resolve=>{let p='';process.stdin.setRawMode(true);process.stdin.resume();const onData=buf=>{const c=buf.toString();if(c==='\r'||c==='\n'){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdout.write('\n');resolve(p);}else if(c==='\u0003'){process.exit(130);}else if(c==='\u007f'){p=p.slice(0,-1);}else{p+=c;}};process.stdin.on('data',onData);});
}
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:false});
 let storageState;
 try{
  const context=await browser.newContext();const page=await context.newPage();
  await page.goto('https://payhip.com/login',{waitUntil:'domcontentloaded'});
  console.log('Sign in to Payhip in the opened Chrome window. Complete any MFA.');
  await ask('After the seller Products page is visible, press Enter here... ');
  await page.goto('https://payhip.com/products',{waitUntil:'domcontentloaded'});
  const body=(await page.locator('body').innerText()).slice(0,30000);
  if(new URL(page.url()).pathname!=='/products'||!body.includes('Maintenance Shift Handoff')||!body.includes('PM Reliability Starter Toolkit'))throw Error('Correct Payhip seller account not verified locally');
  storageState=await context.storageState();
 }finally{await browser.close();}
 const password=await secret();
 const origin=new URL(BASE).origin;
 const login=await fetch(BASE+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin},body:JSON.stringify({password})});
 const session=await login.json();if(!login.ok)throw Error('Barbarossa owner login rejected: '+(session.error||login.status));
 const cookie=login.headers.get('set-cookie')?.split(';')[0];if(!cookie||!session.csrf)throw Error('Missing protected owner session');
 const result=await fetch(BASE+'/api/payhip/session-import',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,'Cookie':cookie,'X-CSRF-Token':session.csrf},body:JSON.stringify({storageState})});
 const data=await result.json();if(!result.ok)throw Error('Render authentication verification failed: '+(data.error||result.status));
 console.log('Render Payhip authenticated:',data.authenticated,'; encrypted session saved:',data.encryptedSessionSaved);
 console.log('Product uploads and publishing remain disabled.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

'use strict';
const {chromium}=require('playwright-core');
async function launchIsolatedBrowser({executablePath=process.env.CHROMIUM_PATH||'/usr/bin/chromium'}={}){
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 return browser;
}
async function testLocalCdp(){
 const browser=await launchIsolatedBrowser();
 try{
  const page=await browser.newPage();
  await page.goto('data:text/html,<title>Barbarossa CDP Smoke</title><h1>Playwright Ready</h1>');
  if(await page.title()!=='Barbarossa CDP Smoke')throw Error('Chromium smoke test failed');
  return {chromiumLaunched:true,playwrightAttached:true,payhipAuthenticated:false,filesUploaded:0};
 }finally{await browser.close();}
}
module.exports={launchIsolatedBrowser,testLocalCdp};

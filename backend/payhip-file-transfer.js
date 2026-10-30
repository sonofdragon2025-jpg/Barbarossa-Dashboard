'use strict';
// Supply real reviewed bytes directly to Playwright's file chooser. No OS dialog,
// fake filesystem paths, base64 pasted into form fields, or customer-visible writes.
const crypto=require('node:crypto');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function checkFiles(files){
 if(!Array.isArray(files)||!files.length||files.length>10)throw Error('Expected reviewed upload files');
 for(const f of files){
  if(!f||!Buffer.isBuffer(f.buffer)||!f.buffer.length||f.buffer.length>10000000||
     !/^[a-zA-Z0-9._-]{1,120}$/.test(f.name)||!/^[-\w.+]+\/[-\w.+]+$/.test(f.mime||'')||
     digest(f.buffer)!==f.sha256)throw Error('Invalid or unreviewed upload bytes');
 }
 return files;
}
// Try a real file input first. Payhip may hide it behind a moxie-shim.
// Only use an input within the upload section; never target the cover image.
async function locateUploadInput(page){
 const section=page.locator('div').filter({hasText:/File\\(s\\) - upload your product files/});
 const scoped=section.locator('input[type="file"]');
 if(await scoped.count()===1)return scoped;
 // Some versions inject a hidden input at document level. Use only when unique.
 const all=page.locator('input[type="file"]');
 if(await all.count()===1)return all;
 return null;
}
async function attachReviewedFiles(page,trigger,files,{timeout=60000}={}){
 checkFiles(files);
 if(!page||typeof page.locator!=='function'||!trigger||typeof trigger.click!=='function')throw Error('Playwright browser and upload trigger required');
 const attached=[];
 for(const f of files){
  const payload={name:f.name,mimeType:f.mime,buffer:f.buffer};
  let input=await locateUploadInput(page);
  if(input){
   await input.setInputFiles(payload,{timeout:15000});
  }else{
   // Arm the listener before clicking. A missing event is a safe failure,
   // never proof of a successful upload.
   const chooserPromise=page.waitForEvent('filechooser',{timeout:8000});
   await trigger.click();
   const chooser=await chooserPromise.catch(()=>null);
   if(!chooser){
    input=await locateUploadInput(page);
    if(!input)throw Error('Payhip file picker unavailable: no unique file input or filechooser event');
    await input.setInputFiles(payload,{timeout:15000});
   }else{
    if(typeof chooser.setFiles!=='function')throw Error('Payhip chooser cannot accept reviewed bytes');
    await chooser.setFiles(payload);
   }
  }
  // Confirm the seller UI reports the actual filename after upload.
  await page.getByText(f.name,{exact:true}).waitFor({state:'visible',timeout});
  attached.push({name:f.name,sha256:f.sha256,size:f.buffer.length});
 }
 return {attached,verifiedDownload:false};
}

module.exports={checkFiles,attachReviewedFiles};

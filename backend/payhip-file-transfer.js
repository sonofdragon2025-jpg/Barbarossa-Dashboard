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
async function attachReviewedFiles(page,trigger,files,{timeout=60000}={}){
 checkFiles(files);
 if(!page||typeof page.waitForEvent!=='function'||!trigger||typeof trigger.click!=='function')throw Error('Playwright browser and upload trigger required');
 const chooserPromise=page.waitForEvent('filechooser',{timeout:15000});
 await trigger.click();
 const chooser=await chooserPromise;
 if(typeof chooser.setFiles!=='function')throw Error('Browser cannot inject real file bytes');
 // Multi-file choosers are not guaranteed; attach sequentially if necessary.
 if(files.length>1 && !(await chooser.isMultiple())){
   await chooser.setFiles([{name:files[0].name,mimeType:files[0].mime,buffer:files[0].buffer}]);
   await page.getByText(files[0].name,{exact:true}).waitFor({state:'visible',timeout});
   for(const f of files.slice(1))await attachReviewedFiles(page,trigger,[f],{timeout});
 }else{
   await chooser.setFiles(files.map(f=>({name:f.name,mimeType:f.mime,buffer:f.buffer})));
 }
 for(const f of files)await page.getByText(f.name,{exact:true}).waitFor({state:'visible',timeout});
 return {attached:files.map(f=>({name:f.name,sha256:f.sha256,size:f.buffer.length})),verifiedDownload:false};
}
module.exports={checkFiles,attachReviewedFiles};

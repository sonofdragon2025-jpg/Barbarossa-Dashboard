'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {validateRelease,perform}=require('./payhip-uploader');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function release(){
 const files=[{name:'guide.docx',buffer:Buffer.from('docx-test'),mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},{name:'worksheet.csv',buffer:Buffer.from('asset,status\\nA,open'),mime:'text/csv'}].map(f=>({...f,sha256:digest(f.buffer)}));
 return {store:'https://payhip.com/HiottHoldingLLC',title:'Safe integration test',description:'A sufficiently long description for a safe release validation test.',priceCents:699,files,quality:{verdict:'pass',builderId:'build',reviewerId:'review',rendered:true,artifactsDigest:digest(Buffer.from(JSON.stringify(files.map(f=>({name:f.name,sha256:f.sha256})))))}};
}
test('valid release integrity alone cannot enable a live upload',async()=>{
 const p=release();assert.ok(validateRelease(p));
 let navigation=0;
 await assert.rejects(perform({goto:async()=>{navigation++;}},p,{}),/UI contract/);
 assert.equal(navigation,0);
});
test('changed customer file fails before browser navigation',async()=>{
 const p=release();p.files[0].buffer=Buffer.from('tampered');
 let navigation=0;
 await assert.rejects(perform({goto:async()=>{navigation++;}},p,{uiContractVerified:true,beforeCommit:async()=>{},beforePublish:async()=>{},afterCreate:async()=>{},verifyDownloads:async()=>{}}),/integrity/);
 assert.equal(navigation,0);
});
test('reviewer must be independent and rendering verified',()=>{
 const p=release();p.quality.reviewerId=p.quality.builderId;
 assert.throws(()=>validateRelease(p),/Independent/);
});

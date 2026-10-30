'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {attachReviewedFiles,checkFiles}=require('./payhip-file-transfer');
const file=(name,value)=>{const buffer=Buffer.from(value);return {name,mime:'text/plain',buffer,sha256:crypto.createHash('sha256').update(buffer).digest('hex')};};
test('rejects tampered bytes before browser action',()=>{
 const f=file('a.csv','valid');f.sha256='0'.repeat(64);
 assert.throws(()=>checkFiles([f]),/unreviewed/);
});
test('hidden file input receives real reviewed bytes and filenames are confirmed',async()=>{
 const seen=[],confirmed=[];
 const input={setInputFiles:async payload=>seen.push(payload)};
 const page={
  locator:selector=>selector==='div'?{filter:()=>({locator:()=>({count:async()=>1,setInputFiles:input.setInputFiles})})}:({count:async()=>0}),
  getByText:name=>({waitFor:async()=>confirmed.push(name)})
 };
 const trigger={click:async()=>{throw Error('must not click when file input exists')}};
 const result=await attachReviewedFiles(page,trigger,[file('test.docx','docx'),file('test.csv','csv')]);
 assert.deepEqual(seen.map(x=>x.buffer.toString()),['docx','csv']);
 assert.deepEqual(confirmed,['test.docx','test.csv']);
 assert.equal(result.verifiedDownload,false);
});
test('filechooser fallback receives actual bytes',async()=>{
 const seen=[];
 const page={
  locator:()=>({filter:()=>({locator:()=>({count:async()=>0})}),count:async()=>0}),
  waitForEvent:async()=>({setFiles:async f=>seen.push(f)}),
  getByText:()=>({waitFor:async()=>{}})
 };
 await attachReviewedFiles(page,{click:async()=>{}},[file('test.csv','real bytes')]);
 assert.equal(seen[0].buffer.toString(),'real bytes');
});
test('fails closed when neither input nor chooser works',async()=>{
 const page={
  locator:()=>({filter:()=>({locator:()=>({count:async()=>0})}),count:async()=>0}),
  waitForEvent:async()=>{throw Error('timeout')},
  getByText:()=>({waitFor:async()=>{}})
 };
 await assert.rejects(()=>attachReviewedFiles(page,{click:async()=>{}},[file('test.csv','bytes')]),/file picker unavailable/);
});

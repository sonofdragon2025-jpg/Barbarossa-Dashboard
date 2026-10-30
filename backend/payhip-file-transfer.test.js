'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {attachReviewedFiles,checkFiles}=require('./payhip-file-transfer');
const file=(name,text)=>{const buffer=Buffer.from(text);return {name,mime:'text/plain',buffer,sha256:crypto.createHash('sha256').update(buffer).digest('hex')};};
test('rejects mismatched hashes before browser interaction',async()=>{
 const f=file('guide.txt','actual');f.sha256='0'.repeat(64);
 assert.throws(()=>checkFiles([f]),/unreviewed/);
});
test('passes real bytes to a multi-file Playwright chooser',async()=>{
 const files=[file('guide.txt','one'),file('worksheet.txt','two')],events=[],seen=[];
 const page={waitForEvent:async()=>({isMultiple:async()=>true,setFiles:async fs=>{seen.push(...fs);events.push('setFiles');}}),getByText:name=>({waitFor:async()=>events.push('visible:'+name)})};
 const trigger={click:async()=>events.push('click')};
 const r=await attachReviewedFiles(page,trigger,files);
 assert.deepEqual(seen.map(f=>f.buffer.toString()),['one','two']);
 assert.equal(r.verifiedDownload,false);
 assert.equal(r.attached.length,2);
 assert.deepEqual(events.slice(0,2),['click','setFiles']);
});
test('single-file chooser reopens for subsequent files',async()=>{
 const files=[file('a.txt','A'),file('b.txt','B')],seen=[];
 const page={waitForEvent:async()=>({isMultiple:async()=>false,setFiles:async fs=>seen.push(fs[0].name)}),getByText:()=>({waitFor:async()=>{}})};
 await attachReviewedFiles(page,{click:async()=>{}},files);
 assert.deepEqual(seen,['a.txt','b.txt']);
});

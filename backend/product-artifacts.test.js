'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {validate,csv,packageProduct,sha} = require('./product-artifacts');
function sample(){
 return {
  title:'Maintenance Handoff Review Toolkit',
  description:'Illustrative maintenance handoff workflow and editable worksheet.',
  guideMarkdown:'# Handoff workflow\n'+Array.from({length:110},(_,i)=>'Review equipment condition, isolation status, ownership, observations, corrective actions, and next-shift communication carefully.').join('\n'),
  headers:['Work Order #','Asset','Finding'],
  rows:[['WO-100','Pump A','Illustrative example'],['','','']],
  diagramSteps:['Review work order','Document condition','Assign follow-up']
 };
}
test('valid product packages DOCX and CSV with matching hashes',async()=>{
 const p=sample();assert.equal(validate(p),p);
 const files=await packageProduct(p);
 assert.deepEqual(files.map(f=>f.name),['guide.docx','worksheet.csv']);
 for(const f of files){assert.ok(f.buffer.length>0);assert.equal(sha(f.buffer),f.sha256);}
 assert.ok(files[0].buffer.length>1000);
 assert.equal(files[0].buffer.subarray(0,2).toString(),'PK');
 assert.equal(files[1].buffer.toString('utf8'),csv(p));
});
test('rejects spreadsheet formula injection and malformed rows',()=>{
 for(const cell of ['=SUM(1,1)','+cmd','@formula','-1']){
  const p=sample();p.rows[1][0]=cell;
  assert.throws(()=>validate(p),/Unsafe worksheet cell/);
 }
 const p=sample();p.rows[1].pop();assert.throws(()=>validate(p),/column mismatch/);
});
test('rejects incomplete guides and unlabeled worksheet examples',()=>{
 const p=sample();p.guideMarkdown='Short guide';assert.throws(()=>validate(p),/Guide incomplete/);
 const q=sample();q.rows=[['WO-100','Pump A','Real observation'],['','','']];assert.throws(()=>validate(q),/labeled example/);
});
test('escapes CSV quotes and preserves line breaks',()=>{
 const p=sample();p.rows[0][2]='Illustrative example, with "quotes"';
 assert.match(csv(p),/"Illustrative example, with ""quotes"""/);
 assert.ok(csv(p).startsWith('\uFEFF'));
 assert.ok(csv(p).endsWith('\r\n'));
});

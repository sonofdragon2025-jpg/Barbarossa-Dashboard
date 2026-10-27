'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const c = require('./agent-coordinator');
const create = () => c.createRun({requestKey: 'test-1', goal: 'Prepare a maintenance toolkit'});
const artifacts = [{name:'guide.docx',sha256:'a'.repeat(64),reference:'private-artifact:guide'}, {name:'worksheet.csv',sha256:'b'.repeat(64),reference:'private-artifact:worksheet'}];
const outputs = {
  research: {summary:'Demand evidence',sources:['https://example.com/research']},
  design: {summary:'Product brief'}, build: {summary:'Files prepared',artifacts},
  quality: {summary:'Reviewed',verdict:'pass',reviewedArtifactsDigest:c.digest(artifacts),checks:Object.fromEntries(['originality','technicalAccuracy','safety','filesRender','worksheetValid','noPlaceholders'].map(k=>[k,true]))},
  listing: {summary:'Draft sales copy',priceCents:900}, promotion:{summary:'Draft posts'},
  support:{summary:'FAQ and escalation plan'},performance:{summary:'Metrics plan; no sales assumed'}
};
function done(run, step, output=outputs[step]) {return c.completeTask(run,step,{expectedVersion:run.version,output});}
function built() {let r=create();for(const id of ['research','design','build'])r=done(r,id);return r;}
test('dependencies and shared context protect the product pipeline',()=>{
  const r=create();assert.equal(r.tasks.research.status,'ready');assert.equal(r.tasks.build.status,'waiting');
  assert.equal(r.context.brand,'Hiott Holding LLC');
  assert.throws(()=>done(r,'build'),/not ready/);
});
test('handoffs retain evidence and allow parallel downstream work only after quality',()=>{
  let r=done(built(),'quality');
  for(const id of ['listing','promotion','support'])assert.equal(r.tasks[id].status,'ready');
  assert.equal(r.tasks.performance.status,'waiting');
  for(const id of ['support','promotion','listing','performance'])r=done(r,id);
  assert.equal(r.status,'ready-for-automated-release');assert.equal(r.events.length,9);
  assert.equal(r.tasks.research.output.sources.length,1);
  assert.equal(c.status().automaticPublishingEnabled,false);
});
test('rejects stale or replayed submissions without mutating state',()=>{
  const r=create(), next=done(r,'research');
  assert.equal(r.version,1);
  assert.throws(()=>c.completeTask(next,'design',{expectedVersion:1,output:outputs.design}),/Stale/);
  assert.throws(()=>done(next,'research'),/not ready/);
});
test('quality must reference current artifacts and every check must pass',()=>{
  const r=built();
  assert.throws(()=>done(r,'quality',{...outputs.quality,reviewedArtifactsDigest:'c'.repeat(64)}),/current artifacts/);
  assert.throws(()=>done(r,'quality',{...outputs.quality,checks:{...outputs.quality.checks,noPlaceholders:false}}),/failed quality/);
});
test('revision invalidates build and stops after two failed builds',()=>{
  const reject={...outputs.quality,verdict:'revise',summary:'Remove placeholders'};
  let r=done(built(),'quality',reject);
  assert.equal(r.tasks.build.status,'ready');assert.equal(r.tasks.quality.output,undefined);
  assert.equal(r.tasks.listing.status,'waiting');
  r=done(r,'build');r=done(r,'quality',reject);
  assert.equal(r.status,'needs-owner-intervention');
  assert.throws(()=>done(r,'build'),/not ready/);
});
test('untrusted outputs cannot add permissions or execute actions',()=>{
  assert.throws(()=>done(create(),'research',{...outputs.research,paymentsEnabled:true}),/structured output/);
  assert.throws(()=>done(create(),'research',{summary:'x',sources:['javascript:alert(1)']}),/HTTPS/);
  const s=c.status();for(const k of ['autonomousWorkersEnabled','externalActionsEnabled','paymentsEnabled','externalHiringEnabled','walletEnabled','tokenizationEnabled'])assert.equal(s[k],false);
});
test('file manifests and proposed prices are validated',()=>{
  let r=done(done(create(),'research'),'design');
  assert.throws(()=>done(r,'build',{summary:'x',artifacts:[artifacts[0],artifacts[0]]}),/manifest/);
  r=done(done(r,'build'),'quality');
  assert.throws(()=>done(r,'listing',{summary:'x',priceCents:-1}),/price/);
});
test('database completion rolls back on stale state and releases its connection',async()=>{
  const queries=[];let released=false;
  const client={query:async(sql)=>{queries.push(sql);return {rows:sql.startsWith('SELECT')?[{data:create()}]:[]};},release:()=>{released=true;}};
  await assert.rejects(c.complete({connect:async()=>client},'id','research',{expectedVersion:0,output:outputs.research}),/Stale/);
  assert.ok(queries.some(q=>q.includes('FOR UPDATE')));assert.equal(queries.at(-1),'ROLLBACK');assert.ok(released);
});

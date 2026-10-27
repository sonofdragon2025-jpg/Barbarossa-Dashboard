'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), crypto=require('node:crypto');
const w=require('./worker-access'), c=require('./agent-coordinator');
const token='a'.repeat(64), tokenSha256=crypto.createHash('sha256').update(token).digest('hex');
const researcher={id:'research-one',steps:['research']}, builder={id:'builder-one',steps:['build']}, evaluator={id:'review-one',steps:['quality']};
const input=()=>c.createRun({requestKey:'workers-test',goal:'Build an original toolkit'});
const options={paused:false,now:1000};
const artifacts=[{name:'guide.docx',reference:'artifact:guide',sha256:'a'.repeat(64)},{name:'data.csv',reference:'artifact:data',sha256:'b'.repeat(64)}];
function done(run,step,output){return c.completeTask(run,step,{expectedVersion:run.version,output});}
function built(){let r=input();r=done(r,'research',{summary:'Evidence',sources:['https://example.org']});r=done(r,'design',{summary:'Design'});return done(r,'build',{summary:'Built',artifacts});}
const review={summary:'Reviewed files',verdict:'pass',reviewedArtifactsDigest:c.digest(artifacts),checks:Object.fromEntries(['originality','technicalAccuracy','safety','filesRender','worksheetValid','noPlaceholders'].map(k=>[k,true]))};
test('registry authenticates scoped tokens and rejects ambiguous identities',()=>{
 const registry=w.registryFrom(JSON.stringify([{...researcher,tokenSha256}]));
 assert.equal(w.authenticate(registry,'Bearer '+token).id,researcher.id);
 assert.equal(w.authenticate(registry,'Bearer '+'b'.repeat(64)),null);
 assert.equal(w.authenticate(registry,'Basic '+token),null);
 assert.deepEqual(w.registryFrom(),[]);
 assert.throws(()=>w.registryFrom('invalid'),/JSON/);
 assert.throws(()=>w.registryFrom(JSON.stringify([{id:'both-roles',tokenSha256,steps:['build','quality']}])) ,/separate/);
 assert.throws(()=>w.registryFrom(JSON.stringify([{...researcher,tokenSha256},{id:'second-id',steps:['build'],tokenSha256}])) ,/registry/);
});
test('scope, dependencies and global pause block assignments',()=>{
 assert.throws(()=>w.claim(input(),'research',builder,options),/role/);
 assert.throws(()=>w.claim(input(),'build',builder,options),/ready/);
 assert.throws(()=>w.claim(input(),'research',researcher,{paused:true}),/Pause/);
 assert.throws(()=>w.claim(input(),'research',researcher),/Pause/);
});
test('leases expire, hide credential hashes from assignments, and cannot be stolen',()=>{
 const a=w.claim(input(),'research',researcher,options);
 const view=w.assignmentView(a.run,'research',a.leaseToken);
 assert.equal(JSON.stringify(view).includes(tokenSha256),false);
 assert.equal(JSON.stringify(view).includes('tokenSha256'),false);
 assert.deepEqual(Object.keys(view.dependencies),[]);
 assert.throws(()=>w.claim(a.run,'research',researcher,options),/active/);
 const b=w.claim(a.run,'research',researcher,{paused:false,now:302000});
 assert.notEqual(a.leaseToken,b.leaseToken);
 assert.throws(()=>w.complete(b.run,'research',researcher,{leaseToken:a.leaseToken}, {paused:false,now:302001}),/token/);
 const output={summary:'Demand',sources:['https://example.org']};
 assert.throws(()=>w.complete(a.run,'research',researcher,{leaseToken:a.leaseToken,output},{paused:false,now:302001}),/expired/);
});
test('owner route cannot complete assigned work; worker result is attributed and replay protected',()=>{
 const a=w.claim(input(),'research',researcher,options), output={summary:'Demand',sources:['https://example.org']};
 assert.throws(()=>done(a.run,'research',output),/worker assignment/);
 const result=w.complete(a.run,'research',researcher,{leaseToken:a.leaseToken,output},options);
 assert.equal(result.tasks.research.completedBy,researcher.id);
 assert.equal(result.events.at(-1).actor,researcher.id);
 assert.equal(result.tasks.design.status,'ready');
 assert.throws(()=>w.complete(result,'research',researcher,{leaseToken:a.leaseToken,output},options),/token/);
});
test('parallel independent roles can complete without invalidating one another',()=>{
 let r=done(built(),'quality',review);
 const sales={id:'sales-one',steps:['listing']}, marketer={id:'market-one',steps:['promotion']};
 const a=w.claim(r,'listing',sales,options), b=w.claim(a.run,'promotion',marketer,options);
 r=w.complete(b.run,'listing',sales,{leaseToken:a.leaseToken,output:{summary:'Listing',priceCents:900}},options);
 r=w.complete(r,'promotion',marketer,{leaseToken:b.leaseToken,output:{summary:'Promotion'}},options);
 assert.equal(r.tasks.listing.status,'complete');assert.equal(r.tasks.promotion.status,'complete');
});
test('changed dependencies and self-evaluation are rejected',()=>{
 const a=w.claim(built(),'quality',evaluator,options);
 a.run.tasks.build.output.summary='Changed artifact work';
 assert.throws(()=>w.complete(a.run,'quality',evaluator,{leaseToken:a.leaseToken,output:review},options),/Dependencies changed/);
 const r=built();r.tasks.build.completedBy=evaluator.id;
 assert.throws(()=>w.claim(r,'quality',evaluator,options),/own build/);
});
test('delivery retry count is bounded',()=>{
 let r=input();
 for(let n=0;n<3;n++)r=w.claim(r,'research',researcher,{paused:false,now:1000+n*301000}).run;
 assert.throws(()=>w.claim(r,'research',researcher,{paused:false,now:1000000}),/retry limit/);
});
test('transaction failure rolls back and releases the database connection',async()=>{
 const queries=[];let released=false;
 const client={query:async(sql)=>{queries.push(sql);return {rows:sql.startsWith('SELECT')?[{data:input()}]:[]};},release:()=>released=true};
 await assert.rejects(w.transact({connect:async()=>client},'run',()=>{throw Error('failure');}),/failure/);
 assert.ok(queries[1].includes('FOR UPDATE'));assert.equal(queries.at(-1),'ROLLBACK');assert.equal(released,true);
});

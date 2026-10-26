'use strict';
const crypto=require('node:crypto');
const TOPICS=[
 {slug:'asset-criticality',title:'Asset Criticality Assessment Worksheet',sections:['Asset inventory','Safety and production consequence scoring','Lead time and redundancy','Priority review']},
 {slug:'rca-5why',title:'Root Cause Analysis and 5-Why Investigation Kit',sections:['Problem statement','Evidence collection','Five why analysis','Corrective action validation']},
 {slug:'pm-audit',title:'Preventive Maintenance Quality Audit Checklist',sections:['Work order completeness','OEM task validation','Safety prerequisites','Follow-up defects']},
 {slug:'spares',title:'Critical Spare Parts Planning Workbook',sections:['Lead times','Failure consequences','Stockout risks','Reorder review']},
 {slug:'shift-handoff',title:'Maintenance Shift Handoff Template',sections:['Open breakdowns','Safety concerns','Temporary repairs','Next shift ownership']},
 {slug:'backlog',title:'Maintenance Backlog Prioritization Toolkit',sections:['Risk scoring','Ready-to-schedule gate','Weekly review','Age and trend']},
 {slug:'kpi',title:'Maintenance KPI Definitions and Scorecard',sections:['PM compliance','Schedule compliance','MTTR and MTBF','Emergency work share']}
];
function dateString(d){return d.toISOString().slice(0,10);}
function draftFor(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Invalid day');const n=Math.floor(Date.parse(day+'T00:00:00Z')/86400000),topic=TOPICS[((n%TOPICS.length)+TOPICS.length)%TOPICS.length];const title=topic.title;const lines=[`# ${title}`,'**Hiott Holding LLC** | Working draft | Not published','',`Prepared: ${day}`,'','## Instructions','Adapt to site-specific OEM guidance, CMMS terminology, hazard assessments, and procedures. Review before customer distribution.'];for(const section of topic.sections){lines.push('',`## ${section}`,'- Objective: [Define desired result]','- Responsible owner: [Name / role]','- Asset / area: [ID / location]','- Evidence or baseline: [Record]','- Action and due date: [Enter]','- Verification / sign-off: [Enter]');}lines.push('','## Quality assurance before publishing','- [ ] Validate technical claims and calculations','- [ ] Confirm all safety and regulatory caveats','- [ ] Check uniqueness, usefulness, formatting and licensing','- [ ] Owner approves final product, price and storefront publication','','© Hiott Holding LLC. All rights reserved.');return {day,slug:topic.slug,title,markdown:lines.join('\n'),status:'draft-needs-review'};}
async function init(pool){await pool.query(`CREATE TABLE IF NOT EXISTS barbarossa_product_queue (day text PRIMARY KEY, slug text NOT NULL, title text NOT NULL, markdown text NOT NULL, status text NOT NULL DEFAULT 'draft-needs-review', created_at timestamptz NOT NULL DEFAULT now(), CHECK(status IN ('draft-needs-review','approved-for-packaging','packaged','published')))`);}
async function generate(pool,day){const d=draftFor(day);await pool.query('INSERT INTO barbarossa_product_queue(day,slug,title,markdown,status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(day) DO NOTHING',[d.day,d.slug,d.title,d.markdown,d.status]);const r=await pool.query('SELECT day,slug,title,status,created_at FROM barbarossa_product_queue WHERE day=$1',[day]);return r.rows[0];}
async function list(pool){const r=await pool.query('SELECT day,slug,title,status,created_at FROM barbarossa_product_queue ORDER BY day DESC LIMIT 60');return r.rows;}

const HEADERS={
 'shift-handoff':['Date','Shift','Area','Asset ID','Equipment status','Issue or risk','Temporary repair','Safety/LOTO notes','Action needed','Owner','Priority','Due date','Next shift acknowledgement'],
 'asset-criticality':['Asset ID','Area','Description','Safety impact (1-5)','Production impact (1-5)','Lead time (1-5)','Failure frequency (1-5)','Quality impact (1-5)','Total score','Owner','Review date'],
 'rca-5why':['Event ID','Asset ID','Date','Problem statement','Evidence','Why 1','Why 2','Why 3','Why 4','Why 5','Root cause hypothesis','Corrective action','Owner','Due date','Effectiveness review'],
 'pm-audit':['Work order','Asset ID','OEM procedure verified','LOTO documented','Task complete','Measurements recorded','Defects followed up','Reviewer','Date'],
 'spares':['Part ID','Description','Compatible asset','Supplier','Lead time days','On hand','Min quantity','Max quantity','Unit cost','Reorder owner'],
 'backlog':['Work order','Asset ID','Work description','Safety impact','Production impact','Priority','Parts ready','Access ready','Estimated hours','Assigned owner','Target date'],
 'kpi':['Period','PM due','PM on time','PM compliance %','Scheduled work orders','Completed scheduled','Schedule compliance %','Repair hours','Repair events','MTTR hours','Operating hours','Failures','MTBF hours']
};
function csvCell(s){return '"'+String(s).replace(/"/g,'""')+'"';}
function worksheetFor(slug){const headers=HEADERS[slug];if(!headers)throw Error('Unsupported product');return '\uFEFF'+headers.map(csvCell).join(',')+'\r\n';}
async function detail(pool,day){const r=await pool.query('SELECT day,slug,title,markdown,status,created_at FROM barbarossa_product_queue WHERE day=$1',[day]);return r.rows[0]||null;}
function listingFor(p){return {title:p.title+' | Hiott Holding LLC',description:'Editable maintenance management worksheet and practical implementation guidance for facilities and manufacturing teams. Includes an instructional guide and CSV template. Customize to your site, OEM instructions, and safety requirements.',suggestedPriceCents:900,priceApproved:false,visibility:'invisible',publishReady:false,manualPayhipUploadRequired:true,files:[p.day+'-'+p.slug+'.md',p.day+'-'+p.slug+'.csv']};}
module.exports={init,generate,list,draftFor,detail,worksheetFor,listingFor};

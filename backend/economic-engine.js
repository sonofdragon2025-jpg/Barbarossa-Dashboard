'use strict';
// Research-only economic engine. No wallet, order, publishing or paid-execution interfaces.
const PILLARS=Object.freeze(['market_momentum','asset_production','network_arbitrage']);
const HOUR=3600000;
const MIN_WINDOW=48*HOUR;
const MAX_CENTS=Number.MAX_SAFE_INTEGER;
function cents(n,label){if(!Number.isSafeInteger(n)||n<0||n>MAX_CENTS)throw Error(label+' must be nonnegative safe integer cents');return n;}
function iso(value){const d=new Date(value);if(!Number.isFinite(d.getTime()))throw Error('Invalid timestamp');return d.toISOString();}
function createEngine({initialCapitalCents=0,startedAt=new Date().toISOString()}={}){
 cents(initialCapitalCents,'initialCapitalCents');
 return {schemaVersion:1,mode:'paper-only',startedAt:iso(startedAt),initialCapitalCents,
  vaultPolicy:{proposedPercent:70,enabled:false,reason:'Existing tax/owner/service/investment allocation takes precedence until owner approves reconciliation'},
  controls:{globalPause:true,externalExecutionEnabled:false,automaticTransfersEnabled:false,monthlyCapCents:10000},
  entries:[],pillars:Object.fromEntries(PILLARS.map(p=>[p,{active:true,frozenAt:null,reason:null}])),audit:[]};
}
function validate(state){if(!state||state.schemaVersion!==1||state.mode!=='paper-only'||!Array.isArray(state.entries)||!state.pillars)throw Error('Invalid paper engine state');}
function recordPaperYield(state,{id,pillar,grossCents,costCents,at,source='unverified',verified=false}){
 validate(state);
 if(!PILLARS.includes(pillar))throw Error('Unknown pillar');
 if(typeof id!=='string'||! /^[A-Za-z0-9:_-]{8,100}$/.test(id))throw Error('Invalid unique record id');
 if(state.entries.some(e=>e.id===id))throw Error('Duplicate record id');
 cents(grossCents,'grossCents');cents(costCents,'costCents');
 if(typeof verified!=='boolean'||typeof source!=='string'||!source.trim())throw Error('Invalid verification metadata');
 const timestamp=iso(at);if(new Date(timestamp).getTime()>Date.now()+60000)throw Error('Future record');
 if(!state.pillars[pillar].active)throw Error('Pillar frozen');
 const row=Object.freeze({id,pillar,grossCents,costCents,netCents:grossCents-costCents,at:timestamp,source,verified});
 state.entries.push(row);
 return row;
}
function trailing(state,pillar,nowMs){
 return state.entries.filter(e=>e.pillar===pillar&&e.verified&&new Date(e.at).getTime()>nowMs-MIN_WINDOW&&new Date(e.at).getTime()<=nowMs);
}
function auditPivot(state,{now=new Date().toISOString(),minimumNetCents=500}={}){
 validate(state);cents(minimumNetCents,'minimumNetCents');
 const timestamp=iso(now),nowMs=new Date(timestamp).getTime(),startMs=new Date(state.startedAt).getTime();
 if(nowMs<startMs)throw Error('Audit precedes start');
 const actions=[];
 for(const pillar of PILLARS){
  if(!state.pillars[pillar].active)continue;
  const rows=trailing(state,pillar,nowMs);
  const netCents=rows.reduce((s,e)=>s+e.netCents,0);
  // Full 48-hour observation and two DISTINCT verified activity days required.
  const days=new Set(rows.map(e=>e.at.slice(0,10)));
  if(nowMs-startMs<MIN_WINDOW||days.size<2){
   actions.push({pillar,action:'insufficient_evidence',verifiedDays:days.size,netCents});continue;
  }
  if(netCents<minimumNetCents){
   state.pillars[pillar]={active:false,frozenAt:timestamp,reason:'Verified 48h net below threshold'};
   actions.push({pillar,action:'freeze_research_allocation',netCents});
  }else actions.push({pillar,action:'retain',netCents});
 }
 const eligible=PILLARS.filter(p=>state.pillars[p].active);
 const ranked=eligible.map(p=>({pillar:p,netCents:trailing(state,p,nowMs).reduce((s,e)=>s+e.netCents,0)})).sort((a,b)=>b.netCents-a.netCents);
 const result={at:timestamp,actions,researchPriority:ranked[0]?.pillar||null,financialReallocation:false,externalActions:false};
 state.audit.push(result);return result;
}
function report(state){validate(state);
 const verified=state.entries.filter(e=>e.verified),unverified=state.entries.filter(e=>!e.verified);
 const totals=rows=>({grossCents:rows.reduce((s,e)=>s+e.grossCents,0),costCents:rows.reduce((s,e)=>s+e.costCents,0),netCents:rows.reduce((s,e)=>s+e.netCents,0)});
 return {mode:state.mode,verified:totals(verified),unverified:totals(unverified),verifiedRecords:verified.length,unverifiedRecords:unverified.length,
  proposedVaultCents:Math.floor(state.initialCapitalCents*0.7),proposedOperatingCents:state.initialCapitalCents-Math.floor(state.initialCapitalCents*0.7),
  actualWalletBalances:null,actualTransfers:0,controls:state.controls,pillars:state.pillars};
}
module.exports={PILLARS,createEngine,recordPaperYield,auditPivot,report};

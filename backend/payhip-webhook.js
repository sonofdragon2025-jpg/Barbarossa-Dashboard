'use strict';
const crypto=require('node:crypto');
function validMoney(n){return Number.isSafeInteger(n)&&n>=0&&n<=100000000000;}
function validEvent(b){return b&&typeof b.id==='string'&&b.id.length>0&&b.id.length<=128&&['paid','refunded'].includes(b.type)&&b.currency==='USD'&&validMoney(b.price)&&Number.isSafeInteger(b.date||b.date_created)&&b.items instanceof Array;}
function verify(b,key){if(!key||typeof b.signature!=='string'||!/^[a-f0-9]{64}$/i.test(b.signature))return false;const expected=crypto.createHash('sha256').update(key).digest('hex');return crypto.timingSafeEqual(Buffer.from(b.signature.toLowerCase()),Buffer.from(expected));}
async function initialize(pool){await pool.query(`CREATE TABLE IF NOT EXISTS barbarossa_payhip_orders (
 id text PRIMARY KEY, month text NOT NULL, price_cents bigint NOT NULL CHECK(price_cents>=0),
 fees_cents bigint NOT NULL CHECK(fees_cents>=0), refunded_cents bigint NOT NULL DEFAULT 0 CHECK(refunded_cents>=0),
 revenue_entry_id uuid NOT NULL UNIQUE, updated_at timestamptz NOT NULL DEFAULT now()
)`);}
async function ingest(pool,b,key){
 if(!verify(b,key))return {status:401,error:'Invalid webhook signature'};
 if(!validEvent(b))return {status:422,error:'Unsupported or invalid Payhip event; USD only'};
 const client=await pool.connect();
 try{
 await client.query('BEGIN');
 const existing=await client.query('SELECT * FROM barbarossa_payhip_orders WHERE id=$1 FOR UPDATE',[b.id]);
 if(b.type==='paid'){
  if(existing.rowCount){await client.query('COMMIT');return {status:200,duplicate:true};}
  const fees=(b.stripe_fee||0)+(b.payhip_fee||0);
  if(!validMoney(b.stripe_fee||0)||!validMoney(b.payhip_fee||0)||fees>b.price){await client.query('ROLLBACK');return {status:422,error:'Invalid fees'};}
  const date=new Date(b.date*1000);if(!Number.isFinite(date.getTime())){await client.query('ROLLBACK');return {status:422,error:'Invalid date'};}
  const month=date.toISOString().slice(0,7),id=crypto.randomUUID();
  await client.query('INSERT INTO barbarossa_revenue(id,month,sales_cents,refunds_cents,fees_cents,other_costs_cents,note) VALUES($1,$2,$3,0,$4,0,$5)',[id,month,b.price,fees,'Payhip webhook sale '+b.id]);
  await client.query('INSERT INTO barbarossa_payhip_orders(id,month,price_cents,fees_cents,revenue_entry_id) VALUES($1,$2,$3,$4,$5)',[b.id,month,b.price,fees,id]);
 }else{
  if(!existing.rowCount){await client.query('ROLLBACK');return {status:503,error:'Original paid event not yet received'};}
  const order=existing.rows[0],refunded=b.amount_refunded;
  if(!validMoney(refunded)||refunded>Number(order.price_cents)){await client.query('ROLLBACK');return {status:422,error:'Invalid refund amount'};}
  // Payhip reports amount_refunded; interpret as cumulative, never reduce a prior refund.
  const next=Math.max(Number(order.refunded_cents),refunded);
  await client.query('UPDATE barbarossa_payhip_orders SET refunded_cents=$2,updated_at=now() WHERE id=$1',[b.id,next]);
  await client.query('UPDATE barbarossa_revenue SET refunds_cents=$2 WHERE id=$1',[order.revenue_entry_id,next]);
 }
 await client.query('COMMIT');return {status:200,recorded:true};
 }catch(e){try{await client.query('ROLLBACK');}catch{}throw e;}finally{client.release();}
}
module.exports={initialize,ingest};

'use strict';
// Read-only Base connector. No signer, credentials, transfers, or approvals.
const NETWORKS=Object.freeze({base:{chainId:8453,rpc:'https://mainnet.base.org'},'base-sepolia':{chainId:84532,rpc:'https://sepolia.base.org'}});
function assertAddress(a){if(typeof a!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(a))throw Error('INVALID_WALLET_ADDRESS');return a;}
async function rpc(method,params=[],{network='base-sepolia',fetchImpl=fetch}={}){
 const cfg=NETWORKS[network];if(!cfg)throw Error('UNSUPPORTED_NETWORK');
 if(!['eth_chainId','eth_blockNumber','eth_getBalance'].includes(method))throw Error('READ_ONLY_METHOD_REQUIRED');
 const r=await fetchImpl(cfg.rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('RPC_HTTP_FAILURE');
 const x=await r.json();if(x?.jsonrpc!=='2.0'||x.error||typeof x.result!=='string')throw Error('RPC_INVALID_RESPONSE');
 return x.result;
}
async function checkChain(opts={}){const n=NETWORKS[opts.network||'base-sepolia'];if(!n)throw Error('UNSUPPORTED_NETWORK');if(BigInt(await rpc('eth_chainId',[],opts))!==BigInt(n.chainId))throw Error('CHAIN_MISMATCH');return n.chainId;}
async function checkWalletBalances(address,opts={}){assertAddress(address);await checkChain(opts);const hex=await rpc('eth_getBalance',[address,'latest'],opts);if(!/^0x[0-9a-fA-F]+$/.test(hex))throw Error('INVALID_BALANCE');return {address,network:opts.network||'base-sepolia',ethWei:BigInt(hex).toString(),usdc:'NOT_CONFIGURED',readOnly:true};}
module.exports={NETWORKS,assertAddress,rpc,checkChain,checkWalletBalances};

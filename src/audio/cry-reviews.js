import { cryRecipe } from './monster-cries.js';
const KEY='gridiron-beast-cry-reviews-v1';
const memory={};
const fingerprint=id=>JSON.stringify(cryRecipe(id));
export function cryReviews(){
 let stored={};try{const value=JSON.parse(globalThis.localStorage?.getItem(KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))stored=value;}catch{}
 const all={...stored};for(const [id,r] of Object.entries(memory)){if(!all[id]||r.updatedAt>=all[id].updatedAt)all[id]=r;}return all;
}
export function cryVerdict(id){const r=cryReviews()[id];return r&&r.fingerprint===fingerprint(id)?r.status:'pending';}
export function saveCryReview(id,status,notes){
 if(!['approved','revision','pending'].includes(status))throw new Error('Unknown verdict');
 const all=cryReviews();all[id]={status,notes:String(notes).slice(0,4000),fingerprint:fingerprint(id),updatedAt:new Date().toISOString()};Object.assign(memory,all);
 try{if(!globalThis.localStorage)throw new Error();localStorage.setItem(KEY,JSON.stringify(all));return true;}catch{return false;}
}

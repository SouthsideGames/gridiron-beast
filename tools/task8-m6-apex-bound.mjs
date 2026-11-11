#!/usr/bin/env node
// Optimistic impossibility diagnostic, NOT the prescribed played-career acceptance sample.
import fs from 'node:fs';
import { createRng } from '../src/core/rng.js';
import { FORMS, POSITIONS, ATTRIBUTES } from '../src/data/beast-dex.js';
import { generateIndividual, addLevelXp } from '../src/franchise/t8/progression.js';
import { footballAward, clashAward, OFFSEASON_POINTS } from '../src/franchise/t8/awards.js';
import { toNumber } from '../src/core/fraction.js';
// Actual calendar ends at week 13 (10 regular weeks + 3 playoffs). Count every week as a game, including the bye,
// plus an opening AND OT Clash every game and all nine eligible Tuesday encounters. This deliberately OVERCOUNTS
// a player's opportunities, assumes perfect grades, no injury/absence, and grants level 50 natural growth at time zero.
const schedule={football:13,clash:13*2+9,seasons:15};
const maxFootball=toNumber(footballAward({position:'QB',liveSnaps:10,gradeAdj:.2}).training);
const maxClash=toNumber(clashAward({gradeAdj:.2}).training);
const rows=[];
for(const position of POSITIONS)for(let seed=1;seed<=100;seed++){
 const rng=createRng(seed),forms=FORMS.filter(f=>f.position===position&&f.stage===0&&f.rarity!=='legendary');
 const form=rng.pick(forms),d=generateIndividual(rng,form.id,{apex:true});
 addLevelXp(d,75*49);
 rows.push({position,seed,form:form.id,temper:d.temper,trainingNeeded:ATTRIBUTES.reduce((n,a)=>n+99-d.current[a],0)});
}
const opportunities=schedule.football+schedule.clash;
const bounds=Array.from({length:7},(_,i)=>{
 const share=(20+i*5)/100;
 const available=schedule.seasons*(opportunities*(share+.05)+OFFSEASON_POINTS);
 return {share,trainingAvailableUpperBound:Math.round(available*100)/100,canPossiblyReachAll99:rows.filter(r=>r.trainingNeeded<=available).length};
});
const out={source:'f716b02c41c81211d80e7389dc0cefd4c16ae155',scope:'Optimistic resource bound; synthetic sample, not played careers. No production settings changed.',schedule,assumptions:['Level 50 natural growth at time zero','Full participation and maximum grades in all activities','No injuries, missed games, retirement or aging costs','All training points allocated perfectly, even fractional bank progress spendable','Apex evolution has unchanged 99 ceilings, so no additional rating scaling'],production:{maxFootball,maxClash,annualOffseason:OFFSEASON_POINTS},individuals:rows.length,trainingNeeded:{min:Math.min(...rows.map(r=>r.trainingNeeded)),max:Math.max(...rows.map(r=>r.trainingNeeded))},bounds,rows};
fs.writeFileSync('docs/task8/m6/apex-resource-bound.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,rows:undefined}));

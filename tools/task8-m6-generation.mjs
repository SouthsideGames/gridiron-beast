#!/usr/bin/env node
// Read-only M6 generation checks. Uses production generation; never changes game settings.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { TEMPER_IDS, NEUTRAL_TEMPERS } from '../src/data/temper.js';
import { createRng } from '../src/core/rng.js';
import { FORMS, POSITIONS } from '../src/data/beast-dex.js';
import { generateIndividual, devProblems } from '../src/franchise/t8/progression.js';
const source = 'f716b02c41c81211d80e7389dc0cefd4c16ae155';
const forms = FORMS.filter(f => f.stage === 0);
const out = { source, sourceTree:'d4e36b76eae24ca7c4aac9fbdc8f13e588f8afd2', scope:'Individual generation only; does not certify franchise pool generation or full-game replay.', manifest:{seed:870006,individuals:100000,formSelection:'uniform across all stage-0 forms',apexEligibleRolls:10000,replaySeeds:[1,100]}, invariants:{checked:0,failures:0,examples:[],byPosition:{}}, apex:{rolls:10000,count:0}, replay:{checked:100,failures:0} };
const rng=createRng(out.manifest.seed);
for(let i=0;i<100000;i++) {
 const form=rng.pick(forms),d=generateIndividual(rng,form.id),p=devProblems(d);
 if(!TEMPER_IDS.includes(d.temper)||(d.apex&&!NEUTRAL_TEMPERS.includes(d.temper)))p.push('ineligible Temper');
 for(const a of Object.keys(d.ref))if(!d.apex&&(d.ref[a]<form.starting[a][0]||d.ref[a]>Math.min(form.starting[a][1],d.potential[a])||d.potential[a]<form.potential[a][0]||d.potential[a]>form.potential[a][1]))p.push(a+': outside form ranges');
 if(form.rarity==='legendary' && d.apex) p.push('legendary Apex');
 if(d.apex && (Object.values(d.ref).some(v=>v<10||v>15)||Object.values(d.potential).some(v=>v!==99))) p.push('Apex range');
 out.invariants.checked++;out.invariants.byPosition[form.position]=(out.invariants.byPosition[form.position]||0)+1;
 if(p.length){out.invariants.failures++;if(out.invariants.examples.length<10)out.invariants.examples.push({i,form:form.id,p});}
}
const eligible=forms.filter(f=>f.rarity!=='legendary'), ar=createRng(870007);
for(let i=0;i<10000;i++)out.apex.count+=Number(generateIndividual(ar,ar.pick(eligible).id).apex);
out.apex.rate=out.apex.count/10000;
// Wilson interval reports sampling uncertainty; no exact-count gate is invented.
const n=10000,p=out.apex.rate,z=1.96,den=1+z*z/n,c=(p+z*z/(2*n))/den,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
out.apex.wilson95=[c-h,c+h];
for(let seed=1;seed<=100;seed++){
 const batch=()=>{const r=createRng(seed);return Array.from({length:100},()=>generateIndividual(r,r.pick(forms).id));};
 if(JSON.stringify(batch())!==JSON.stringify(batch()))out.replay.failures++;
}
out.coverage=POSITIONS.every(p=>out.invariants.byPosition[p]>0);
out.resultHash=createHash('sha256').update(JSON.stringify(out)).digest('hex');
fs.mkdirSync('docs/task8/m6',{recursive:true});fs.writeFileSync('docs/task8/m6/generation.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
process.exitCode=out.invariants.failures||out.replay.failures||!out.coverage?1:0;

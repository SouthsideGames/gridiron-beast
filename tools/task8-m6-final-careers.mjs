#!/usr/bin/env node
// Controlled diagnostics on the adopted production rules. No measurement switches,
// changed generation chance, extra awards or altered AI lineups. Not a real-club study.
import fs from 'node:fs';
import { createRng } from '../src/core/rng.js';
import { generateMonster, syncFromDev } from '../src/data/monsters.js';
import { FORMS, POSITIONS, ATTRIBUTES } from '../src/data/beast-dex.js';
import { generateIndividual, invest, devProblems } from '../src/franchise/t8/progression.js';
import { applyAward, offseason } from '../src/franchise/progression.js';
import { footballAward, clashAward } from '../src/franchise/t8/awards.js';
import * as F from '../src/core/fraction.js';
const schedules={footballOnly:[9,0],mixed:[9,4],humanMaximum:[12,33]};
const count=Number(process.argv.find(x=>x.startsWith('--per-position='))?.split('=')[1]||100);
const outPath=process.argv.find(x=>x.startsWith('--out='))?.slice(6)||'docs/task8/m6/final-controlled-careers.json';
const rows=[];
for(const position of POSITIONS)for(let seed=1;seed<=count;seed++){
 const form=FORMS.find(f=>f.position===position&&f.stage===0&&f.rarity!=='legendary');
 const initial=generateMonster(createRng(seed),{species:form.familyId,position,age:21,yearsPro:0});
 initial.dev=generateIndividual(createRng(seed*131+position.length),form.id,{apex:true});syncFromDev(initial);
 for(const [schedule,[games,clashes]] of Object.entries(schedules)){
  const m=structuredClone(initial),spent=Object.fromEntries(ATTRIBUTES.map(a=>[a,0]));let finished=null;
  const allocate=()=>{while(F.cmp(m.dev.bank,F.ZERO)>0){const open=ATTRIBUTES.filter(a=>m.dev.current[a]<99);if(!open.length)break;
   const a=open.reduce((best,a)=>spent[a]<spent[best]?a:best),points=F.min(m.dev.bank,F.ONE),r=invest(m.dev,m,a,points);spent[a]+=F.toNumber(points)-F.toNumber(r.refunded);
  }syncFromDev(m);};
  for(let year=1;year<=20;year++){
   for(let i=0;i<games+clashes;i++){const award=i<games?footballAward({position,liveSnaps:10,kicks:position==='K'?1:0}):clashAward({});applyAward(m,award,createRng(1),{autoEvolve:true});allocate();}
   // End of the fifteenth playing season is measured before that season's offseason.
   if(ATTRIBUTES.every(a=>m.dev.current[a]===99)){finished=year;break;}
   offseason([m],createRng(year),{autoAllocate:false});allocate();
  }
  if(devProblems(m.dev).length)throw Error('development invariant');
  rows.push({position,seed,schedule,finished});
 }
}
const summary=Object.fromEntries(Object.keys(schedules).map(schedule=>{const r=rows.filter(x=>x.schedule===schedule),times=r.map(x=>x.finished??Infinity).sort((a,b)=>a-b);return [schedule,{careers:r.length,by10:r.filter(x=>x.finished&&x.finished<=10).length,by12:r.filter(x=>x.finished&&x.finished<=12).length,by15:r.filter(x=>x.finished&&x.finished<=15).length,median:times[Math.floor(times.length/2)],earliest:times[0],latest:times.at(-1)}];}));
const out={scope:'Controlled: guaranteed participation, neutral grades, no injuries, equal training investment, end-of-season readings before offseason. Not actual club careers or a phone test.',schedules,summary,rows};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(summary));

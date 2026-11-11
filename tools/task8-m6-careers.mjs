#!/usr/bin/env node
// Controlled production-reward/aging diagnostic. No fabricated game telemetry or mastery credits.
// This is NOT a fully played career: neutral grades, guaranteed selection, no injuries or missed games.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRng,hashString } from '../src/core/rng.js';
import { ATTRIBUTES,POSITIONS,FORMS } from '../src/data/beast-dex.js';
import { POSITION_WEIGHTS } from '../src/data/personnel.js';
import { generateMonster,syncFromDev,monsterOverall } from '../src/data/monsters.js';
import { generateIndividual,invest,devProblems } from '../src/franchise/t8/progression.js';
import { allocateTraining } from '../src/franchise/t8/career.js';
import { applyAward,offseason } from '../src/franchise/progression.js';
import { chanceFor } from '../src/franchise/retirement.js';
import { footballAward,clashAward } from '../src/franchise/t8/awards.js';
import * as F from '../src/core/fraction.js';
const DIR='docs/task8/m6',source='f716b02c41c81211d80e7389dc0cefd4c16ae155';
const manifest={source,kind:'controlled career diagnostic; not fully played careers or mastery pacing',positions:POSITIONS,seeds:[1,100],creationAge:21,seasons:20,grade:0,injuries:false,selection:'full participation in every scheduled activity; no playoff advancement simulated',schedules:{footballOnly:{football:9,clash:0},mixed:{football:9,clash:4},maximum:{football:12,clash:33}},maximumExplanation:'nine regular games plus three playoffs; nine Tuesday encounters, opening and OT in all twelve games; assumes all conditional opportunities occur, no extra activity invented',ordinaryGeneration:'production generateMonster, roster channel family share, quality 56, age 21, yearsPro 0, Apex rolls disabled for ordinary cohort',apexGeneration:'100 per position, uniform nonlegendary stage-0 forms, forced Apex only; independent 10–15 ratings and neutral Temper from production generator',policies:{positionFocused:'highest positional OVR weight with headroom, attribute-order tie; never train unused attributes',even:'one banked point at a time to the open attribute with least cumulative investment, attribute-order tie; persistent lifetime investment ledger, includes fractional points',ai:'production allocateTraining without club-identity preference'},retirement:'production chanceFor before offseason aging, native save, signed starter, real peak OVR, no injury history; all generated individuals retained in denominators',median:'50th-percentile nearest rank over whole cohort; retirement/nonattainment = Infinity, reported as null when median not reached',ceilings:'all twelve current ratings simultaneously at their own individual ceilings, observation window seasons 1–8 and 1–20, retired individuals remain in denominator',rng:'generation hashString(m6-cohort|position|seed), decline hashString(decline|position|seed|year), retirement hashString(retire|position|seed|year); matched across all policies/schedules',apexSchedule:'mixed; additional maximum schedule as sensitivity',settingsChanged:false};
fs.mkdirSync(DIR,{recursive:true});
fs.writeFileSync(`${DIR}/career-manifest.json`,JSON.stringify(manifest,null,2)+'\n'); // frozen before outcome calculation
const rows=[],issues=[];
const cols=['kind','position','seed','schedule','policy','temper','initialForm','initialHash','hit50','all99Season','retiredAfterSeason','retirementAge','allCeilBy8','allCeilEver','level8','level15','finalLevel','finalAge','pointsEarned','pointsInvested','bank','naturalTotal','trainedTotal','lossTotal','finalRatings','finalCeilings'];
const sum=o=>Object.values(o).reduce((n,v)=>n+v,0);
function allocate(m,policy,spent){
 const d=m.dev;
 if(policy==='ai'){for(const e of allocateTraining(d,m))spent[e.attr]+=F.toNumber(e.points);syncFromDev(m);return;}
 let guard=0;
 while(F.cmp(d.bank,F.ZERO)>0&&guard++<10000){
  const open=ATTRIBUTES.filter(a=>d.current[a]<d.potential[a]&&(policy!=='positionFocused'||POSITION_WEIGHTS[m.position][a]));
  if(!open.length)break;
  const a=open.reduce((best,a)=>policy==='even'?(spent[a]<spent[best]-1e-12?a:best):((POSITION_WEIGHTS[m.position][a]||0)>(POSITION_WEIGHTS[m.position][best]||0)?a:best));
  const points=F.min(d.bank,F.ONE);const n=F.toNumber(points);const result=invest(d,m,a,points);spent[a]+=n-F.toNumber(result.refunded);
 }
 if(guard>=10000)throw Error('allocation did not terminate');syncFromDev(m);
}
function career(initial,{kind,position,seed,schedule,policy}){
 const m=structuredClone(initial),d=m.dev,spent=Object.fromEntries(ATTRIBUTES.map(a=>[a,0]));
 const initialForm=d.form,initialHash=createHash('sha256').update(JSON.stringify(d)).digest('hex').slice(0,16);
 let hit50=null,all99Season=null,retired=null,retirementAge=null,all8=false,allEver=false,level8=null,level15=null,earned=0;
 const cfg=manifest.schedules[schedule];
 for(let year=1;year<=20;year++){
  for(let i=0;i<cfg.football+cfg.clash;i++){
   const award=i<cfg.football?footballAward({position,liveSnaps:10,kicks:position==='K'?1:0,gradeAdj:0}):clashAward({gradeAdj:0});
   earned+=F.toNumber(award.training);
   applyAward(m,award,createRng(1),{autoSpend:false,autoEvolve:true});allocate(m,policy,spent);
   if(m.level===50&&hit50===null)hit50=year;
   const all=ATTRIBUTES.every(a=>d.current[a]===d.potential[a]);allEver ||=all;if(kind==='apex'&&all&&all99Season===null)all99Season=year;if(year<=8)all8 ||=all;
  }
  // Retirement is chosen before age advancement, as in the production lifecycle.
  m.peakOvr=Math.max(m.peakOvr||0,monsterOverall(m));
  const p=kind==='apex'?0:chanceFor({aging:{native:true}},m,{year,starter:true,s:null});
  if(createRng(hashString(`retire|${position}|${seed}|${year}`)).next()<p){retired=year;retirementAge=m.age;break;}
  offseason([m],createRng(hashString(`decline|${position}|${seed}|${year}`)),{autoAllocate:false});earned+=2;allocate(m,policy,spent);
  const all=ATTRIBUTES.every(a=>d.current[a]===d.potential[a]);allEver ||=all;if(kind==='apex'&&all&&all99Season===null)all99Season=year;if(year<=8)all8 ||=all;
  if(year===8)level8=m.level;if(year===15)level15=m.level;
  const pbs=devProblems(d);if(pbs.length&&issues.length<20)issues.push({kind,position,seed,schedule,policy,year,pbs});
 }
 const r=[kind,position,seed,schedule,policy,d.temper,initialForm,initialHash,hit50,all99Season,retired,retirementAge,Number(all8),Number(allEver),level8,level15,m.level,m.age,Math.round(earned*10000)/10000,Math.round((earned-F.toNumber(d.bank)-F.toNumber(d.bar))*10000)/10000,F.toNumber(d.bank),sum(d.natural),sum(d.trained),sum(d.loss),ATTRIBUTES.map(a=>d.current[a]),ATTRIBUTES.map(a=>d.potential[a])];rows.push(r);
}
for(const position of POSITIONS){
 for(let seed=1;seed<=100;seed++){
  const initial=generateMonster(createRng(hashString(`m6-cohort|${position}|${seed}`)),{position,quality:56,age:21,yearsPro:0,apexRoll:false,id:`m6-${position}-${seed}`});
  for(const schedule of Object.keys(manifest.schedules))for(const policy of Object.keys(manifest.policies))career(initial,{kind:'ordinary',position,seed,schedule,policy});
  const rng=createRng(hashString(`m6-apex|${position}|${seed}`)),forms=FORMS.filter(f=>f.position===position&&f.stage===0&&f.rarity!=='legendary');
  const a=structuredClone(initial);a.dev=generateIndividual(rng,rng.pick(forms).id,{apex:true});a.species=a.dev.form.split(':')[0];a.xp=0;syncFromDev(a);
  for(const schedule of ['mixed','maximum'])career(a,{kind:'apex',position,seed,schedule,policy:'even'});
 }
 console.error(`career diagnostic: ${position} complete`);
}
const ix=Object.fromEntries(cols.map((v,i)=>[v,i]));
const records=rows.map(r=>Object.fromEntries(cols.map((c,i)=>[c,r[i]])));
const stats=rs=>{const times=rs.map(r=>r.hit50??Infinity).sort((a,b)=>a-b);const median=times[Math.ceil(times.length/2)-1];return {n:rs.length,medianSeason50:Number.isFinite(median)?median:null,reach50By8:rs.filter(r=>r.hit50!==null&&r.hit50<=8).length/rs.length,retired:rs.filter(r=>r.retiredAfterSeason!==null).length,retiredBefore50:rs.filter(r=>r.retiredAfterSeason!==null&&r.hit50===null).length,allCeilBy8:rs.filter(r=>r.allCeilBy8).length/rs.length,allCeilEver:rs.filter(r=>r.allCeilEver).length/rs.length,apexAll99By15:rs[0]?.kind==='apex'?rs.filter(r=>r.all99Season!==null&&r.all99Season<=15).length/rs.length:null,meanFinalLevel:rs.reduce((n,r)=>n+r.finalLevel,0)/rs.length,meanTrainingEarned:rs.reduce((n,r)=>n+r.pointsEarned,0)/rs.length};};
// Apex never loses ratings; record at 15 explicitly rather than treating season-20 attainment as season-15 attainment.
const groups={};for(const r of records){const k=[r.kind,r.schedule,r.policy].join('/');(groups[k]||=[]).push(r);}
const summary={source,manifestSHA256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),columns:cols,attributes:ATTRIBUTES,individualRuns:rows.length,invariantIssues:issues,groups:Object.fromEntries(Object.entries(groups).map(([k,rs])=>[k,{...stats(rs),positions:Object.fromEntries(POSITIONS.map(p=>[p,stats(rs.filter(r=>r.position===p))])),tempers:Object.fromEntries([...new Set(rs.map(r=>r.temper))].sort().map(t=>[t,stats(rs.filter(r=>r.temper===t))]))}])),limitations:['Controlled activity awards, not engine-produced grades/participation or fully played careers','No mastery credit inferred or awarded','No injury absences, roster competition, acquisition cost, contracts or Basic encounter XP bonus modeled','maximum is an opportunity ceiling; all overtime and playoff opportunities conditional, not typical','Apex season-15 attainment reported separately from season-20 final ratings']};
fs.writeFileSync(`${DIR}/career-individuals.json`,JSON.stringify({columns:cols,attributes:ATTRIBUTES,rows}));
fs.writeFileSync(`${DIR}/career-summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({runs:rows.length,issues:issues.length,groups:Object.fromEntries(Object.entries(summary.groups).map(([k,v])=>[k,{median:v.medianSeason50,by8:v.reach50By8,allCeil:v.allCeilEver}]))}));

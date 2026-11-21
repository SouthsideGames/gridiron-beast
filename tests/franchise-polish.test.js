import test from 'node:test';
import assert from 'node:assert/strict';
import {createFranchise,hireDefaultStaff,pointsLocked,startingPlan} from '../src/franchise/franchise.js';
import {polishState,toggleShortlist,shortlisted,draftScope,savePreset,lineupPresetPreview,previewInvestment,commitInvestment,replacementFor,setBrowsePreferences,browsePreferences,matchesSearch} from '../src/franchise/polish.js';
import {getPlanDraft,storePlanDraft,returnSummary,offseasonTracker,offerResolutionText} from '../src/ui/polish.js';
import {buildDepthChart,lineupProblems} from '../src/franchise/roster.js';
import {matchLogMatches} from '../src/ui/match-log-filter.js';
import {activityPaused} from '../src/ui/activity.js';
import * as FR from '../src/core/fraction.js';
const base=createFranchise({owner:{first:'Polish',last:'Test'},club:'Ember City Beasts',seed:312});hireDefaultStaff(base);
const fresh=()=>structuredClone(base);
test('shortlists persist public identities only and are scoped to franchise and draft class',()=>{
 const f=fresh(),other=fresh(),m=f.draft.class[0],scope=draftScope(f),before=f.rngState;
 assert.equal(polishState(f).shortlist,undefined);assert.equal(toggleShortlist(f,scope,m),true);
 assert.deepEqual(Object.keys(polishState(f).shortlist[0]).sort(),['id','name','position','scope']);
 assert.equal(shortlisted(JSON.parse(JSON.stringify(f)),scope,m.id),true);
 assert.equal(shortlisted(other,scope,m.id),false);assert.equal(shortlisted(f,'draft:99',m.id),false);
 assert.equal(toggleShortlist(f,scope,m),false);assert.equal(shortlisted(f,scope,m.id),false);assert.equal(f.rngState,before);
});
test('shortlist identity uses beast IDs, handles same names and has a bounded size',()=>{
 const f=fresh();for(let i=0;i<100;i++)assert.equal(toggleShortlist(f,'market',{id:String(i),name:'Same',position:'WR'}),true);
 assert.equal(toggleShortlist(f,'market',{id:'overflow',name:'Same',position:'WR'}),null);
 assert.equal(toggleShortlist(f,'market',{id:'1'}),false);assert.equal(polishState(f).shortlist.length,99);
});
test('search and browsing preferences persist without crossing franchises or screens',()=>{
 const f=fresh(),other=fresh();setBrowsePreferences(f,'draft',{query:'Shard',position:'OL'});
 setBrowsePreferences(f,'draft',{sort:'known'});
 assert.deepEqual(browsePreferences(JSON.parse(JSON.stringify(f)),'draft'),{query:'Shard',position:'OL',sort:'known'});
 assert.deepEqual(browsePreferences(other,'draft'),{});assert.deepEqual(browsePreferences(f,'famarket'),{});
 assert.equal(matchesSearch('Shardok',' SHARD '),true);assert.equal(matchesSearch('Shardok','Dust'),false);
});
test('point planning runs real Temper spending on a copy; cancellation leaves all state and RNG unchanged',()=>{
 const f=fresh(),m=f.roster[0];m.dev.bank=FR.frac(5);m.points=5;
 const before=JSON.stringify(f),a=Object.keys(m.dev.current).find(a=>m.dev.current[a]<m.dev.potential[a]);assert.ok(a);
 const pv=previewInvestment(f,m.id,[a,a]);assert.equal(pv.ok,true);assert.equal(JSON.stringify(f),before);
 assert.ok(FR.cmp(pv.monster.dev.bank,m.dev.bank)<0);
 assert.equal(commitInvestment(f,pv,{locked:pointsLocked(f)}).ok,true);assert.ok(FR.cmp(m.dev.bank,FR.frac(5))<0);
 assert.equal(f.rngState,JSON.parse(before).rngState);
 assert.equal(commitInvestment(f,pv).ok,false,'cannot confirm the same preview twice');
});
test('point preview rejects invalid/over-budget choices; stale, locked or tampered previews cannot change the team',()=>{
 const f=fresh(),m=f.roster[0];m.dev.bank=FR.frac(2);m.points=2;
 const a=Object.keys(m.dev.current).find(a=>m.dev.current[a]<m.dev.potential[a]);
 assert.equal(previewInvestment(f,m.id,['not-an-attribute']).ok,false);
 assert.equal(previewInvestment(f,m.id,Array(20).fill(a)).ok,false);
 const pv=previewInvestment(f,m.id,[a]);assert.equal(pv.ok,true);
 const before=JSON.stringify(f);assert.equal(commitInvestment(f,pv,{locked:true}).ok,false);assert.equal(JSON.stringify(f),before);
 pv.monster.attributes[a]=999;assert.equal(commitInvestment(f,pv).ok,true);assert.ok(m.attributes[a]<=99,'confirmation replays valid spending instead of trusting preview values');
 const another=previewInvestment(f,m.id,[]);f.season.day++;assert.equal(commitInvestment(f,another).ok,false);
});
test('lineup presets are named, bounded, scoped to the club and preview legal changes without applying them',()=>{
 const f=fresh(),data={manual:f.lineupManual||{},depth:Object.fromEntries(Object.entries(buildDepthChart(f.roster,f.lineupManual,f.depth)).map(([slot,id])=>[f.roster.find(m=>m.id===id).position,[]]))};
 // Preserve full position ordering exactly as the roster uses it.
 data.depth={};for(const m of f.roster)(data.depth[m.position]||=[]).push(m.id);
 const before=JSON.stringify([f.depth,f.lineupManual,f.rngState]);assert.equal(savePreset(f,'lineup','  My Team  ',data),true);
 const p=polishState(f).presets.lineup[0],pv=lineupPresetPreview(f,p);assert.equal(p.name,'My Team');assert.equal(pv.ok,true);
 assert.deepEqual(lineupProblems(f.roster,pv.chart),[]);assert.equal(JSON.stringify([f.depth,f.lineupManual,f.rngState]),before);
 assert.equal(lineupPresetPreview({...f,club:'Different'},p).ok,false);
 for(let i=1;i<5;i++)assert.equal(savePreset(f,'lineup',String(i),data),true);
 assert.equal(savePreset(f,'lineup','sixth',data),false);assert.equal(savePreset(f,'lineup','My Team',data),true);
});
test('lineup preset review reports lost entries and refuses an illegal roster',()=>{
 const f=fresh(),depth={};for(const m of f.roster)(depth[m.position]||=[]).push(m.id);
 savePreset(f,'lineup','Original',{manual:{},depth});const p=polishState(f).presets.lineup[0];
 f.roster=f.roster.filter(m=>m.position!=='QB');const pv=lineupPresetPreview(f,p);
 assert.equal(pv.ok,false);assert.ok(pv.missing.includes('QB'));assert.ok(pv.gone.length);
});
test('unfinished game-plan selections survive serialization/detail navigation but do not commit or cross a week',()=>{
 const f=fresh();f.season.day=4;
 const committed=JSON.stringify(f.week.plan),rng=f.rngState;
 const o=startingPlan(f,'offense'),d=startingPlan(f,'defense');o.pop();storePlanDraft(f,{offense:new Set(o),defense:new Set(d)});
 assert.deepEqual(getPlanDraft(JSON.parse(JSON.stringify(f))).offense,o);assert.equal(JSON.stringify(f.week.plan),committed);assert.equal(f.rngState,rng);
 f.season.week++;assert.equal(getPlanDraft(f).offense.length,startingPlan(f,'offense').length);
});
test('comparison chooses an actual replaceable starter at multi-starter positions rather than automatically the best',()=>{
 const f=fresh(),candidate={id:'prospect',position:'WR'};const chart=buildDepthChart(f.roster,f.lineupManual,f.depth);
 const chosen=replacementFor(f,candidate);assert.ok(chosen);assert.equal(chosen.position,'WR');assert.ok(Object.values(chart).includes(chosen.id));
 assert.equal(chosen.injury,null);
});
test('match-log filters use recorded fields, work with translated prose and do not alter entries',()=>{
 const entries=[{kind:'score',text:'zz'},{kind:'play',result:'interception',text:'zz'},{kind:'injury',text:'zz'},{kind:'foresight_mark',ability:'PSY-03-F',text:'zz'},{kind:'play',result:'tackle',text:'Touchdown injury fumble ability'}];
 const before=JSON.stringify(entries);
 for(const [i,filter] of ['scoring','turnovers','injuries','abilities'].entries())assert.deepEqual(entries.filter(e=>matchLogMatches(e,filter)),[entries[i]]);
 assert.equal(entries.filter(e=>matchLogMatches(e,'all')).length,5);assert.equal(JSON.stringify(entries),before);
});
test('hidden pages throttle activity and foreground pages resume without a confirmation',()=>{
 const previous=globalThis.document;globalThis.document={hidden:false};
 try{assert.equal(activityPaused(),false);globalThis.document.hidden=true;assert.equal(activityPaused(),true);globalThis.document.hidden=false;assert.equal(activityPaused(),false);}
 finally{if(previous)globalThis.document=previous;else delete globalThis.document;}
});
test('return summary and named offer preview read current state without changing it',()=>{
 const f=fresh(),before=JSON.stringify(f);assert.match(returnSummary(f),/Week 1/);assert.match(returnSummary(f),/Next:/);
 assert.equal(offseasonTracker(f),'');
 const m=f.roster[0];assert.match(offerResolutionText(f,[{mid:m.id,salary:23000,years:2}]),new RegExp(m.name));assert.equal(JSON.stringify(f),before);
});
test('planning state survives the real franchise export/import path without changing RNG',async()=>{
 const {exportJson,importJson}=await import('../src/franchise/save.js');const f=fresh(),rng=f.rngState;
 toggleShortlist(f,draftScope(f),f.draft.class[0]);setBrowsePreferences(f,'draft',{query:'test'});
 savePreset(f,'plan','Favorites',{offense:startingPlan(f,'offense'),defense:startingPlan(f,'defense')});
 const loaded=importJson(exportJson(f));const restored=loaded.franchise||loaded;
 assert.deepEqual(restored.polish,f.polish);assert.equal(restored.rngState,rng);
});

test('comparison rows show a candidate salary only where the caller\'s card does; unknown values stay ???', async () => {
 const { comparisonRows } = await import('../src/ui/polish.js');
 const f=fresh(),m=structuredClone(f.roster.find(x=>x.position==='WR')),against=f.roster.find(x=>x.position==='WR'&&x.id!==m.id);m.id='recruit';m.salary=31234;
 const salary=(opts)=>comparisonRows(f,m,against,opts).find(r=>/salary/i.test(r[0]))[1];
 // A Tuesday recruit with the overall revealed but not the potential: his card hides the salary, so must the comparison.
 assert.equal(salary({ovrKnown:true,attrsKnown:false,potentialKnown:false,salaryKnown:false}),'???');
 assert.match(salary({ovrKnown:true,attrsKnown:true,potentialKnown:true,salaryKnown:true}),/31,234/);
 assert.match(salary({ovrKnown:true,salary:22400}),/22,400/,'an explicit price (rookie deal, ask, typed offer) is shown');
 assert.equal(salary({ovrKnown:false}),'???','by default a salary follows the overall');
 const rows=comparisonRows(f,m,against,{ovrKnown:false,attrsKnown:false,potentialKnown:false});
 for(const r of rows.filter(r=>!/age|fatigue/i.test(r[0])))assert.equal(r[1],'???',`${r[0]} leaks`);
});
test('the shared polish listener claims only its own actions, leaving a screen\'s Review and Remove to that screen', async () => {
 const { POLISH_ROOT_ACTIONS } = await import('../src/ui/polish.js');
 for (const own of ['compare','shortlist','go','points','clear-filters']) assert.ok(POLISH_ROOT_ACTIONS.has(own), own);
 for (const screenAction of ['resume','shortlist-open','shortlist-remove','point-add','point-confirm','preset-load']) assert.ok(!POLISH_ROOT_ACTIONS.has(screenAction), screenAction);
});
test('a quick second tap at the spot that closed a sheet is dropped; other taps go through', async () => {
 const prev=globalThis.document;globalThis.document={querySelector:()=>null};
 try{
  const { swallowsRepeatTap } = await import('../src/ui/dom.js');
  const last={x:200,y:800,t:1000},tapAt=(x,y,extra={})=>({clientX:x,clientY:y,target:{closest:()=>null},...extra});
  assert.equal(swallowsRepeatTap(tapAt(205,795),last,1200),true,'the double tap\'s second half');
  assert.equal(swallowsRepeatTap(tapAt(205,795),last,1400),false,'a later deliberate tap');
  assert.equal(swallowsRepeatTap(tapAt(60,300),last,1200),false,'a tap elsewhere');
  assert.equal(swallowsRepeatTap(tapAt(0,0),last,1200),false,'keyboard activation has no position');
  assert.equal(swallowsRepeatTap(tapAt(205,795),null,1200),false);
  globalThis.document={querySelector:()=>({})};assert.equal(swallowsRepeatTap(tapAt(205,795),last,1200),false,'never while another sheet is open');
 }finally{if(prev)globalThis.document=prev;else delete globalThis.document;}
});
test('a short-position warning leads to a slot someone healthy can fill, otherwise to the market at that position', async () => {
 const { shortPositionRoute } = await import('../src/franchise/polish.js');
 const hurt={weeks:3,name:'test',severity:'moderate'},need={position:'CB',status:'short'};
 const h=fresh();const before=JSON.stringify(h);
 assert.deepEqual(shortPositionRoute(h,need,'scout'),{screen:'assign',params:{slot:'CB1'}},'a healthy CB: his slot');
 assert.equal(JSON.stringify(h),before,'reading a route changes nothing');
 // Nobody healthy can play the position (every beast hurt): an empty assignment list would be a dead end.
 const g=fresh();for(const m of g.roster)m.injury=hurt;g.freeAgency={v:1};
 assert.deepEqual(shortPositionRoute(g,need,'scout'),{screen:'famarket',params:{},browse:{position:'CB'}});
 delete g.freeAgency;assert.deepEqual(shortPositionRoute(g,need,'scout'),{screen:'scout',params:{}},'no year-round market: the warning\'s own screen');
 assert.deepEqual(shortPositionRoute(h,null,'roster'),{screen:'roster',params:{}});
});

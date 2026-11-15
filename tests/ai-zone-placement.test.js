import {test} from 'node:test';
import assert from 'node:assert/strict';
import {autoZoneOption,selectedZoneOption,setZoneChoice,zoneKey} from '../src/sim/t8/zone-planning.js';
import {presnapFields} from '../src/ui/fx/match-fx.js';
import {lineup} from './tools/lineup.js';
import * as R from '../src/sim/rules.js';
const options=['left','middle','right'].map(id=>({id,overlaps:[]}));
const spec={owner:'zone-owner',ability:'MET-05-F',type:'Metal'};
test('AI can select every legal lane; choices vary across snaps while remaining replay/save stable',()=>{
 const seen=new Set();
 for(let playCount=0;playCount<100;playCount++){
  const state={seed:17,playCount,possession:'home',quarter:1,t8:{}};
  const before=JSON.stringify(state),a=selectedZoneOption(state,spec,options);
  assert.equal(selectedZoneOption(structuredClone(state),spec,options).id,a.id);
  assert.equal(JSON.stringify(state),before);seen.add(a.id);
 }
 assert.deepEqual([...seen].sort(),['left','middle','right']);
});
test('preferred overlaps remain optional, and a player choice takes precedence over the coach',()=>{
 const choices=[...options,{id:'overlap:water',overlaps:[{name:'Steam'}]}];const seen=new Set();
 for(let seed=1;seed<=100;seed++)seen.add(autoZoneOption(choices,spec,null,{seed,playCount:0,possession:'home',quarter:1}).id);
 assert.equal(seen.size,4);
 const state={seed:7,playCount:0,possession:'home',quarter:1,t8:{}};
 setZoneChoice(state,zoneKey(spec),'right');assert.equal(selectedZoneOption(state,spec,choices).id,'right');
});
test('AI independently varies both parts of a multi-zone ability',()=>{
 const pairs=new Set();
 for(let seed=1;seed<=100;seed++){
  const state={seed,playCount:4,possession:'away',quarter:2};
  const picks=[0,1].map(placementIndex=>selectedZoneOption(state,{...spec,placementIndex},options).id);
  pairs.add(picks.join('/'));
 }
 assert.equal(pairs.size,9);
});
test('both clubs see their own pending zones but enemy placement only becomes public after the snap',()=>{
 for(const possession of ['home','away']){
 const teams={home:lineup(11,60),away:lineup(12,60)};
 for(const side of ['home','away'])for(const unit of ['offense','defense'])for(const[slot,m]of Object.entries(teams[side][unit]))Object.assign(m,{id:`${side}_${unit}_${slot}`,species:null,type:'Dragon'});
 const state={seed:7,phase:'scrimmage',possession,quarter:1,playCount:0,ballOn:35,ballLat:0,t8:{status:{},fields:{list:[],pending:[],seq:0}}};
 for(const side of ['home','away']){const off=side===possession;state.t8.fields.pending.push({owner:teams[side][off?'offense':'defense'][off?'TE':'FS'].id,ownerTeam:side,side:off?'off':'def',ability:'MET-05-F',type:'Metal',width:8,length:4,lbDepth:5,lifetime:3,clock:off?'ownerOffense':'ownerDefense'});}
 const calls={offense:'inside_zone',defense:'cover_3'};
 for(const viewerSide of ['home','away']){
  const preview=presnapFields(state,teams,calls,{viewerSide});assert.equal(preview.length,1);assert.equal(preview[0].field.ownerTeam,viewerSide);
 }
 // After creation, public terrain is visible to both teams, even when its owner is the enemy.
 state.t8.fields.list=[{id:'old',ownerTeam:'away',owner:'old-owner',ability:'MET-05-F',type:'Metal',yard:[39,43],lat:[-4,4],remaining:2,createdAt:0}];
 const shown=presnapFields(state,teams,calls,{viewerSide:'home'});assert.ok(shown.some(x=>x.field.id==='old'));
 }
});

test('multi-zone selections are independent and every zone ability offers placement controls',async()=>{
 const {stageScenario}=await import('../src/sim/abilities/review.js');
 const {SCENARIOS}=await import('../src/sim/abilities/review-scenarios.js');
 const {familyById}=await import('../src/data/beast-dex.js');
 const {contractOf}=await import('../src/sim/abilities/registry.js');
 const {zonePlans,zonePlannerHtml}=await import('../src/ui/zone-planner.js');
 for(const family of ['thornkit','windlynx']){
  const fam=familyById(family),sc={...SCENARIOS[family],prime:()=>family==='thornkit'?{cd:0,token:true}:{charges:2}};
  const G=stageScenario({sc,fam,contract:contractOf(family),form:`${family}:0`,mastery:0,seed:1});
  Object.assign(G.state,{phase:'scrimmage',possession:family==='thornkit'?'home':'away',ballOn:35,ballLat:0,down:1,toGo:10});
  const plans=zonePlans(G.state,G.teams,'home','quick_slants','cover_3').filter(p=>p.owner===G.subject.id);
  assert.equal(plans.length,2);assert.notEqual(plans[0].key,plans[1].key);
  setZoneChoice(G.state,plans[0].key,'left');setZoneChoice(G.state,plans[1].key,'right');
  const ready=zonePlans(G.state,G.teams,'home','quick_slants','cover_3').filter(p=>p.owner===G.subject.id);
  assert.equal(ready[0].picked,'left');assert.equal(ready[1].picked,'right');
  assert.match(zonePlannerHtml(ready),/Zone 1/);assert.match(zonePlannerHtml(ready),/Zone 2/);
  const {sim}=R.runScrimmagePlay(G.state,G.teams,'quick_slants','cover_3');
  const fields=sim.fields.filter(f=>f.owner===G.subject.id);
  assert.equal(fields.length,2);assert.ok(fields.some(f=>f.lat[1]<0));assert.ok(fields.some(f=>f.lat[0]>0));
 }
 const {ZONE_IDS,canPlaceZone}=await import('../src/sim/t8/zone-planning.js');
 for(const id of ZONE_IDS)assert.equal(canPlaceZone(id),true,id);
});

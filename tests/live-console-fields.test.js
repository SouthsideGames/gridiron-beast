import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldsForNextSnap, prepareFieldsForSnap, anchorWhistleFields, clearFieldsOnNextSnap, createPending } from '../src/sim/t8/field-runtime.js';
import { PLAYABLE } from '../src/sim/t8/fields.js';
import { presnapFields } from '../src/ui/fx/match-fx.js';
import * as R from '../src/sim/rules.js';
import { lineup } from './tools/lineup.js';

const zone=(patch={})=>({id:'F1',type:'Nature',owner:'h_TE',ownerTeam:'home',ability:'NAT-01-F',yard:[40,44],lat:[-7,-3],remaining:3,clock:'ownerOffense',createdThisPlay:false,...patch});
const state=(possession='home')=>({phase:'scrimmage',possession,ballOn:35,ballLat:0,rngState:123,t8:{status:{},fields:{seq:1,list:[zone()],pending:[]}}});
test('terrain follows gains and losses in both directions only when the next snap is prepared',()=>{
  for(const side of ['home','away']){
    const s=state(side);prepareFieldsForSnap(s);const original=structuredClone(s.t8.fields.list[0]);
    s.ballOn=50;assert.deepEqual(s.t8.fields.list[0],original);
    prepareFieldsForSnap(s);
    assert.deepEqual(s.t8.fields.list[0].yard,original.yard.map(y=>y+(side==='home'?15:-15)));
    assert.deepEqual(s.t8.fields.list[0].lat,original.lat);assert.equal(s.t8.fields.list[0].remaining,3);
    s.ballOn=30;prepareFieldsForSnap(s);
    assert.deepEqual(s.t8.fields.list[0].yard,original.yard.map(y=>y+(side==='home'?-5:5)));
  }
});
test('both teams zones and removed footprints preserve lanes, owner and remaining plays',()=>{
  const s=state();s.t8.fields.list.push(zone({id:'F2',ownerTeam:'away',type:'Fire',yard:[46,50],lat:[5,9],holes:[{yard:[47,49],lat:[6,8]}]}));
  prepareFieldsForSnap(s);s.ballOn=45;s.ballLat=2;prepareFieldsForSnap(s);
  assert.deepEqual(s.t8.fields.list.map(f=>f.yard),[[50,54],[56,60]]);
  assert.deepEqual(s.t8.fields.list.map(f=>f.lat),[[-5,-1],[7,11]]);
  assert.deepEqual(s.t8.fields.list[1].holes,[{yard:[57,59],lat:[8,10]}]);
  assert.equal(s.t8.fields.list[1].ownerTeam,'away');assert.equal(s.t8.fields.list[1].remaining,3);
});
test('boundaries preserve size and moving back restores the original placement offset',()=>{
  const s=state();s.t8.fields.list=[zone({yard:[95,105],lat:[20,26]})];prepareFieldsForSnap(s);
  s.ballOn=95;s.ballLat=12;prepareFieldsForSnap(s);
  const f=s.t8.fields.list[0];assert.equal(f.yard[1]-f.yard[0],10);assert.equal(f.lat[1]-f.lat[0],6);
  assert.ok(f.yard[1]<=PLAYABLE.yardMax);assert.ok(f.lat[1]<=PLAYABLE.latMax);
  s.ballOn=35;s.ballLat=0;prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list[0].yard,[95,105]);assert.deepEqual(s.t8.fields.list[0].lat,[20,26]);
});
test('projection is read-only and repeated preparation and reload do not drift or spend RNG',()=>{
  const s=state();prepareFieldsForSnap(s);s.ballOn=43;
  const before=JSON.stringify(s),projected=fieldsForNextSnap(s);assert.equal(JSON.stringify(s),before);
  assert.deepEqual(projected,fieldsForNextSnap(s));const saved=JSON.parse(before);prepareFieldsForSnap(saved);
  const once=JSON.stringify(saved);prepareFieldsForSnap(saved);assert.equal(JSON.stringify(saved),once);
  assert.deepEqual(saved.t8.fields.list,projected.list);assert.equal(saved.rngState,123);
});
test('turnover leaves live/replay terrain intact, clears both clubs\' field terrain next snap and keeps banked creations',()=>{
  const s=state();s.t8.fields.list.push(zone({id:'F2',ownerTeam:'away',type:'Fire'}));s.t8.fields.pending.push({owner:'a_FS',type:'Fire'});
  prepareFieldsForSnap(s);const replay=structuredClone(s.t8.fields.list);clearFieldsOnNextSnap(s);
  assert.equal(s.t8.fields.list.length,2);s.possession='away';s.ballOn=60;
  assert.deepEqual(fieldsForNextSnap(s).list,[]);assert.equal(s.t8.fields.list.length,2);
  prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list,[]);assert.deepEqual(s.t8.fields.pending,[{owner:'a_FS',type:'Fire'}],'a banked creation waits for its own snap (owner decision 2026-11-18)');
  assert.equal(replay.length,2);assert.equal(replay[1].type,'Fire');
});
test('a possession change clears terrain even if an older caller did not flag it explicitly',()=>{
  const s=state();prepareFieldsForSnap(s);s.possession='away';prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list,[]);
});
test('whistle terrain is anchored at the new spot and is not advanced twice',()=>{
  const s=state();prepareFieldsForSnap(s);s.ballOn=50;s.t8.fields.list.push(zone({id:'F2',yard:[49,53],createdThisPlay:true}));
  anchorWhistleFields(s);prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list[1].yard,[49,53]);
  s.ballOn=55;prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list[1].yard,[54,58]);
});
test('new snap terrain keeps its chosen offset on subsequent snaps',()=>{
  const s=state();s.t8.fields.list=[];prepareFieldsForSnap(s);
  s.t8.fields.pending=[{owner:'h_TE',ability:'NAT-01-F',type:'Nature',lifetime:3,clock:'ownerOffense'}];
  const made=createPending(s.t8,{onField:new Set(['h_TE']),playIndex:0,place:()=>({centerLat:-5,yardFrom:40,yardTo:44,width:4})});
  assert.deepEqual(made[0].followLOS,{yard:[5,9],lat:[-7,-3]});s.ballOn=45;prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list[0].yard,[50,54]);
});
test('legacy zones adopt their current position once and kick phases do not reposition terrain',()=>{
  const s=state();s.phase='kickoff';prepareFieldsForSnap(s);assert.equal(s.t8.fields.snap,undefined);
  s.phase='scrimmage';s.ballOn=50;prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list[0].yard,[40,44]);
  s.ballOn=55;prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list[0].yard,[45,49]);
});
function game(){
  const club=(side,seed)=>{const t=lineup(seed,60);for(const unit of ['offense','defense'])for(const [slot,m]of Object.entries(t[unit]))Object.assign(m,{id:side+'_'+unit+'_'+slot,type:'Dragon',species:null});return {...t,id:side,name:side,kicker:{id:side+'_K',name:'K',attrs:{kicking:65}}};};
  const teams={home:club('home',11),away:club('away',12)};
  const s=R.newGame({...teams,seed:7,quarterLength:900,coinWinner:'home',choice:'receive'});Object.assign(s,state());return {s,teams};
}
test('authoritative pre-choice and pre-snap art agree after the line moves without consuming RNG',()=>{
  const {s,teams}=game();R.preparePreChoice(s,teams);s.ballOn=45;
  const before=JSON.stringify(s),preview=presnapFields(s,teams);assert.equal(JSON.stringify(s),before);assert.equal(preview.length,1);
  R.preparePreChoice(s,teams);assert.deepEqual(presnapFields(s,teams),preview);assert.equal(s.rngState,123);assert.deepEqual(s.t8.fields.list[0].yard,[50,54]);
});
test('an authoritative interception flags old Fire terrain before the new offense',()=>{
  const {s}=game();s.t8.fields.list=[zone({type:'Fire',ownerTeam:'away'})];prepareFieldsForSnap(s);
  R.applyScrimmageResult(s,{result:'interception',turnover:true,yards:0,endYard:35,elapsed:3,stats:{passer:'QB',interceptor:'CB1'},events:[],names:{off:{QB:'QB'},def:{CB1:'CB'}}});
  assert.equal(s.possession,'away');assert.equal(s.t8.fields.list.length,1);prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list,[]);
});

// Validation (2026-11-18): a score, safety or overtime possession ends the possession even when the same club has the ball
// at the next scrimmage snap (its onside kick recovered, its own muffed kickoff, the first overtime possession).
test('the scoring club recovering its own kickoff starts on fresh terrain; banked creations survive',()=>{
  let checked=0;
  for(let seed=1;seed<400&&checked<1;seed++){
    const {s,teams}=game();s.rngState=seed*7919;s.ballOn=95;s.t8.fields.list=[zone({yard:[96,100]})];s.t8.fields.pending=[{owner:'h_TE',ability:'NAT-01-F',type:'Nature',lifetime:3,clock:'ownerOffense'}];prepareFieldsForSnap(s);
    R.applyScrimmageResult(s,{result:'touchdown',yards:5,endYard:100,elapsed:4,stats:{carrier:'RB'},events:[],names:{off:{RB:'RB'},def:{}}});
    assert.equal(s.phase,'try');R.attemptTryKick(s,teams);assert.equal(s.phase,'kickoff');
    R.doKickoff(s,teams,{onside:true});
    if(!(s.phase==='scrimmage'&&s.possession==='home'))continue;
    checked++;prepareFieldsForSnap(s);
    assert.deepEqual(s.t8.fields.list,[],'the scoring drive\'s zone does not carry into the new possession');
    assert.equal(s.t8.fields.pending.length,1);
  }
  assert.equal(checked,1,'an onside recovery was found');
});
test('every overtime possession starts on fresh terrain, also for the club that ended regulation with the ball',()=>{
  const {s}=game();s.t8.fields.list=[zone()];prepareFieldsForSnap(s);
  s.score={home:7,away:7};s.quarter=5;s.ot={period:1,first:'away',possessionsLeft:2,scoreAtStart:{home:7,away:7}};
  R.otAfterPossession(s);assert.equal(s.possession,'home');
  prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list,[]);
});
test('a safety ends the possession for terrain even if the free kick returns to the conceding club',()=>{
  const {s}=game();s.t8.fields.list=[zone()];prepareFieldsForSnap(s);s.ballOn=3;
  R.applyScrimmageResult(s,{result:'safety',yards:-4,endYard:-1,elapsed:4,stats:{carrier:'RB',tackler:'DL1'},events:[],names:{off:{RB:'RB'},def:{DL1:'DL'}}});
  assert.equal(s.phase,'free_kick');Object.assign(s,{phase:'scrimmage',possession:'home',ballOn:40});
  prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list,[]);
});

// Halftime (owner decision 2026-11-19): every zone already on the field clears before the second-half kickoff, legendary
// ones included, whichever club receives or recovers it. Banked creations wait for their own snap; nothing is refunded.
const legendary=(patch={})=>zone({id:'L1',type:'Fire',ability:'FIR-06-F',ownerTeam:'home',clearsAtHalftime:false,remaining:4,...patch});
const toHalftime=(s)=>{
  s.quarter=2;s.clock=0;s.t8.fields.list=[zone(),legendary(),zone({id:'F3',ownerTeam:'away',type:'Water',ability:'WAT-06-F',clearsAtHalftime:false,yard:[30,35],lat:[-26.6,26.6]})];
  s.t8.fields.pending=[{owner:'a_FS',ownerTeam:'away',offField:true,type:'Water',ability:'WAT-06-F',lifetime:5,clock:'ownerOffense',clearsAtHalftime:false}];
  s.t8.ability={h_TE:{pending:false,cd:3},a_FS:{pending:true,cd:5}};prepareFieldsForSnap(s);
  const firstHalfPicture=structuredClone(s.t8.fields.list);R.endOfPeriod(s);return firstHalfPicture;
};
for(const receiver of ['home','away'])test(`halftime clears every zone on the field (legendary too) when ${receiver} receives; banked creations and ability state are untouched`,()=>{
  const {s,teams}=game();s.secondHalfReceiver=receiver;const before=toHalftime(s);
  assert.equal(s.quarter,3);assert.equal(s.phase,'kickoff');assert.equal(s.possession,receiver);
  assert.deepEqual(s.t8.fields.list,[],'nothing on the field at the second-half kickoff');
  assert.equal(s.t8.fields.pending.length,1,'the banked Tsunami Line still waits for its snap');assert.equal(s.t8.fields.pending[0].lifetime,5,'its duration unchanged');
  assert.deepEqual(s.t8.ability,{h_TE:{pending:false,cd:3},a_FS:{pending:true,cd:5}},'no refund, no cooldown reset');
  assert.equal(before.length,3,'the first-half picture held three zones (kept by its recorded play)');
  R.doKickoff(s,teams);if(s.phase==='scrimmage'){prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list,[]);}
});
test('halftime clears zones even when the kicking club recovers an onside kick and keeps its first-half zone owner',()=>{
  let checked=0;
  for(let seed=1;seed<600&&!checked;seed++){
    const {s,teams}=game();s.rngState=seed*7919;s.secondHalfReceiver='away';toHalftime(s);
    R.doKickoff(s,teams,{onside:true});if(!(s.phase==='scrimmage'&&s.possession==='home'))continue;
    checked++;prepareFieldsForSnap(s);
    assert.deepEqual(s.t8.fields.list,[],'the kicking club\'s own first-half zones do not return');
    assert.equal(s.t8.fields.pending.length,1);
  }
  assert.equal(checked,1,'an onside recovery by the kicking club was found');
});
test('halftime survives a save and reload on either side of the whistle without bringing zones back',()=>{
  const {s,teams}=game();s.secondHalfReceiver='home';
  s.quarter=2;s.clock=0;s.t8.fields.list=[legendary()];s.t8.fields.pending=[{owner:'h_TE',ownerTeam:'home',type:'Nature',ability:'NAT-01-F',lifetime:3,clock:'ownerOffense'}];prepareFieldsForSnap(s);
  const reloadedBefore=JSON.parse(JSON.stringify(s));            // saved just before the whistle, reloaded, then the whistle
  R.endOfPeriod(s);R.endOfPeriod(reloadedBefore);
  const reloadedAfter=JSON.parse(JSON.stringify(s));             // saved at halftime, reloaded
  for(const g of [s,reloadedBefore,reloadedAfter]){assert.deepEqual(g.t8.fields.list,[]);assert.equal(g.t8.fields.pending.length,1);}
  assert.equal(JSON.stringify(reloadedBefore),JSON.stringify(s),'reload before the whistle gives the same halftime');
  R.doKickoff(s,teams);R.doKickoff(reloadedAfter,teams);
  assert.equal(JSON.stringify(reloadedAfter),JSON.stringify(s),'reload at halftime gives the same kickoff');
  if(s.phase==='scrimmage'){prepareFieldsForSnap(s);assert.deepEqual(s.t8.fields.list,[]);}
});

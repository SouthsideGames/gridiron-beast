import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import '../src/sim/abilities/index.js';
import { lineup } from './tools/lineup.js';
import { abilityState } from '../src/sim/abilities/registry.js';
import { placeRect } from '../src/sim/t8/fields.js';
import { presnapFx } from '../src/ui/fx/match-fx.js';
function setup() {
 const teams={};for(const [side,seed] of [['home',11],['away',12]]) {const l=lineup(seed,60);for(const group of ['offense','defense'])for(const [slot,m] of Object.entries(l[group]))Object.assign(m,{id:`${side}_${slot}`,species:'kindlet',type:'Fire'});teams[side]={...l,id:side,name:side,offensePlays:['quick_slants'],defensePlays:['mug_zero']};}
 Object.assign(teams.home.offense.QB,{species:'cerebrix',type:'Psychic'});
 const state=R.newGame({home:teams.home,away:teams.away,seed:7,coinWinner:'home',choice:'receive'});Object.assign(state,{phase:'scrimmage',possession:'home',ballOn:30,ballLat:0,t8:{status:{}}});return {state,teams};
}
test('N9d Foresight: first visible look is saved before calls; audibles, reload and redraw cannot reroll or spend game RNG',()=>{
 const {state,teams}=setup(),rng=state.rngState;const first=R.preparePreChoice(state,teams);
 assert.equal(first.foresight.length,1);assert.equal(first.foresight[0].targetSlot,'LB1');assert.equal(state.rngState,rng);
 assert.strictEqual(R.preparePreChoice(state,teams,{defense:'cover_3'}),first);
 const restored=JSON.parse(JSON.stringify(state));assert.deepEqual(R.preparePreChoice(restored,teams,{defense:'cover_3'}),first);
 const before=JSON.stringify(state);presnapFx([],()=>null,null,{record:first,time:0,age:0,frame:{home:true,ballOn:30,ballLat:0}});assert.equal(JSON.stringify(state),before);
});
test('N9d Foresight: called-play alignment is not the initial visible alignment',()=>{
 const {state,teams}=setup();teams.away.defensePlays=['double_a_zero'];
 assert.equal(R.preparePreChoice(state,teams).foresight.length,0,'this play mugs LBs only in its hidden call; visible base LBs are 4.5 yd deep');
});
test('N9d Prism: fixed 12-yard reference selects an existing zone; pending zones stay banked; a reload cannot retarget',()=>{
 const {state,teams}=setup();Object.assign(teams.away.defense.FS,{species:'prism',type:'Light'});teams.away.defensePlays=['cover_3'];
 abilityState(state.t8,'away_FS','prism','prism:0',0).charges=3;
 const f=(id,y)=>({...placeRect({id,type:'Wind',centerLat:0,width:4,yardFrom:y,yardTo:y+2,createdAt:0,owner:'home_QB'}),ownerTeam:'home'});
 state.t8.fields={list:[f('near-reference',41),f('near-line',30)],pending:[{type:'Fire',owner:'home_QB',ownerTeam:'home'}],seq:2};
 const choice=R.preparePreChoice(state,teams);assert.deepEqual(choice.prism[0].removed.fields,['near-reference']);assert.equal(state.t8.fields.pending.length,1);
 assert.deepEqual(state.t8.fields.list.map(x=>x.id),['near-line']);assert.equal(state.t8.mastery.away_FS.executions,1);
 const restored=JSON.parse(JSON.stringify(state));R.preparePreChoice(restored,teams);assert.deepEqual(restored,state);
});
test('N9d Prism: no target keeps readiness and does not remove a zone created later in the same snap',()=>{
 const {state,teams}=setup();Object.assign(teams.away.defense.FS,{species:'prism',type:'Light'});teams.away.defensePlays=['cover_3'];
 const st=abilityState(state.t8,'away_FS','prism','prism:0',0);st.charges=3;
 const pc=R.preparePreChoice(state,teams);assert.equal(pc.prism.length,0);assert.equal(st.charges,3);
 state.t8.fields={list:[{...placeRect({id:'later',type:'Wind',centerLat:0,width:4,yardFrom:40,yardTo:44,createdAt:0,owner:'home_QB'}),ownerTeam:'home'}],pending:[],seq:1};
 R.preparePreChoice(state,teams);assert.equal(state.t8.fields.list.length,1);assert.equal(st.charges,3);
});

import { step, newTendencies } from '../src/sim/game-runner.js';
test('N9d pre-choice timing: Watch and headless Skip agree when runoff ends the half before a snap',()=>{
 const {state,teams}=setup();Object.assign(teams.away.defense.FS,{species:'prism',type:'Light'});teams.away.defensePlays=['cover_3'];Object.assign(state,{quarter:2,clock:1,clockRunning:true});
 abilityState(state.t8,'away_FS','prism','prism:0',0).charges=3;
 state.t8.fields={list:[{...placeRect({id:'old',type:'Wind',centerLat:0,width:4,yardFrom:41,yardTo:43,createdAt:0,owner:'home_QB'}),ownerTeam:'home'}],pending:[],seq:1};
 const watch=structuredClone(state),skip=structuredClone(state);R.preparePreChoice(watch,teams);
 for(const st of [watch,skip])step(st,teams,{}, {home:newTendencies(),away:newTendencies()}, {timeout:'none',tempo:'normal'});
 assert.equal(watch.t8.ability.away_FS.charges,0,'removal happens at the shared pre-choice opportunity');assert.deepEqual(skip,watch,'same result, ledger, fields and RNG even without an actual snap');
});

test('N9d Prism: an activation-play flag cannot leak through a benched snap and possession change',()=>{
 const {state,teams}=setup();Object.assign(teams.away.defense.FS,{species:'prism',type:'Light'});teams.away.defensePlays=['cover_3'];
 const st=abilityState(state.t8,'away_FS','prism','prism:0',0);st.charges=3;
 state.t8.fields={list:[{...placeRect({id:'old',type:'Wind',centerLat:0,width:4,yardFrom:41,yardTo:43,createdAt:0,owner:'home_QB'}),ownerTeam:'home'}],pending:[],seq:1};
 R.preparePreChoice(state,teams);assert.equal(st.noCharge,true);
 // Its creator need not be in the chosen play after a look-based activation, so no source playEnd hook may run.
 state.playCount++;state.possession='away';R.preparePreChoice(state,teams);
 assert.equal(st.noCharge,false,'clear the old activation restriction before the no-specialist fast path');
});

test('M6 Foresight uses the dominant public formation rather than the first plan entry',()=>{
 const {state,teams}=setup();teams.away.defensePlays=['cover_3','mug_zero','mug_zero'];
 const before=state.rngState;const pc=R.preparePreChoice(state,teams);
 assert.equal(pc.defense,'mug_zero');assert.equal(pc.foresight.length,1);
 assert.equal(state.rngState,before);assert.strictEqual(R.preparePreChoice(state,teams,{defense:'cover_3'}),pc);
});

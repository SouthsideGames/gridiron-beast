import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineup } from './tools/lineup.js';
import * as R from '../src/sim/rules.js';
import { ZONE_IDS, FIXED_ZONES, zoneOptions, zoneOverlaps, setZoneChoice } from '../src/sim/t8/zone-planning.js';
import { afterPlay } from '../src/sim/t8/field-runtime.js';
import { createFieldPlay } from '../src/sim/t8/field-effects.js';
import { FOOTBALL_REVISION, CLASH_REVISION } from '../src/data/ability-review-revisions.js';
import { ABILITIES, FAMILIES, abilityById } from '../src/data/beast-dex.js';
import { contractOf } from '../src/sim/abilities/registry.js';
import { simulatePlay } from '../src/sim/engine.js';
import { zonePlans, zonePlannerHtml, zonePlannerOverlay } from '../src/ui/zone-planner.js';

function game(possession = 'home') {
  const club = (side, seed) => { const t = lineup(seed, 60); for (const unit of ['offense', 'defense']) for (const [slot, m] of Object.entries(t[unit])) Object.assign(m, { id: `${side}_${unit}_${slot}`, type: 'Dragon', species: null }); return { ...t, id: side, name: side, kicker: { id: `${side}_K`, name: 'K', attrs: { kicking: 65 } } }; };
  const teams = { home: club('home', 11), away: club('away', 12) };
  const state = R.newGame({ ...teams, seed: 7, quarterLength: 900, coinWinner: 'home', choice: 'receive' });
  Object.assign(state, { phase: 'scrimmage', possession, ballOn: 35, ballLat: 0, t8: { status: {}, fields: { list: [], pending: [], seq: 0 } } });
  return { state, teams };
}
function pending(state, teams, side, id = 'MET-05-F') {
  const off = state.possession === side, owner = teams[side][off ? 'offense' : 'defense'][off ? 'TE' : 'FS'].id;
  const type = FAMILIES.find((f) => f.abilities?.football === id)?.type || 'Metal';
  const spec = { owner, ownerTeam: side, ability: id, side: off ? 'off' : 'def', type, lifetime: 3, clock: off ? 'ownerOffense' : 'ownerDefense', width: 8, length: 4, lbDepth: 5, strength: 15 };
  state.t8.fields.pending.push(spec); return spec;
}

test('every football zone is reopened; Fortress Gate and Clash revisions are untouched', () => {
  assert.equal(ZONE_IDS.length, 19);
  for (const id of ZONE_IDS) assert.ok(FOOTBALL_REVISION[id] > 0, id);
  assert.equal(FOOTBALL_REVISION['MET-06-F'], undefined);
  assert.deepEqual(CLASH_REVISION, {});
  assert.equal(abilityById('PSY-02-F').name, 'Mirror Rift');
  assert.equal(abilityById('LIG-03-F').category, 'Targeted effect');
});

test('every offered placement matches the actual snap, both clubs and both units; preview never spends readiness or RNG', () => {
  let checked = 0;
  for (const possession of ['home', 'away']) for (const side of ['home', 'away']) for (const id of ZONE_IDS.filter((id) => !FIXED_ZONES.includes(id))) {
    const { state, teams } = game(possession); pending(state, teams, side, id);
    const before = JSON.stringify(state);
    const [plan] = zonePlans(state, teams, side, 'inside_zone', 'cover_3');
    assert.equal(JSON.stringify(state), before, 'pure preview'); assert.ok(plan.placementOptions.length >= 1, id);
    for (const o of plan.placementOptions) {
      const copy = structuredClone(state); setZoneChoice(copy, plan.key, o.id);
      const { sim } = R.runScrimmagePlay(copy, structuredClone(teams), 'inside_zone', 'cover_3');
      const f = sim.fields.find((f) => f.ability === id);
      assert.ok(f, id); const dir = possession === 'home' ? 1 : -1;
      const yards = f.yard.map((x) => dir === 1 ? x + 35 : 100 - (x + 35)).sort((a,b)=>a-b);
      const lats = f.lat.map((x) => dir * x).sort((a,b)=>a-b);
      assert.deepEqual(yards, o.rect.yard, `${id} ${o.id}: exact snap geometry`);
      assert.deepEqual(lats, o.rect.lat); assert.equal(copy.t8.zoneChoices, undefined, 'selection consumed only by snap'); checked++;
    }
  }
  assert.ok(checked >= 150);
});

test('action-earned and alignment-based zones also offer manual placement',()=>{
 assert.deepEqual(FIXED_ZONES,[]);
 for(const ability of ZONE_IDS){
  const options=zoneOptions({state:{possession:'home',ballOn:35},spec:{ability,type:'Water',width:6,length:4},base:{type:'Water',width:6,centerLat:0,yardFrom:38,yardTo:42}});
  assert.deepEqual(options.map(o=>o.id),['left','middle','right'],ability);
 }
});

test('overlap choices show Steam and use the same parent footprints and clocks; removed holes do not reappear', () => {
  const { state, teams } = game(); const spec = pending(state, teams, 'home', 'FIR-06-F');
  state.t8.fields.list.push({ id: 'water', type: 'Water', owner: 'other', ownerTeam: 'home', ability: 'WAT-06-F', createdAt: 0, yard: [39, 45], lat: [8, 16], remaining: 2, clock: 'ownerOffense' });
  const [p] = zonePlans(state, teams, 'home', 'inside_zone', 'cover_3');
  const mix = p.placementOptions.find((o) => o.id === 'overlap:water'); assert.ok(mix);
  assert.equal(mix.overlaps[0].name, 'Steam'); assert.equal(mix.overlaps[0].remaining, 2);
  setZoneChoice(state, p.key, mix.id); const r = R.runScrimmagePlay(state, teams, 'inside_zone', 'cover_3');
  assert.equal(r.sim.fields.length, 2); assert.equal(state.t8.fields.list.find((f)=>f.id==='water').remaining, 1);
  const f = { ...state.t8.fields.list[0], holes: [{ yard: [0,100], lat: [-30,30] }] };
  assert.deepEqual(zoneOverlaps(mix.rect, spec.type, [f], 3, spec.clock, 'home'), []);
});

test('zones stay fixed across line movement and creator bench time; only relevant team plays age them', () => {
  const { state, teams } = game(); const spec = pending(state, teams, 'home');
  const [p] = zonePlans(state, teams, 'home', 'inside_zone', 'cover_3'); setZoneChoice(state, p.key, 'right');
  R.runScrimmagePlay(state, teams, 'inside_zone', 'cover_3');
  const f = state.t8.fields.list[0], rect = JSON.stringify([f.yard, f.lat]); assert.equal(f.remaining, 2);
  afterPlay(state.t8, ()=>false); assert.equal(f.remaining, 2);
  delete teams.home.offense.TE;
  Object.assign(state, { possession: 'home', phase: 'scrimmage', down: 1, toGo: 10, ballOn: 55 });
  R.runScrimmagePlay(state, teams, 'three_verticals', 'cover_3');
  assert.equal(f.remaining, 1); assert.equal(JSON.stringify([f.yard,f.lat]), rect);
});

test('stale and forged choices fall back to a legal coach placement; own options do not read opponent assignments', () => {
  const { state, teams } = game(); pending(state, teams, 'home');
  const plans = zonePlans(state, teams, 'home', 'inside_zone', 'cover_3');
  setZoneChoice(state, plans[0].key, 'yard:999');
  const selected = R.previewPendingFields(state, teams, 'inside_zone', 'cover_3')[0];
  assert.ok(plans[0].placementOptions.some((o)=>JSON.stringify(o.rect.yard)===JSON.stringify(selected.yard)));
  const hidden = zonePlans(state, teams, 'home', 'inside_zone', 'all_out');
  assert.deepEqual(hidden[0].placementOptions, plans[0].placementOptions, 'hidden opponent call cannot change suggestions');
  state.playCount++;
  const fresh = zonePlans(state, teams, 'home', 'inside_zone', 'cover_3')[0]; assert.equal(fresh.picked,'auto');
  const svg = zonePlannerOverlay(fresh, state, { top: 65 }); assert.match(svg,/data-choice="left"/); assert.match(svg,/data-choice="right"/);
});

test('Shadow Patch confuses on exit through the status gate, never applying its old Awareness layer; Dark and Night Watch are immune', () => {
  for (const [type, protectedByWatch, expected] of [['Fire',false,true],['Dark',false,false],['Fire',true,false]]) {
    const a={team:'off',slot:'WR1',mid:'r',name:'R',type,x:1,y:0,vx:0,vy:0,maxSpeed:7,attrs:{awareness:80,catching:70,blocking:60},ignoreDarkConfusion:protectedByWatch};
    const t8={status:{}};
    const fx=createFieldPlay({actors:[a],t8,fields:[{id:'dark',type:'Dark',strength:20,ability:'DAR-01-F',owner:'source',createdAt:0,yard:[0,3],lat:[-3,3],payload:{smokeConfusion:true}}]});
    fx.tick(0); assert.equal(a.attrs.awareness,80,'no old Awareness penalty'); a.x=4;fx.tick(0.05);
    assert.equal(t8.status.r?.id==='confused',expected);if(expected){assert.equal(t8.status.r.restOfPlay,true);assert.equal(t8.status.r.payload.wrongAssignment,true);}
  }
});

test('Iron Lungs keeps a qualified ally protected when the source leaves and pauses while recipient is benched', () => {
  const {state,teams}=game(); const lb=teams.away.defense.LB1;
  Object.assign(lb,{species:'steelpaw',type:'Metal',form:'steelpaw:0',mastery:3});
  R.runScrimmagePlay(state,teams,'inside_zone','cover_3');
  const L=state.t8.ironLungs; const id=state.t8.ability[lb.id].lungsAlly; assert.ok(id);assert.equal(L.protection[id],2);
  const slot=Object.entries(teams.away.defense).find(([,m])=>m.id===id)?.[0];assert.ok(slot);
  teams.away.defense.LB1={...lb,id:'sub',species:null};
  Object.assign(state,{phase:'scrimmage',possession:'home',down:1,toGo:10,ballOn:35});
  R.runScrimmagePlay(state,teams,'inside_zone','cover_3');assert.equal(L.protection[id],1);assert.equal(L.progress[id],0);
  const kept=teams.away.defense[slot];teams.away.defense[slot]={...kept,id:'benchedSub',species:null};
  Object.assign(state,{phase:'scrimmage',possession:'home',down:1,toGo:10,ballOn:35});
  R.runScrimmagePlay(state,teams,'inside_zone','cover_3');assert.equal(L.protection[id],1);
});

test('Prism Break holds ready with no target and removes a newly spawned enemy zone before that play', () => {
  const {state,teams}=game();const p=teams.away.defense.FS;
  Object.assign(p,{species:'prism',form:'prism:0',type:'Light'}); state.t8.ability={[p.id]:{charges:3,noCharge:false}};
  R.preparePreChoice(state,teams);assert.equal(state.t8.ability[p.id].charges,3);
  pending(state,teams,'home');const r=R.runScrimmagePlay(state,teams,'inside_zone','cover_3');
  assert.equal(state.t8.ability[p.id].charges,0);assert.equal(r.sim.fields?.length||0,0);
});

test('Mirror Rift produces real completions, other-receiver catches, interceptions and incompletions across fixed seeds', async () => {
  const { PLAYS } = await import('../src/data/playbook.js');
  const counts = { completed: 0, picked: 0, incomplete: 0, otherReceiver: 0 };
  let first = null;
  for (let seed = 1; seed <= 120; seed++) {
    const o = lineup(11,60).offense, d = lineup(12,64).defense;
    Object.assign(d.CB1, { id:'rift', species:'shadewisp', form:'shadewisp:0', type:'Psychic' });
    const run = () => simulatePlay({ offensePlay:PLAYS.smash, defensePlay:PLAYS.cover_3, offense:structuredClone(o), defense:structuredClone(d), ballOn:35, seed, options:{ t8:{status:{}}, offenseSide:'home', forcedTarget:'WR1' } });
    const r=run();
    assert.equal(r.events.filter((e)=>e.ability==='PSY-02-F' && e.kind==='ability').length,1);
    if(seed===1)assert.deepEqual(run(),r,'same seed, same actual play');
    if(r.stats.receiver) { counts.completed++; if(r.stats.receiver!=='WR1')counts.otherReceiver++; }
    else if(r.stats.interceptor)counts.picked++;
    else if(r.result==='incomplete')counts.incomplete++;
  }
  for(const [outcome,n] of Object.entries(counts))assert.ok(n>0,`${outcome} occurs through real resolution`);
});

test('placement lanes follow real receivers, full-width zones offer depth choices, and exact hybrid art respects holes', async () => {
  const {PLAYS}=await import('../src/data/playbook.js');
  const {hybridRegions}=await import('../src/sim/t8/zone-planning.js');
  const {state,teams}=game();pending(state,teams,'home','WIN-01-F');
  const [p]=zonePlans(state,teams,'home','deep_post','cover_3');
  // A vertical outside receiver stays at 18 yd lateral; left/right suggestions reach those routes.
  assert.ok(p.placementOptions.some((o)=>o.rect.lat[0]<=-18 && o.rect.lat[1]>=-18));
  assert.ok(p.placementOptions.some((o)=>o.rect.lat[0]<=18 && o.rect.lat[1]>=18));
  const spec={owner:'x',ownerTeam:'home',ability:'WAT-06-F',type:'Water',width:160/3,length:5,lifetime:5,clock:'ownerOffense'};
  const opts=zoneOptions({state,spec,base:{centerLat:0,yardFrom:44.5,yardTo:49.5,width:160/3},ownPlay:PLAYS.inside_zone});
  assert.equal(new Set(opts.map((o)=>o.rect.yard.join(','))).size,3,'full width has three different depth bands');
  const fields=[{id:'a',type:'Fire',createdAt:0,yard:[0,8],lat:[-4,4],remaining:4,clock:'ownerOffense',ownerTeam:'home',holes:[{yard:[2,4],lat:[-4,4]}]},{id:'b',type:'Water',createdAt:0,yard:[0,8],lat:[-4,4],remaining:2,clock:'ownerOffense',ownerTeam:'home'}];
  const regions=hybridRegions(fields);assert.ok(regions.length);assert.ok(regions.every((r)=>r.name==='Steam'&&r.remaining===2));
  assert.ok(regions.every((r)=>r.yard[1]<=2||r.yard[0]>=4),'the removed footprint stays absent');
});

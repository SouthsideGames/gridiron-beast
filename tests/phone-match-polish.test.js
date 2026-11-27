import test from 'node:test';
import assert from 'node:assert/strict';
import {simulatePlay,REVIEW_ONLY} from '../src/sim/engine.js';
import {registerAbility} from '../src/sim/abilities/registry.js';
import {lineup} from './tools/lineup.js';
import {PLAYS} from '../src/data/playbook.js';
import {step,aiController,newTendencies} from '../src/sim/game-runner.js';
import * as R from '../src/sim/rules.js';
import {generatedTeam} from '../src/franchise/roster.js';
import {kickPlay} from '../src/ui/fx/match-fx.js';
import {fieldSvg} from '../src/ui/field-view.js';
import {conversionCallout, playResultCallout} from '../src/ui/screens/match.js';

test('conversion banners use the recorded outcome and scoring side', () => {
  const kick = { kind: 'try', tryTeam: 'home', kicking: 'home' };
  assert.deepEqual(conversionCallout({ ...kick, good: false, text: 'Extra point is NO GOOD.' }, 'home'),
    { tier: 'loss', text: 'NO GOOD', mine: false });
  assert.deepEqual(conversionCallout({ ...kick, good: true }, 'home'),
    { tier: 'score', text: 'EXTRA POINT', mine: true });
  const two = { kind: 'try', tryTeam: 'away', offensePlayId: 'quick_slants' };
  assert.deepEqual(conversionCallout({ ...two, good: true }, 'home'),
    { tier: 'score', text: 'TWO POINTS', mine: false });
  assert.deepEqual(conversionCallout({ ...two, good: false }, 'home'),
    { tier: 'loss', text: 'NO GOOD', mine: true });
  assert.deepEqual(conversionCallout({ ...two, good: false, sim: { stats: { defensiveScore: true } } }, 'home'),
    { tier: 'score', text: 'TWO POINTS', mine: true });
});

let down=false;
registerAbility({family:'phoneprobe',abilityId:'PHONE-PROBE',hooks:{playStart(ctx){if(down)for(const d of ctx.opponents('off'))ctx.applyStatus(d,{id:'knockedDown',strength:1,duration:0,restOfPlay:true});}}});
test('knocked-down defenders cannot intercept, break up, tackle or sack until recovered',()=>{
 let awakePicks=0;
 const O=lineup(11,60),D=lineup(12,64);O.offense.QB={...O.offense.QB,species:'phoneprobe',form:'phoneprobe:0'};
 for(let seed=1;seed<=35;seed++){
  const args={offensePlay:PLAYS.quick_slants,defensePlay:PLAYS.cover_1,offense:O.offense,defense:D.defense,ballOn:30,seed,options:{t8:{status:{}},[REVIEW_ONLY]:{wouldBeInterception:true}}};
  down=false;const awake=simulatePlay(structuredCloneArgs(args));if(awake.stats.interceptor)awakePicks++;
  down=true;const flat=simulatePlay(structuredCloneArgs(args));
  assert.equal(flat.stats.interceptor,null);assert.equal(flat.stats.tackler,null);assert.notEqual(flat.result,'sack');
  assert.equal(flat.events.some(e=>['interception','tackle','sack','breakup'].includes(e.kind)&&e.side==='def'),false);
 }
 down=false;assert.ok(awakePicks>0,'same seeded situations include real interception opportunities when upright');
});
function structuredCloneArgs(a){return {...a,offense:structuredClone(a.offense),defense:structuredClone(a.defense),options:{t8:{status:{}},[REVIEW_ONLY]:a.options[REVIEW_ONLY]}};}
test('extra-point event carries final kick outcome and plays a real holder, kicker and ball flight',()=>{
 const home=generatedTeam(1,{id:'h',name:'Home',abbr:'HOM'}),away=generatedTeam(2,{id:'a',name:'Away',abbr:'AWY'}),teams={home,away};
 const state=R.newGame({home,away,seed:4,coinWinner:'home',choice:'receive'});state.phase='try';state.tryTeam='home';state.score.home=6;
 const ev=step(state,teams,{home:aiController('home'),away:aiController('away')},newTendencies(),{tryChoice:'kick'});
 assert.equal(ev.kind,'try');assert.equal(ev.kicking,'home');assert.equal(ev.from,85);assert.equal(typeof ev.res.good,'boolean');
 const before=JSON.stringify(state);const k=kickPlay(ev,()=>null);assert.ok(k.sim.frames.length>10);assert.ok(k.sim.frames.some(f=>f.ball[2]===1));assert.ok(k.sim.frames[0].off.some(p=>p[0]==='K'));assert.equal(JSON.stringify(state),before);
});
test('camera viewport clips both field art and moving actors',()=>{
 const html=fieldSvg({ballOn:7});assert.match(html,/<clipPath id="fv-clip"/);assert.equal((html.match(/clip-path="url\(#fv-clip\)"/g)||[]).length,2);
});

test('play callouts distinguish pass outcomes and name the team taking possession', () => {
  const teams = { home: { abbr: 'HOM' }, away: { abbr: 'AWY' } };
  const event = { kind: 'play', offenseSide: 'home' };
  const result = (result, stats = {}, outcome = {}) =>
    playResultCallout({ ...event, sim: { result, stats, names: { off: { RB: 'Runner' }, def: { LB: 'Backer' } } }, outcome }, 'home', teams);
  assert.equal(result('incomplete').text, 'INCOMPLETE');
  assert.equal(result('incomplete', { dropped: true }).text, 'PASS DROPPED');
  assert.equal(result('incomplete', { dropped: true, pbuBy: 'LB' }).text, 'PASS BROKEN UP');
  assert.equal(result('throwaway').text, 'THROWN AWAY');
  assert.deepEqual(result('fumble', { recoveredTeam: 'def', recoveredSlot: 'LB' }),
    { tier: 'turnover', text: 'FUMBLE · Backer (AWY) recovered', mine: false });
  assert.deepEqual(result('tackle', { recoveredTeam: 'off', recoveredSlot: 'RB' }),
    { tier: 'routine', text: 'FUMBLE · Runner (HOM) recovered', mine: true });
  assert.deepEqual(result('incomplete', { dropped: true }, { turnoverOnDowns: 'away' }),
    { tier: 'turnover', text: 'TURNOVER ON DOWNS · AWY ball · PASS DROPPED', mine: false });
});

test('fourth-down possession is captured from the rules before subsequent play', () => {
  const home = generatedTeam(1, { id: 'h', name: 'Home', abbr: 'HOM' });
  const away = generatedTeam(2, { id: 'a', name: 'Away', abbr: 'AWY' });
  const makeGame = () => Object.assign(R.newGame({ home, away, seed: 4 }), {
    phase: 'scrimmage', possession: 'home', down: 4, toGo: 3, ballOn: 44,
  });
  const failed = makeGame();
  const play = { result: 'incomplete', yards: 0, elapsed: 1, ballOn: 44, stats: {}, events: [] };
  assert.equal(R.applyScrimmageResult(failed, play).turnoverOnDowns, 'away');
  assert.equal(failed.possession, 'away');
  const converted = makeGame();
  assert.equal(R.applyScrimmageResult(converted, { ...play, result: 'tackle', yards: 4 }).turnoverOnDowns, undefined);
  assert.equal(converted.possession, 'home');
});

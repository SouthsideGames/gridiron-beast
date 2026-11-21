import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startGuide, guideActive, currentLesson, advanceGuide, syncGuide, guideEvent, finishIndependent, allowedScreens, LESSONS, lineupStamp, skipLesson, footballLessonKey, finishGuideAtFootball, GUIDE_LESSON_COUNT } from '../src/franchise/guide.js';
import { t } from '../src/text/index.js';
import { createFranchise, hireDefaultStaff, assignSlot } from '../src/franchise/franchise.js';
import { migrate, exportJson, importJson } from '../src/franchise/save.js';
import { goalOffers } from '../src/franchise/board.js';
const base = createFranchise({ owner: { first: 'Guide', last: 'Test', background: 'player' }, club: 'Ember City Beasts', seed: 312 });
hireDefaultStaff(base);
const fresh = () => structuredClone(base);
function at(f, id) { startGuide(f); while (currentLesson(f)?.id !== id && guideActive(f)) advanceGuide(f); }

test('existing saves stay unenrolled; new enrollment is idempotent and consumes no game RNG', () => {
  const f = fresh(); assert.equal(guideActive(migrate(f)), false); const state = f.rngState;
  startGuide(f); const g = f.guide; startGuide(f); assert.equal(g, f.guide); assert.equal(f.rngState, state);
  assert.equal(currentLesson(f).id, 'welcome'); assert.ok(allowedScreens(f).includes('welcome'));
});
test('opening a screen cannot complete action lessons; inspecting and comparing are distinct evidence', () => {
  const f = fresh(); at(f, 'roster'); assert.equal(syncGuide(f), false);
  guideEvent(f, 'compare'); assert.equal(currentLesson(f).id, 'roster');
  guideEvent(f, 'monster'); assert.equal(currentLesson(f).id, 'beast');
  at(f, 'prospect'); guideEvent(f, 'monster'); assert.equal(currentLesson(f).id, 'prospect');
  guideEvent(f, 'compare'); assert.equal(currentLesson(f).id, 'clash');
});
test('a real successful assignment completes lineup lesson, failed assignments do not', () => {
  const f = fresh(); at(f, 'lineup'); const chart = JSON.parse(lineupStamp(f));
  assert.equal(assignSlot(f, 'QB', 'not-a-beast').ok, false); assert.equal(syncGuide(f), false);
  const choice = Object.entries(chart).flatMap(([slot, id]) => f.roster.filter(m => m.position === slot.replace(/\d+$/, '') && m.id !== id && !m.injury).map(m => ({ slot, m })))[0];
  assert.ok(choice); assert.equal(assignSlot(f, choice.slot, choice.m.id).ok, true);
  assert.equal(syncGuide(f), true); assert.equal(currentLesson(f).id, 'coaches');
});
test('draft and Board goals precede Monday; day 2 recruiting precedes training', () => {
  const f = fresh(); at(f, 'draft'); assert.equal(syncGuide(f), false); f.draft.done = true;
  syncGuide(f); assert.equal(currentLesson(f).id, 'board'); assert.equal(syncGuide(f), false);
  f.board = { goal: { id: 'wins' } }; syncGuide(f); assert.equal(currentLesson(f).id, 'monday');
  f.season.day = 1; f.week.prospects = [{ monster: { id: 'scouted' } }]; syncGuide(f); assert.equal(currentLesson(f).id, 'prospect'); // Monday's scouting found someone
  guideEvent(f, 'compare'); assert.equal(syncGuide(f), false);
  f.season.day = 2; syncGuide(f); assert.equal(currentLesson(f).id, 'wednesday');
});
test('byes do not finish guidance; an older played-game checkpoint retires it without a result lesson', () => {
  const f = fresh(); at(f, 'sunday'); f.season.week++;
  assert.equal(syncGuide(f), false, 'a bye alone does not count as playing football');
  f.guide.evidence.gameFinished = true; syncGuide(f); assert.equal(currentLesson(f), null); assert.equal(f.guide.endedAtFootball, true);
});
test('independent preparation needs inspection plus a decision, and permits free navigation', () => {
  const f = fresh(); at(f, 'independent'); assert.equal(allowedScreens(f), null);
  assert.equal(finishIndependent(f, true), false); f.guide.evidence.reviewedTeam = true;
  assert.equal(finishIndependent(f), false); assert.equal(finishIndependent(f, true), true);
  assert.equal(currentLesson(f).id, 'complete'); advanceGuide(f); assert.equal(f.guide.done, true);
});
test('skip, opt out and JSON reload retain progress without enrolling another save', () => {
  const f = fresh(); startGuide(f); advanceGuide(f, { skip: true });
  const parsed = importJson(exportJson(f));
  const loaded = parsed.franchise || parsed; assert.equal(loaded.guide.index, 1); assert.deepEqual(loaded.guide.skipped, ['welcome']);
  loaded.guide.enabled = false; assert.equal(currentLesson(loaded), null); assert.equal(allowedScreens(loaded), null);
  assert.equal(fresh().guide, undefined);
});
test('forecasts display whole wins while precise internal expectations remain intact', () => {
  for (const p of [0.15, 0.3, 0.5, 0.85]) {
    const offers = goalOffers(null, { expectedWinPct: p });
    assert.match(offers[0].text, /win \d+ games/); assert.doesNotMatch(offers[0].text, /\d\.\d/);
    assert.equal(offers[0].forecastWins, +(p * 9).toFixed(1));
  }
  assert.equal(new Set(LESSONS.map(l => l.id)).size, LESSONS.length);
});

test('skipping a daily lesson unlocks navigation without spending the day or advancing the simulation', () => {
  const f = fresh(); at(f, 'monday'); const state = f.rngState;
  skipLesson(f); assert.equal(allowedScreens(f), null); assert.equal(f.season.day, 0);
  assert.equal(syncGuide(f), false); assert.equal(f.rngState, state);
  f.season.day = 1; f.week.prospects = [{monster: {id: 'test'}}]; syncGuide(f);
  assert.equal(currentLesson(f).id, 'prospect'); assert.ok(f.guide.skipped.includes('monday'));
});
test('no available prospects adapts the comparison lesson instead of trapping the player', () => {
  const f = fresh(); at(f, 'prospect'); f.season.day = 1; f.week.prospects = [];
  assert.equal(syncGuide(f), true); assert.equal(currentLesson(f).id, 'clash'); assert.ok(f.guide.skipped.includes('prospect'));
});

// Found in the 2026-11-17 browser playthrough of a new franchise.
test('one save can finish two checkpoints: skipping Tuesday\'s encounter ends the prospect and Clash lessons together', () => {
  const f = fresh(); at(f, 'prospect'); f.season.day = 1; f.week.prospects = [{ monster: { id: 'scouted' } }];
  assert.equal(syncGuide(f), false, 'Tuesday has not ended yet');
  f.season.day = 2; // Skip the Encounter: Wednesday begins without a comparison or a battle
  assert.equal(syncGuide(f), true); assert.equal(currentLesson(f).id, 'wednesday', 'Wednesday\'s training is not blocked by a finished Tuesday');
  assert.deepEqual(f.guide.skipped, ['prospect']); assert.ok(f.guide.completed.includes('clash'));
  assert.ok(allowedScreens(f).includes('training'));
});
test('a forfeited Sunday keeps the football lesson for the next real game without locking the new week', () => {
  const f = fresh(); at(f, 'sunday'); f.season.day = 6;
  const sunday = allowedScreens(f);
  for (const repair of ['famarket', 'contracts', 'lineup']) assert.ok(sunday.includes(repair), `the lineup safeguard's ${repair} repair is reachable`);
  assert.ok(!sunday.includes('scout'), 'Sunday still points at the game');
  f.season.week = 2; f.season.day = 0; // forfeitSunday: the week ended without a played game
  assert.equal(syncGuide(f), false); assert.equal(currentLesson(f).id, 'sunday', 'a forfeit is not a played game');
  assert.equal(allowedScreens(f), null, 'Monday of the new week is reachable');
  f.season.day = 6; assert.ok(allowedScreens(f), 'the next Sunday leads to the game again');
  f.guide.evidence.gameFinished = true; syncGuide(f); assert.equal(currentLesson(f), null); assert.equal(f.guide.endedAtFootball, true);
});
test('the first football game ends guidance before kickoff, with one pending send-off and no restrictions', () => {
  const f = fresh(); at(f, 'sunday'); f.season.day = 6; skipLesson(f);
  const rng = f.rngState;
  assert.equal(finishGuideAtFootball(f), false, 'pregame alone is not the football game');
  f.game = { playerSide: 'home', state: { phase: 'kickoff', possession: 'home', finished: false } };
  assert.equal(syncGuide(f), true); assert.equal(f.guide.done, true); assert.equal(f.guide.endedAtFootball, true);
  assert.equal(f.guide.sendoffPending, true); assert.equal(f.guide.skipPending, undefined);
  assert.equal(guideActive(f), false); assert.equal(currentLesson(f), null); assert.equal(allowedScreens(f), null);
  assert.equal(f.guide.index, GUIDE_LESSON_COUNT); assert.equal(f.rngState, rng);
  assert.equal(syncGuide(f), false, 'idempotent');
  const loaded = JSON.parse(JSON.stringify(f)); loaded.guide.sendoffPending = false;
  assert.equal(syncGuide(loaded), false); assert.equal(loaded.guide.sendoffPending, false, 'reload cannot rearm it');
  for (const state of [{phase:'scrimmage',down:1},{phase:'scrimmage',down:4},{phase:'try'},{phase:'kickoff'},{finished:true}]) {
    f.game.state = state; assert.equal(footballLessonKey(f), null);
  }
});
test('existing midgame guides end too; old review/Week 2 guides retire quietly and opt-outs stay opted out', () => {
  const mid = fresh(); at(mid, 'sunday'); mid.game = {state:{phase:'scrimmage',down:3,finished:false}};
  assert.equal(finishGuideAtFootball(mid), true); assert.equal(mid.guide.sendoffPending, true);
  for (const id of ['review','independent','complete']) {
    const f = fresh(); at(f,id); assert.equal(syncGuide(f),true); assert.equal(guideActive(f),false);
    assert.equal(f.guide.sendoffPending,false); assert.equal(allowedScreens(f),null);
  }
  const off = fresh(); startGuide(off); off.guide.enabled = false; off.game = {state:{phase:'kickoff'}};
  assert.equal(finishGuideAtFootball(off),false); assert.equal(off.guide.sendoffPending,undefined);
  const old = fresh(); old.game = {state:{phase:'kickoff'}}; assert.equal(finishGuideAtFootball(old),false); assert.equal(old.guide,undefined);
});
test('the Board forecast sentence reads cleanly with whole wins', () => {
  const line = t('hq.the_forecast_has_at_wins_against', { year: 1201, club: 'Ember City Beasts', toFixed: 3 }) + t('hq.tell_me_what_you_are_promising');
  assert.equal(line, '1201: Ember City Beasts is expected to win 3 games. Tell me what you are promising the board this year.');
  const withHistory = t('hq.the_forecast_has_at_wins_against', { year: 1202, club: 'X', toFixed: 4 }) + t('hq.last_year_you', { n: 'delivered' }) + t('hq.tell_me_what_you_are_promising');
  assert.doesNotMatch(withHistory, /\.\.|[“”]/);
});

test('the polish shortlist page stays reachable in every lesson, so its header button is never a dead control', () => {
  const f = createFranchise({ owner: { first: 'Short', last: 'List' }, club: 'Ember City Beasts', seed: 64 }); hireDefaultStaff(f); startGuide(f);
  for (let i = 0; i < LESSONS.length && guideActive(f); i++) {
    const allowed = allowedScreens(f);
    if (allowed) assert.ok(allowed.includes('shortlist'), `lesson ${currentLesson(f).id} blocks the shortlist`);
    advanceGuide(f, { skip: true });
  }
});

// Real route controls must be teachable; the old matcher only looked for data-action="roster"
// and therefore missed the bottom tab (data-action="router-tab", data-screen="roster").
test('guide targets include real Roster navigation and local action controls', async () => {
  const { guideTargetSelectors, guideHtml, highlightGuideTarget } = await import('../src/ui/guided-week.js');
  const f = fresh(); at(f,'roster');
  assert.ok(guideTargetSelectors(f,'hq').includes('[data-action="router-tab"][data-screen="roster"]'));
  assert.ok(guideTargetSelectors(f,'hq').includes('[data-action="go"][data-screen="roster"]'));
  assert.ok(guideTargetSelectors(f,'roster').includes('[data-action="slot"]'));
  const marks = new Set(); const tab = {disabled:false,closest:()=>null,getClientRects:()=>[{}],classList:{add:k=>marks.add(k),remove:k=>marks.delete(k)}};
  const fakeRoot = {querySelectorAll:selector=>selector === '.guide-target' ? (marks.size?[tab]:[]) : selector === '[data-action="router-tab"][data-screen="roster"]'?[tab]:[],querySelector:()=>null};
  highlightGuideTarget(f,'hq',fakeRoot); assert.ok(marks.has('guide-target'));
  f.game = {state:{phase:'kickoff'}}; syncGuide(f);
  highlightGuideTarget(f,'match',fakeRoot); assert.equal(marks.size,0);
  assert.deepEqual(guideTargetSelectors(f,'hq'),[]); assert.equal(guideHtml(f,'match'),'');
});
test('Coach Assist cannot restart automatic lessons after the Commissioner send-off; manual Help remains', async () => {
  const {autoTip,momentTip,helpTopics} = await import('../src/franchise/assist.js');
  const f = fresh(); at(f,'sunday'); f.game = {state:{phase:'kickoff'}}; syncGuide(f);
  for(const screen of ['match','hq','roster','training','clash-battle']) assert.equal(autoTip(f,screen),null);
  for(const key of ['clock','overtime','match']) assert.equal(momentTip(f,key),null);
  assert.ok(helpTopics('match').length>0);
  // Validation 2026-11-18: the match's first-ability tip (a blocking sheet the first time each ability is seen) is a Coach Assist
  // automatic tip too; it uses the same switch. Unguided and older franchises keep it outside Expert.
  const {automaticTipsOff} = await import('../src/franchise/assist.js');
  assert.equal(automaticTipsOff(f),true);
  const old = createFranchise({owner:{first:'Old',last:'GM'},club:'Ember City Beasts',seed:41}); assert.equal(automaticTipsOff(old),false);
  old.settings.assist = {...(old.settings.assist||{}), mode:'expert'}; assert.equal(automaticTipsOff(old),true);
  const src = (await import('node:fs')).readFileSync(new URL('../src/ui/screens/match.js', import.meta.url), 'utf8');
  assert.match(src, /function firstAbilityTip\(f, ev\) \{\n    if \(automaticTipsOff\(f\)/, 'the match ability tip reads the shared switch');
});

test('the compact Commissioner send-off appears once, does not pause or change the game, and stays dismissed', async () => {
  const { guideFootball } = await import('../src/ui/guided-week.js');
  const f = fresh(); at(f,'sunday'); f.game = {state:{phase:'kickoff',score:{home:0,away:0}}};
  const gameBefore = JSON.stringify(f.game), rng = f.rngState;
  const previous = globalThis.document; const children = [];
  const host = {appendChild:node=>children.push(node)};
  let mounted = false;
  globalThis.document = {
    querySelector:()=>mounted?host:null,
    createElement:()=>{const button={};const node={setAttribute(){},querySelector:()=>button,remove(){children.splice(children.indexOf(node),1);}};return node;},
  };
  try {
    guideFootball(f,()=>{}); assert.equal(f.guide.sendoffPending,true,'wait for the compact status host');
    mounted=true; guideFootball(f,()=>{}); assert.equal(children.length,1);
    assert.match(children[0].innerHTML,/the board will/); assert.equal(f.guide.sendoffShown,true);
    assert.equal(f.guide.sendoffPending,false); assert.equal(JSON.stringify(f.game),gameBefore); assert.equal(f.rngState,rng);
    children[0].querySelector('button').onclick(); assert.equal(children.length,0);
    guideFootball(f,()=>{}); assert.equal(children.length,0);
    guideFootball(JSON.parse(JSON.stringify(f)),()=>{}); assert.equal(children.length,0);
  } finally { if(previous===undefined) delete globalThis.document; else globalThis.document=previous; }
});


test('assignment guidance outlines beast-open controls, not Compare, Start or navigation', async () => {
  const {guideTargetSelectors,highlightGuideTarget}=await import('../src/ui/guided-week.js');
  const f=fresh();at(f,'roster');
  assert.deepEqual(guideTargetSelectors(f,'assign'),['[data-action="monster"]']);
  const nodes=Array.from({length:3},()=>{const marked=new Set();return {marked,disabled:false,closest:()=>null,getClientRects:()=>[{}],classList:{add:k=>marked.add(k),remove:k=>marked.delete(k)}};});
  const root={querySelectorAll:s=>s==='[data-action="monster"]'?nodes:[],querySelector:()=>null};
  highlightGuideTarget(f,'assign',root);assert.ok(nodes.every(n=>n.marked.has('guide-target')));
});
test('beast section guidance is limited to the early card lesson', async () => {
  const {beastSectionTourActive,visibleBeastSection}=await import('../src/ui/guided-week.js');
  const f=fresh();assert.equal(beastSectionTourActive(f),false);at(f,'beast');assert.equal(beastSectionTourActive(f),true);
  f.guide.skipPending=true;assert.equal(beastSectionTourActive(f),false);delete f.guide.skipPending;
  advanceGuide(f);assert.equal(beastSectionTourActive(f),false);
  assert.equal(visibleBeastSection([{id:'past',top:-300,bottom:20},{id:'ratings',top:100,bottom:140},{id:'below',top:800,bottom:900}],60,400),'ratings');
});
test('section tour waits for dismissal, persists acknowledgments, and closes safely on navigation', async () => {
  const {mountBeastSectionTips}=await import('../src/ui/guided-week.js');
  const f=fresh();at(f,'beast');const index=f.guide.index,rng=f.rngState;
  f.guide.cardSectionsSeen={bio:true,temper:true,ratings:true}; // Small tips do not suppress the revised tour.
  const listeners=new Map(),docListeners=new Map();let pending=null,modal=false,scroll=0,saves=0,open=null;
  const shown=[];const marked=new Set();
  const doc={querySelector:s=>s==='.sheet-backdrop'?(modal?{}:null):null,addEventListener:(k,v)=>docListeners.set(k,v),removeEventListener:k=>docListeners.delete(k)};
  const sections=['bio','temper','ratings','statistics'].map((id,i)=>({dataset:{guideSection:id},classList:{add:()=>marked.add(id),remove:()=>marked.delete(id)},getBoundingClientRect:()=>({top:100+i*900-scroll,bottom:150+i*900-scroll})}));
  const root={ownerDocument:doc,isConnected:true,querySelectorAll:()=>sections,getBoundingClientRect:()=>({bottom:4000-scroll})};
  const env={innerHeight:844,setTimeout:fn=>(pending=fn,1),clearTimeout:()=>{pending=null;},addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
  const show=(tip,dismiss)=>{shown.push(tip.id);modal=true;let closed=false;open={close(){if(closed)return;closed=true;modal=false;dismiss();}};return open;};
  const flush=()=>{const fn=pending;pending=null;fn?.();};
  const move=y=>{scroll=y;listeners.get('scroll')();flush();};
  let cleanup=mountBeastSectionTips(f,root,()=>saves++,env,show);flush();assert.deepEqual(shown,['bio']);
  assert.equal(f.guide.cardTourSeen,undefined,'opening is not acknowledgment');assert.ok(marked.has('bio'));
  move(900);assert.deepEqual(shown,['bio'],'no second popup while one is open');
  open.close();assert.equal(saves,1);assert.equal(f.guide.cardTourSeen.bio,true);assert.equal(marked.size,0);
  move(900);assert.deepEqual(shown,['bio','temper']);open.close();
  move(0);assert.equal(shown.length,2,'seen sections do not repeat');
  modal=true;move(1850);assert.equal(shown.length,2,'other sheets have priority');
  modal=false;docListeners.get('click')();flush();assert.equal(shown.at(-1),'ratings','section still triggers after its short heading has scrolled away');
  cleanup();assert.equal(saves,2,'navigation does not acknowledge an unread popup');assert.equal(modal,false);
  assert.equal(listeners.size,0);assert.equal(docListeners.size,0);assert.equal(marked.size,0);
  const loaded=JSON.parse(JSON.stringify(f));
  cleanup=mountBeastSectionTips(loaded,root,()=>saves++,env,show);flush();assert.equal(shown.at(-1),'ratings');open.close();
  move(0);assert.equal(shown.filter(id=>id==='bio').length,1,'reload retains acknowledged stops');
  move(2700);assert.equal(shown.at(-1),'statistics');open.close();
  assert.equal(loaded.guide.index,index);assert.equal(loaded.rngState,rng);cleanup();
});
test('coaches guidance teaches HQ first and its highlighted tab ignores remembered subpages', async () => {
  const {guideTargetSelectors,initGuidedWeek}=await import('../src/ui/guided-week.js');
  const f=fresh();at(f,'coaches');
  for(const screen of ['monster','roster','assign']) assert.deepEqual(guideTargetSelectors(f,screen),['[data-action="router-tab"][data-screen="hq"]']);
  assert.deepEqual(guideTargetSelectors(f,'hq'),['[data-action="go"][data-screen="staff"]']);
  assert.deepEqual(guideTargetSelectors(f,'staff'),[]);
  const previous=globalThis.document;let listener=null,route=null,stopped=false;
  globalThis.document={addEventListener:(type,fn)=>{listener=fn;}};
  try {
    initGuidedWeek({app:{f,save(){}},Router:{registerScreen(){},setGuard(){},currentScreen:()=>({name:'monster'}),go:(...args)=>{route=args;}}});
    const button={dataset:{action:'router-tab',screen:'hq'}};
    listener({target:{closest:()=>button},preventDefault(){},stopImmediatePropagation(){stopped=true;}});
    assert.equal(stopped,true);assert.deepEqual(route,['hq',{}, {reset:true}]);
    route=null;f.guide.enabled=false;
    listener({target:{closest:()=>button}});assert.equal(route,null,'normal tab history remains when guidance is off');
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('section tour reaches the last sections when the page bottoms out before they reach the reading line', async () => {
  const {mountBeastSectionTips}=await import('../src/ui/guided-week.js');
  const f=fresh();at(f,'beast');f.guide.cardTourSeen={bio:true,temper:true};
  // A phone at the bottom of the beast page: Ratings sits near the top, Statistics stops halfway down and can scroll no further.
  const listeners=new Map(),docListeners=new Map();let pending=null,modal=false,open=null;const shown=[];
  const doc={documentElement:{scrollHeight:4038},querySelector:s=>s==='.sheet-backdrop'?(modal?{}:null):null,addEventListener:(k,v)=>docListeners.set(k,v),removeEventListener:k=>docListeners.delete(k)};
  const tops={bio:-1600,temper:-700,ratings:68,statistics:537};
  const sections=Object.entries(tops).map(([id,top])=>({dataset:{guideSection:id},classList:{add(){},remove(){}},getBoundingClientRect:()=>({top,bottom:top+60})}));
  const root={ownerDocument:doc,isConnected:true,querySelectorAll:()=>sections,getBoundingClientRect:()=>({bottom:800})};
  const env={innerHeight:844,scrollY:3194,setTimeout:fn=>(pending=fn,1),clearTimeout:()=>{pending=null;},addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
  const show=(tip,dismiss)=>{shown.push(tip.id);modal=true;let closed=false;open={close(){if(closed)return;closed=true;modal=false;dismiss();}};return open;};
  const flush=()=>{const fn=pending;pending=null;fn?.();};
  const cleanup=mountBeastSectionTips(f,root,()=>{},env,show);flush();
  assert.deepEqual(shown,['ratings']);open.close();
  docListeners.get('click')();flush();
  assert.deepEqual(shown,['ratings','statistics'],'Statistics is shown at the bottom of the page');open.close();
  docListeners.get('click')();flush();assert.equal(shown.length,2,'nothing repeats');
  cleanup();
});

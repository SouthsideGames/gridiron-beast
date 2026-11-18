import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { generateDraftClass, startDraft, advanceDraft, playerPick, passPick } from '../src/franchise/draft.js';
import { joinAsDraftee } from '../src/franchise/league.js';
import { createFranchise } from '../src/franchise/franchise.js';
import { clubRoster, leagueClubs, verifyLeague } from '../src/franchise/league-registry.js';
import { trackRosterReviews, rosterReviewHtml, bestLineupChanges, bestLineupMessage } from '../src/ui/followup-polish.js';
import { coachEditorActions, coachEditorHtml } from '../src/ui/coach-editor.js';
import { DEFAULT_LOOK } from '../src/ui/coach-portrait.js';
const base = createFranchise({owner:{first:'Followup',last:'Test'},club:'Ember City Beasts',seed:398});
const fresh = () => structuredClone(base);
test('a rejected AI rookie becomes a pass, stays available, and can be drafted later', () => {
 const f={roster:[],draft:{year:1,class:generateDraftClass(createRng(17),{year:1}),revealed:{},picks:[]}};
 startDraft(f,['Mine','AI']);let rejected;
 const made=advanceDraft(f,createRng(8),{playerClub:'Mine',onAiPick:(_,m)=>{rejected=m;return {ok:false,reason:'Protected roster is full.'};}});
 assert.equal(made.length,0);assert.equal(f.draft.picks[0].passed,true);assert.equal(f.draft.picks[0].id,null);
 assert.ok(f.draft.available.includes(rejected.id));assert.equal(rejected.drafted,undefined);assert.equal(f.draftResults,undefined);
 assert.equal(playerPick(f,rejected.id,{playerClub:'Mine',nextYear:2}).ok,true);
 assert.equal(f.roster[0].id,rejected.id);assert.equal(f.draft.picks[1].id,rejected.id);
});
test('full protected real AI club cannot consume a prospect when ownership transfer fails', () => {
 const f=fresh(), club=leagueClubs(f)[0];
 const roster=clubRoster(f,club);for(const m of roster)m.signature=true;
 assert.equal(roster.length,38);
 f.draft={year:1,class:generateDraftClass(createRng(17),{year:1}),revealed:{},picks:[]};startDraft(f,[f.club,club]);
 const before=new Set(roster.map(m=>m.id));let candidate;
 advanceDraft(f,createRng(8),{playerClub:f.club,persist:false,onAiPick:(team,m)=>{candidate=m;return joinAsDraftee(f,team,m,{year:1});}});
 assert.ok(f.draft.available.includes(candidate.id));assert.equal(f.draft.picks[0].passed,true);
 assert.deepEqual(new Set(clubRoster(f,club).map(m=>m.id)),before);assert.equal(f.league.monsters[candidate.id],undefined);
});
test('successful AI picks have ownership before record, persist once, and every round advances', () => {
 const f={roster:[],draft:{year:1,class:generateDraftClass(createRng(77),{year:1}),revealed:{},picks:[]}},owned=new Set();startDraft(f,['Mine','AI']);
 let guard=0;while(!f.draft.done&&guard++<12){advanceDraft(f,createRng(guard),{playerClub:'Mine',onAiPick:(_,m)=>{assert.equal(f.draft.picks.some(p=>p.id===m.id),false);assert.ok(m.drafted);owned.add(m.id);return {ok:true};}});if(!f.draft.done)passPick(f,{playerClub:'Mine'});}
 assert.equal(f.draft.done,true);assert.equal(f.draft.picks.length,6);
 assert.deepEqual(new Set(f.draft.picks.filter(p=>p.id).map(p=>p.id)),owned);
 assert.equal(f.draftResults[1].AI.length,owned.size);
});
test('lineup review tracks acquisitions and healing, survives reload and does not repeat dismissals', () => {
 const f=fresh();trackRosterReviews(f);assert.equal(rosterReviewHtml(f),'');
 const m=f.roster[0];m.injury={weeks:1};trackRosterReviews(f);m.injury=null;
 trackRosterReviews(f);assert.ok(rosterReviewHtml(f).includes('is healthy again'));
 const newcomer={...f.roster[1],id:'new_joiner',name:'<New Beast>'};f.roster.push(newcomer);trackRosterReviews(f);
 assert.ok(rosterReviewHtml(f).includes('&lt;New Beast&gt;'));assert.equal(f.polish.rosterReviews.length,2);
 const loaded=JSON.parse(JSON.stringify(f));trackRosterReviews(loaded);assert.equal(loaded.polish.rosterReviews.length,2);
 loaded.polish.rosterReviews=[];trackRosterReviews(loaded);assert.equal(loaded.polish.rosterReviews.length,0);
 loaded.club='Other Club';trackRosterReviews(loaded);assert.equal(loaded.polish.rosterReviews.length,0);
});
test('Best Lineup preview agrees with actual slot changes and never changes the save', () => {
 const f=fresh();const pos=f.roster.find(m=>f.roster.filter(x=>x.position===m.position).length>=2).position;
 const group=f.roster.filter(m=>m.position===pos);f.lineupManual={};f.depth={[pos]:group.map(m=>m.id).reverse()};
 const before=JSON.stringify(f);const changes=bestLineupChanges(f);assert.equal(JSON.stringify(f),before);assert.ok(bestLineupMessage(f).length);
 for(const row of changes){assert.ok(row.slot);assert.notEqual(row.before,row.after);}
});
test('coach undo and restore cover chips, steppers and Surprise Me without changing the original', () => {
 const state={look:{...DEFAULT_LOOK},tab:'face'},original={...state.look};let draws=0;const actions=coachEditorActions(state,()=>draws++);
 actions['ce-random']();const random={...state.look};actions['ce-undo']();assert.deepEqual(state.look,original);
 actions['ce-random']();actions['ce-restore']();assert.deepEqual(state.look,original);actions['ce-undo']();assert.notDeepEqual(state.look,original);
 assert.deepEqual(state.originalLook,original);assert.ok(draws>=5);
 assert.match(coachEditorHtml(original),/ce-undo" disabled/);
 assert.doesNotMatch(coachEditorHtml(random,{canUndo:true}),/ce-undo" disabled/);
});

test('audio previews respect mute and zero volume, use the real bus, and cancel before a delayed resume', async () => {
 const {previewAudio,stopAudioPreview}=await import('../src/audio/settings-preview.js');
 const {audioPreferences,setAudioPreferences}=await import('../src/audio/context.js');
 const previous=audioPreferences(),previousAC=globalThis.AudioContext;
 const oscillators=[];let release;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}});
 class Context {
  constructor(){this.currentTime=0;this.destination={};this.state='running';}
  resume(){return release?new Promise(resolve=>{release.resolve=resolve;}):Promise.resolve();}
  createGain(){return {gain:param(),connect(){return this;},disconnect(){}};}
  createOscillator(){const node={frequency:param(),connect(){return this;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};oscillators.push(node);return node;}
 }
 try{
  globalThis.AudioContext=Context;
  setAudioPreferences({muted:true});assert.equal((await previewAudio('sfx')).ok,false);assert.equal(oscillators.length,0);
  setAudioPreferences({muted:false,sfx:0});assert.equal((await previewAudio('sfx')).ok,false);
  setAudioPreferences({sfx:.4});assert.equal((await previewAudio('sfx')).ok,true);assert.ok(oscillators[0].started&&oscillators[0].stopped);
  release={};const pending=previewAudio('crowd');stopAudioPreview();release.resolve();assert.equal((await pending).ok,false);assert.equal(oscillators.length,1);
 }finally{stopAudioPreview();setAudioPreferences(previous);if(previousAC===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=previousAC;}
});

test('explicit Watch resume clears the persisted pause without advancing any game state', async () => {
 const {pauseActivity,activityPaused,resumePlayback}=await import('../src/ui/activity.js');
 const f=fresh();(f.polish||={}).playbackPaused=true;pauseActivity();
 const before=JSON.stringify([f.rngState,f.game,f.week,f.season]);let saves=0;
 assert.equal(resumePlayback({f,save(){saves++;}},{notify:false}),true);
 assert.equal(activityPaused(),false);assert.equal(f.polish.playbackPaused,undefined);assert.equal(saves,1);
 assert.equal(JSON.stringify([f.rngState,f.game,f.week,f.season]),before);
});

test('completed real creation drafts account for every recorded rookie and survive JSON reload', async () => {
 const F=await import('../src/franchise/franchise.js');
 for(const seed of [21,77,398]){
  let f=F.createFranchise({owner:{first:'Draft',last:'Audit'},club:'Ember City Beasts',seed});
  let turns=0;while(!f.draft.done && turns++<8){assert.equal(F.passDraftPick(f).ok,true);f=JSON.parse(JSON.stringify(f));}
  assert.equal(f.draft.done,true);
  for(const pick of f.draft.picks.filter(p=>p.id)){
   const owner=pick.mine?f.roster:clubRoster(f,pick.team);
   assert.ok(owner.some(m=>m.id===pick.id),`seed ${seed}: ${pick.name} belongs to ${pick.team}`);
  }
  assert.deepEqual(verifyLeague(f),[]);
 }
});

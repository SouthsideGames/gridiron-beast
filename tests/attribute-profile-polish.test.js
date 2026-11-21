import test from 'node:test';
import assert from 'node:assert/strict';
import {createFranchise,hireDefaultStaff} from '../src/franchise/franchise.js';
import * as FR from '../src/core/fraction.js';
import {previewInvestment} from '../src/franchise/polish.js';
import {pointPlanner} from '../src/ui/polish.js';
import {positionRatingAttributes} from '../src/ui/position-ratings.js';
import {headlineHtml} from '../src/ui/screens/roster.js';
import {attributeHelps,POSITIONS} from '../src/data/stat-guide.js';
import {RECORD_CATEGORIES} from '../src/franchise/stats.js';
import {resolveCareer,playCareerProfileCry,careerPageHtml} from '../src/ui/screens/career.js';
import {monsterCryId} from '../src/audio/detail-audio.js';

const base=createFranchise({owner:{first:'Point',last:'Planner'},club:'Ember City Beasts',seed:312});hireDefaultStaff(base);
function planner(){
 const f=structuredClone(base),m=f.roster[0];m.dev.bank=FR.frac(5);m.points=5;
 const attr=Object.keys(m.dev.current).find(a=>previewInvestment(f,m.id,[a]).ok);assert.ok(attr);
 let click,resolve,askCount=0,saves=0,refreshes=0,onClose;
 const controls=new Map(),body={innerHTML:'',querySelector:q=>{if(!controls.has(q))controls.set(q,{});return controls.get(q);}};
 const close=()=>onClose();
 const app={f,save(){saves++;},polishRefresh(){refreshes++;}};
 const open=(_,options)=>{onClose=options.onClose;return{el:{querySelector:()=>body,addEventListener:(type,fn)=>{if(type==='click')click=fn;}},close};};
 const ask=message=>{assert.match(message,/permanently.*cannot be undone/);askCount++;return new Promise(r=>resolve=r);};
 const notices=[];pointPlanner(app,m.id,attr,{open,ask,notify:reason=>notices.push(reason)});
 return{f,m,attr,app,body,close,notices,click:action=>click({target:{closest:()=>({dataset:{polish:action}})}}),answer:v=>resolve(v),counts:()=>({askCount,saves,refreshes})};
}
test('planned increases are visibly marked; Undo restores the preview without spending',async()=>{
 const p=planner(),before=JSON.stringify(p.m);
 assert.match(p.body.innerHTML,/point-plan-row planned/);assert.match(p.body.innerHTML,/point-plan-actions/);
 await p.click('point-undo');assert.doesNotMatch(p.body.innerHTML,/point-plan-row planned/);assert.equal(JSON.stringify(p.m),before);
 await p.click('point-confirm');assert.equal(p.counts().askCount,0);
});
test('confirmation is required, cancel preserves points, and repeated taps commit only once',async()=>{
 const p=planner(),before=JSON.stringify(p.m),rng=p.f.rngState;
 const cancel=p.click('point-confirm');await p.click('point-confirm');assert.equal(p.counts().askCount,1);assert.equal(JSON.stringify(p.m),before);
 p.answer(false);await cancel;assert.equal(JSON.stringify(p.m),before);assert.equal(p.counts().saves,0);
 const confirm=p.click('point-confirm');p.answer(true);await confirm;await p.click('point-confirm');
 assert.notEqual(JSON.stringify(p.m),before);assert.equal(p.counts().saves,1);assert.equal(p.counts().refreshes,1);assert.equal(p.f.rngState,rng);
});
test('stale, closed or switched-franchise plans cannot spend after accepting the popup',async()=>{
 for(const change of [p=>p.close(),p=>p.app.f=structuredClone(p.f),p=>p.m.name+=' changed']){
  const p=planner(),pending=p.click('point-confirm');change(p);const before=JSON.stringify(p.f);
  p.answer(true);await pending;assert.equal(JSON.stringify(p.f),before);assert.equal(p.counts().saves,0);assert.equal(p.notices.length,1);
 }
});
test('each position gets relevant named attributes, with only Kicking and Awareness for kickers',()=>{
 for(const position of POSITIONS){
  const m={...base.roster[0],position},before=JSON.stringify(m),keys=positionRatingAttributes(position),html=headlineHtml(m);
  assert.ok(keys.length>=2&&keys.length<=4);assert.equal(new Set(keys).size,keys.length);
  for(const key of keys){assert.ok(attributeHelps(position,key),`${position}: ${key}`);assert.ok(html.includes(`data-rating="${key}"`));}
  assert.doesNotMatch(html,/>Hands<|>Smarts<|>Power</);assert.equal(JSON.stringify(m),before);
 }
 assert.deepEqual(positionRatingAttributes('K'),['kicking','awareness']);
 assert.deepEqual(positionRatingAttributes('QB'),['accuracy','awareness','arm','agility']);
});
test('records use the requested display labels without changing their stat IDs',()=>{
 for(const [id,label] of [['fgLong','Longest FG'],['pd','Passes Deflected'],['recYds','Receiving Yards']])assert.equal(RECORD_CATEGORIES.find(c=>c.id===id).label,label);
});
test('a records-linked career profile supplies the correct cry once on entry, not on tab redraws',()=>{
 const f=structuredClone(base),m=f.roster[0],params={id:m.id},r=resolveCareer({f},params),heard=[];let stops=0;
 assert.ok(r);const hooks={play:p=>heard.push(monsterCryId(p)),stop:()=>stops++};
 playCareerProfileCry(r.p,true,hooks);playCareerProfileCry(r.p,false,hooks);playCareerProfileCry(r.p,true,hooks);
 assert.deepEqual(heard,[monsterCryId(m),monsterCryId(m)]);assert.ok(heard[0]);assert.equal(stops,2);
 assert.doesNotMatch(careerPageHtml({f,settings:{}},params),/cp-status[^>]*title=/);
});

test('an opponent opened from Records keeps its species and evolved-form cry',()=>{
 const f=structuredClone(base),opponent=Object.values(f.league.monsters)[0];assert.ok(opponent);
 const r=resolveCareer({f},{id:opponent.id});assert.ok(r);let heard;
 playCareerProfileCry(r.p,true,{play:p=>heard=monsterCryId(p),stop(){}});
 assert.equal(heard,monsterCryId(opponent));assert.ok(heard);
 const html=headlineHtml({...base.roster[0],position:'K',attributes:{...base.roster[0].attributes,kicking:73,awareness:49,catching:99}});
 assert.match(html,/data-rating="kicking"[^]*?>73<\/span>/);assert.match(html,/data-rating="awareness"[^]*?>49<\/span>/);assert.doesNotMatch(html,/>99<\/span>/);
});

test('opening the profile starts a cry source on the cry bus; master mute and zero cry volume suppress it',async()=>{
 const {setAudioPreferences,audioPreferences}=await import('../src/audio/context.js');
 const {stopCry}=await import('../src/audio/monster-cries.js');
 const previous=audioPreferences(),previousAC=globalThis.AudioContext,sources=[];
 class AC {
  constructor(){this.state='running';this.currentTime=0;this.destination={};}
  resume(){return Promise.resolve();}
  createBuffer(channels,length,rate){return{length,sampleRate:rate,copyToChannel(data){assert.equal(data.length,length);}};}
  createGain(){return{gain:{value:0,setTargetAtTime(value){this.value=value;}},connect(to){this.to=to;return to;},disconnect(){}};}
  createBufferSource(){const source={connect(to){this.to=to;return to;},disconnect(){},start(){sources.push(this);},stop(){this.onended?.();}};return source;}
 }
 try{
  globalThis.AudioContext=AC;setAudioPreferences({muted:false,sfx:.7,cries:.6});
  const profile=resolveCareer({f:structuredClone(base)},{id:base.roster[0].id}).p;
  playCareerProfileCry(profile,true);await new Promise(r=>setImmediate(r));
  assert.equal(sources.length,1);assert.ok(sources[0].buffer.length>0);assert.equal(sources[0].to.to.gain.value,.6);
  setAudioPreferences({muted:true});playCareerProfileCry(profile,true);await new Promise(r=>setImmediate(r));assert.equal(sources.length,1);
  setAudioPreferences({muted:false,cries:0});playCareerProfileCry(profile,true);await new Promise(r=>setImmediate(r));assert.equal(sources.length,1);
 }finally{stopCry();setAudioPreferences(previous);if(previousAC===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=previousAC;}
});

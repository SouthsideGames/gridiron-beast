import test from 'node:test';
import assert from 'node:assert/strict';
import {createFranchise,myDraftPick,passDraftPick} from '../src/franchise/franchise.js';
import {draftShowPick,startDraftShow,nextDraftShow,draftShowHtml} from '../src/ui/draft-show.js';
import {registerMatchScreens} from '../src/ui/screens/match.js';
import {registerClashBattle} from '../src/ui/screens/clash-battle.js';
const base=createFranchise({owner:{first:'Show',last:'Draft'},club:'Ember City Beasts',seed:82});
const gameplay=f=>JSON.stringify({...f.draft,presentation:undefined,roster:f.roster,rng:f.rngState});
test('ceremonies replay committed AI picks from the first selection without altering ownership or RNG',()=>{
 const f=structuredClone(base),before=gameplay(f);startDraftShow(f.draft);
 for(let i=0;i<f.draft.picks.length;i++){
   const show=draftShowPick(f.draft);assert.equal(show.cursor,i);
   const html=draftShowHtml(f.draft);assert.ok(html.includes(show.pick.team));
   assert.equal(html.includes('draft-ceremony'),show.pick.round===1&&!show.pick.passed);
   assert.ok(nextDraftShow(f.draft,i));assert.equal(nextDraftShow(f.draft,i),false,'stale double tap cannot skip another pick');
 }
 assert.equal(draftShowPick(f.draft),null);assert.equal(gameplay(f),before);
});
test('a full real draft with replay, skips and reloads has identical results to the same draft without presentation',()=>{
 let plain=structuredClone(base),shown=structuredClone(base);
 let turns=0;
 while(!plain.draft.done){
  const id=plain.draft.available.at(-1),from=shown.draft.picks.length;
  if(turns++%3===1){assert.equal(passDraftPick(plain).ok,true);assert.equal(passDraftPick(shown).ok,true);}
  else{assert.equal(myDraftPick(plain,id).ok,true);assert.equal(myDraftPick(shown,id).ok,true);}
  const before=gameplay(shown);startDraftShow(shown.draft,from);
  while(draftShowPick(shown.draft)){
   const {cursor}=draftShowPick(shown.draft);
   shown.draft.presentation=JSON.parse(JSON.stringify(shown.draft.presentation));
   assert.equal(draftShowPick(shown.draft).cursor,cursor);
   nextDraftShow(shown.draft,cursor,turns%2===0);
  }
  assert.equal(gameplay(shown),before);assert.equal(gameplay(shown),gameplay(plain));
 }
 assert.equal(shown.draft.done,true);
});
test('legacy saves opt into replay safely, pass announcements show a reason, and later rounds do not stage a ceremony',()=>{
 const d={class:[],picks:[{round:1,overall:1,team:'Club',passed:true,why:'No room'}]};
 assert.equal(draftShowPick(d),null);startDraftShow(d);assert.match(draftShowHtml(d),/No room/);assert.doesNotMatch(draftShowHtml(d),/draft-ceremony/);
 const m=base.draft.class[0];d.class=[m];d.picks=[{round:2,overall:13,team:'Club',id:m.id,name:m.name,position:m.position}];
 assert.doesNotMatch(draftShowHtml(d),/draft-ceremony/);
 assert.ok(nextDraftShow(d,0,true));assert.equal(draftShowHtml(d),'');
});
test('pregame and Clash layouts render the real squads read-only and keep actions available',()=>{
 const f=structuredClone(base);f.draft.done=true;f.season.day=6;
 const screens=new Map();const Router={registerScreen:(id,x)=>screens.set(id,x)};
 registerMatchScreens(Router,{f});registerClashBattle(Router,{f});
 const before=JSON.stringify(f);const html=screens.get('pregame').render({f});
 assert.match(html,/pregame-team-tabs/);assert.match(html,/pregame-info/);assert.match(html,/data-action="toss">Beast Clash</);assert.doesNotMatch(html,/class="lineups"/);
 assert.equal(JSON.stringify(f),before);
 const clash=screens.get('clash-battle').render({f,params:{kind:'pregame'}});
 assert.match(clash,/clash-faceoff/);
 const face=clash.slice(clash.indexOf('clash-faceoff'),clash.indexOf('cl-setup-tabs'));
 assert.equal((face.match(/class="cl-face-beast /g)||[]).length,6,'all three beasts from both teams appear');
 assert.equal((face.match(/cl-face-0/g)||[]).length,2,'each side has one foreground starter');
 assert.doesNotMatch(clash,/data-action="help"/,'navbar provides Help');
 const pairs=html.match(/class="pregame-type-pair">[^]*?<\/p>[^]*?<\/div>/g)||[];
 assert.ok(pairs.length);for(const pair of pairs) assert.equal((pair.match(/class="sprite"/g)||[]).length,2);
 assert.doesNotMatch(html,/Weather is for atmosphere|situational, never ratings/);
 assert.match(clash,/data-action="enter"/);assert.doesNotMatch(clash,/<p class="muted">.*<button/);
});

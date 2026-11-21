import test from 'node:test';
import assert from 'node:assert/strict';
import {TabHistory,autoSpeed,cycleAutoSpeed,prepareLineupUndo,offseasonSteps} from '../src/ui/phone-navigation.js';
import {createToastQueue} from '../src/ui/toast-queue.js';
import * as F from '../src/franchise/franchise.js';
const base=F.createFranchise({owner:{first:'Phone',last:'Test'},club:'Ember City Beasts',seed:612});
const fresh=()=>structuredClone(base);
test('tab histories retain details, parameters and scroll, second tap resets, switching franchises clears them',()=>{
 const h=new TabHistory(),f={};h.reset(f);h.active='roster';
 const stack=[{name:'roster',params:{},scroll:50},{name:'monster',params:{id:'a'}}];
 assert.equal(h.switchTo('league',stack,350)[0].name,'league');
 const restored=h.switchTo('roster',[{name:'league',params:{}}],90);
 assert.equal(restored[1].params.id,'a');assert.equal(restored[1].scroll,350);assert.equal(restored[0].scroll,50);
 assert.deepEqual(h.switchTo('roster',restored,350),[{name:'roster',params:{}}]);
 f.club='New Club';h.reset(f);assert.equal(h.saved.size,0);assert.equal(h.active,null);h.reset({});assert.equal(h.saved.size,0);
});
test('Auto speed persists across games and JSON reload and cycles 1,2,4 without gameplay changes',()=>{
 const f=fresh(),rng=f.rngState,roster=JSON.stringify(f.roster);f.game={autoSpeed:2};assert.equal(autoSpeed(f),2);
 assert.equal(cycleAutoSpeed(f),4);delete f.game;assert.equal(autoSpeed(JSON.parse(JSON.stringify(f))),4);
 assert.equal(cycleAutoSpeed(f),1);assert.equal(cycleAutoSpeed(f),2);assert.equal(f.rngState,rng);assert.equal(JSON.stringify(f.roster),roster);
 f.settings.autoSpeed=99;f.game={autoSpeed:-1};assert.equal(autoSpeed(f),1);
});
test('lineup Undo restores only its own edit once, refusing intervening roster, game or lineup changes',()=>{
 for(const change of ['none','saved','roster','game','lineup']){
  const f=fresh(),before=JSON.stringify([f.depth,f.lineupManual]),ready=prepareLineupUndo(f);
  F.autoDepth(f);const undo=ready();
  if(change==='saved')f.savedAt=(f.savedAt||0)+1000; // the store stamps every save; that is not a team change
  if(change==='roster')f.roster[0].fatigue+=1;
  if(change==='game')f.game={playCount:1};
  if(change==='lineup')f.lineupManual={QB:'other'};
  assert.equal(undo(),change==='none'||change==='saved',change);
  if(change==='none'||change==='saved'){assert.equal(JSON.stringify([f.depth,f.lineupManual]),before);assert.equal(undo(),false);}
 }
});
test('toast messages keep FIFO reading time and dismiss advances without overwriting pending messages',()=>{
 const shown=[],hidden=[],timers=new Map();let id=0;
 const q=createToastQueue(x=>shown.push(x.text),()=>hidden.push(1),{set:fn=>{timers.set(++id,fn);return id;},clear:n=>timers.delete(n)});
 q.push({text:'Signed',ms:2600});q.push({text:'Training',ms:2600});q.push({text:'Injury',ms:6000});assert.deepEqual(shown,['Signed']);
 const fire=()=>{const [n,fn]=timers.entries().next().value;timers.delete(n);fn();};
 fire();assert.deepEqual(shown,['Signed','Training']);q.dismiss();assert.deepEqual(shown,['Signed','Training','Injury']);fire();assert.equal(q.active,null);assert.equal(timers.size,0);
});
test('offseason checklist exposes every blocker without changing the save or RNG',()=>{
 const f=fresh();f.season.finished=true;f.offseason={items:[]};const before=JSON.stringify(f);
 const rows=offseasonSteps(f);assert.equal(JSON.stringify(f),before);
 for(const id of ['contracts','free-agency','draft','staff','hall','roster','legendary','lineup','postseason','career'])assert.ok(rows.some(r=>r.id===id),id);
 const qb=f.roster.filter(m=>m.position==='QB');for(const m of qb)m.injury={weeks:1};
 assert.equal(offseasonSteps(f).find(r=>r.id==='lineup').done,false);
 f.roster=[];assert.equal(offseasonSteps(f).find(r=>r.id==='roster').done,false);
});
test('real router restores tab detail and Android Back closes the top sheet before navigation',async()=>{
 const oldDoc=globalThis.document,oldWindow=globalThis.window;let sheets=[];
 const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
 globalThis.document={querySelector:()=>root,querySelectorAll:()=>sheets};
 globalThis.window={scrollY:0,scrollTo(_,y){this.scrollY=y;}};
 try{
  const R=await import('../src/ui/router.js');let f={uid:'one'};
  for(const name of ['hq','roster','monster','league'])R.registerScreen(name,{title:name,render:()=>''});
  R.init({root,context:()=>({f}),tabs:(_,name)=>['hq','roster','league'].map(screen=>({screen,label:screen,icon:'',active:name===screen||name==='monster'&&screen==='roster'}))});
  R.go('roster',{}, {reset:true});window.scrollY=80;R.go('monster',{id:'beast'});window.scrollY=300;
  R.switchTab('league');window.scrollY=140;R.switchTab('roster');assert.equal(R.currentScreen().name,'monster');assert.equal(window.scrollY,300);
  sheets=[{__closeSheet(){sheets.pop();}}];R.nativeBack();assert.equal(R.currentScreen().name,'monster');assert.equal(sheets.length,0);
  R.nativeBack();assert.equal(R.currentScreen().name,'roster');assert.equal(window.scrollY,80);
  R.switchTab('league');assert.equal(window.scrollY,140);R.switchTab('league');assert.equal(window.scrollY,0);
  f={uid:'two'};R.go('hq',{}, {reset:true});R.switchTab('roster');assert.equal(R.currentScreen().name,'roster');assert.equal(window.scrollY,0);
 }finally{if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});

test('Release is inside Manage while Career remains outside, and HQ exposes one main action',async()=>{
 const f=fresh();F.hireDefaultStaff(f);const screens=new Map();const router={registerScreen:(name,screen)=>screens.set(name,screen)};
 const app={f,settings:f.settings,save(){}};
 const {registerRosterScreens}=await import('../src/ui/screens/roster.js');registerRosterScreens(router,app);
 const html=screens.get('monster').render({f,params:{id:f.roster[0].id}});
 const manage=html.indexOf('<details class="phone-manage">'),release=html.indexOf('data-action="release"'),end=html.indexOf('</details>',manage);
 assert.ok(manage<release&&release<end);assert.ok(html.indexOf('data-action="career-jump"')<manage);
 const original=globalThis.document;globalThis.document={addEventListener(){}};
 try{const {registerHqScreens}=await import('../src/ui/screens/hq.js');registerHqScreens(router,app);
 const hq=screens.get('hq').render({f});assert.equal((hq.match(/data-phone-next/g)||[]).length,1);}
 finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

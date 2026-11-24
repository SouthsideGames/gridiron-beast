import test from 'node:test';
import assert from 'node:assert/strict';
import {createFranchise,hireDefaultStaff,devSlotsView} from '../src/franchise/franchise.js';
import {registerRosterScreens} from '../src/ui/screens/roster.js';
import {polishHeader} from '../src/ui/polish.js';
import {setBrowsePreferences} from '../src/franchise/polish.js';
import {t} from '../src/text/index.js';
const base=createFranchise({owner:{first:'Compact',last:'Roster'},club:'Ember City Beasts',seed:312});hireDefaultStaff(base);
function fixture(){
 const f=structuredClone(base),screens=new Map();let saves=0;
 const app={f,save(){saves++;}},router={registerScreen:(name,screen)=>screens.set(name,screen),render(){},go(){}};
 registerRosterScreens(router,app);const screen=screens.get('roster'),listeners={},info={hidden:true};
 const root={contains:()=>true,querySelector:()=>info,addEventListener:(name,fn)=>(listeners[name]||=[]).push(fn)};
 screen.mount(root);
 const emit=(name,target)=>{for(const fn of listeners[name]||[])fn({target,preventDefault(){}});};
 const infoButton={dataset:{action:'roster-info'},setAttribute(name,value){this[name]=value;}};
 return{f,screen,app,info,infoButton,saves:()=>saves,render:entering=>screen.render({f,entering}),toggle:(key,open)=>emit('toggle',{dataset:{rosterSection:key},open}),pressInfo:()=>emit('click',{closest:()=>infoButton})};
}
const tag=(html,key)=>html.match(new RegExp(`<details[^>]*data-roster-section="${key}"[^>]*>`))?.[0];
test('Search & Filters starts closed without losing saved filters or their visible active indicator',()=>{
 const {f,app}=fixture();
 let html=polishHeader({f,app},'roster');assert.match(html,/<details class="roster-search[^>]*>/);
 assert.doesNotMatch(html.match(/<details[^>]*>/)[0],/\bopen\b/);assert.match(html,/data-roster-filter-active hidden/);
 setBrowsePreferences(f,'roster',{query:'Pelligin',needed:true});html=polishHeader({f,app},'roster');
 assert.match(html,/data-polish-search value="Pelligin"/);assert.match(html,/data-polish-filter="needed" checked/);
 assert.doesNotMatch(html,/data-roster-filter-active hidden/);assert.doesNotMatch(html.match(/<details[^>]*>/)[0],/\bopen\b/);
 assert.match(html,/<div class="roster-shortcuts">[^]*?data-polish="shortlist-page"[^]*?data-polish="presets-lineup"/);
});
test('reserves and development start closed, retain manual expansion across redraws, and reset on a new visit',()=>{
 const x=fixture(),html=x.render(true),before=JSON.stringify(devSlotsView(x.f));
 for(const key of ['reserves','development']){assert.ok(tag(html,key));assert.doesNotMatch(tag(html,key),/\bopen\b/);x.toggle(key,true);}
 const open=x.render(false);for(const key of ['reserves','development'])assert.match(tag(open,key),/\bopen\b/);
 x.toggle('reserves',false);assert.doesNotMatch(tag(x.render(false),'reserves'),/\bopen\b/);
 const reentered=x.render(true);for(const key of ['reserves','development'])assert.doesNotMatch(tag(reentered,key),/\bopen\b/);
 assert.equal(JSON.stringify(devSlotsView(x.f)),before);assert.equal(x.saves(),0);
});
test('the square info control reveals and hides all lineup explanations without changing the team',()=>{
 const x=fixture(),html=x.render(true),before=JSON.stringify(x.f);
 assert.match(html,/data-action="bestlineup"[^]*?class="btn small roster-info-toggle"/);
 assert.match(html,/<section id="roster-lineup-info"[^>]*hidden>/);
 const infoHtml=html.match(/<section id="roster-lineup-info"[^]*?<\/section>/)[0];
 assert.ok(infoHtml.includes(t('roster.your_seven_starters_tap_a_slot')));assert.ok(infoHtml.includes(t('roster.gold_outline')));
 assert.doesNotMatch(html.replace(infoHtml,''),/Your seven starters|replacing a starter for that snap|starters fit Balanced/);
 x.pressInfo();assert.equal(x.info.hidden,false);assert.equal(x.infoButton['aria-expanded'],'true');
 assert.doesNotMatch(x.render(false).match(/<section id="roster-lineup-info"[^>]*>/)[0],/\bhidden\b/);
 x.pressInfo();assert.equal(x.info.hidden,true);assert.equal(x.infoButton['aria-expanded'],'false');
 assert.equal(JSON.stringify(x.f),before);assert.equal(x.saves(),0);
});
test('development summary uses current exact rewards and simple non-starter wording',()=>{
 const x=fixture(),html=x.render(true),text=html.match(/data-roster-section="development"[^]*?<p class="dim">([^]*?)<\/p>/)[1];
 assert.match(text,/age 25 or younger/);assert.match(text,/don’t start/);assert.match(text,/\+12\.5 level XP/);assert.match(text,/6\.25% of a training bar/);assert.match(text,/Level 50/);
 assert.ok(text.replace(/<[^>]+>/g,'').split(/\s+/).length<45);
 assert.doesNotMatch(text,/at least 3|quarter of|planned replacements|Limit:/);
});
test('the draft and the market fold their search and filters into a closed drop-down too (owner 2026-11-24)', async () => {
  const { polishHeader } = await import('../src/ui/polish.js');
  const F = await import('../src/franchise/franchise.js');
  const f = F.createFranchise({ owner: { first: 'D', last: 'F' }, club: 'Goldhaven Royals', seed: 91 }); F.hireDefaultStaff(f);
  for (const name of ['draft', 'famarket']) {
    const html = polishHeader({ f, app: {} }, name);
    assert.match(html, /<details class="roster-search panel tight polish-browse">/, name); assert.doesNotMatch(html, /<details class="roster-search[^>]*\sopen/, `${name}: closed`);
    assert.match(html, /data-roster-filter-active hidden/, `${name}: no filter on`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { franchiseTabs, TAB_OF } from '../src/ui/phone-navigation.js';
import { polishHeader } from '../src/ui/polish.js';
import { registerHqScreens } from '../src/ui/screens/hq.js';
import { registerMenuScreens } from '../src/ui/screens/menu.js';
import { t } from '../src/text/index.js';

function fresh() {
  const f = F.createFranchise({owner:{first:'Quiet',last:'HQ'},club:'Ember City Beasts',seed:612});
  F.hireDefaultStaff(f); f.draft.done=true;
  for (const m of f.roster) { m.level=1; m.points=0; m.injury=null; }
  return f;
}
function register(f) {
  const original=globalThis.document, screens=new Map();
  let route=null;
  const Router={registerScreen:(name,screen)=>screens.set(name,screen),go:(...args)=>{route=args;}};
  const app={f,settings:f.settings,save(){}};
  globalThis.document={addEventListener(){}};
  try { registerHqScreens(Router,app); registerMenuScreens(Router,app); }
  finally { if(original===undefined)delete globalThis.document;else globalThis.document=original; }
  return {screens,app,route:()=>route};
}
test('quiet HQ keeps its permanent sections and omits empty deals and GM Career',()=>{
  const f=fresh(),{screens}=register(f);
  const html=screens.get('hq').render({f});
  assert.ok(html.includes(t('hq.this_week')));
  assert.ok(html.includes(`<details class="polish-secondary hq-team-story" open><summary>${t('polish.team_story')}</summary>`));
  assert.ok(html.includes(`<details class="polish-secondary hq-news" open><summary>${t('polish.league_news')}</summary>`));
  assert.doesNotMatch(html,/polish-deals|<summary>GM Career<\/summary>/);
  assert.equal((html.match(/data-phone-next/g)||[]).length,1);
  assert.ok(screens.get('playbook').back!==false,'Game Plan detail browsing retains Back after removing the Plays tab');
});
test('HQ deals appear for a waiting offer and disappear after declining or expiration',()=>{
  const f=fresh(); f.season.week=F.FIRST_TRADE_WEEK;
  const {screens}=register(f), render=()=>screens.get('hq').render({f});
  assert.equal(F.tradeWindow(f).calls,true);assert.doesNotMatch(render(),/polish-deals/);
  const player=f.roster.find(m=>m.position==='WR');
  const offer={team:'Stonehaven Bastions',give:[],player:{...player,ovr:40},expires:`wk:${f.season.year}:${f.season.week}`};
  f.tradeCall=structuredClone(offer);
  assert.match(render(),/polish-deals" open/);assert.match(render(),/data-call="yes"/);assert.match(render(),/data-call="no"/);
  assert.equal(F.answerTradeCall(f,false).ok,true);assert.doesNotMatch(render(),/polish-deals/);
  f.tradeCall={...offer,expires:'wk:0:0'};assert.doesNotMatch(render(),/polish-deals/);
});
test('Needs Your Decision exists only while a real action is waiting',()=>{
  const f=fresh(),ctx={f,app:{save(){}}};
  assert.doesNotMatch(polishHeader(ctx,'hq'),/polish-notices/);
  for(const m of f.roster.filter(m=>m.position==='QB'))m.injury={weeks:1};
  assert.match(polishHeader(ctx,'hq'),/polish-notices" open/);
  for(const m of f.roster)m.injury=null;
  assert.doesNotMatch(polishHeader(ctx,'hq'),/polish-notices/);
});
test('Map takes the tab bar slot; My Office opens from HQ and owns GM Career and appearance',()=>{
  const f=fresh(),{screens,route}=register(f);
  const tabs=franchiseTabs(f,'map');
  assert.deepEqual(tabs.map(x=>x.screen),['hq','roster','map','league','more']);
  assert.equal(tabs[2].label,'Map');assert.equal(tabs[2].active,true);
  for(const screen of ['office','coach-look','gm-jobs'])assert.equal(franchiseTabs(f,screen).find(x=>x.active)?.screen,'hq');
  assert.notEqual(screens.get('office').back,false,'My Office is reached from HQ, so it has Back');
  for(const screen of ['gameplan','playbook','playdetail'])assert.equal(TAB_OF[screen],'hq');
  assert.equal(franchiseTabs(null,'hq'),null);
  const office=screens.get('office').render({f}),more=screens.get('more').render({f});
  assert.match(office,/data-action="gmcareer"/);assert.doesNotMatch(more,/data-screen="office"|data-screen="playbook"/);
  let click;
  const root={addEventListener:(name,fn)=>{if(name==='click')click=fn;},contains:()=>true};
  screens.get('office').mount(root);
  click({target:{closest:()=>({dataset:{action:'gmcareer'}})},preventDefault(){}});
  assert.deepEqual(route(),['gm-jobs']);
});
test('HQ links: My Office under History & Records; no League Hub or Standings (they are under League)',()=>{
  const f=fresh(),{screens}=register(f);
  const links=screens.get('hq').render({f}).split('hq-links')[1].split('</div>')[0];
  const order=[...links.matchAll(/data-screen="([a-z-]+)"/g)].map(m=>m[1]);
  assert.deepEqual(order,['schedule','history','staff','office']);
  assert.equal(order.indexOf('office')-order.indexOf('history'),2,'second column, directly under History & Records');
});
test('More: one Guide button holds the stat guide, Type Chart and Stadiums; no Developer button',()=>{
  const f=fresh(),{screens}=register(f);
  const more=screens.get('more').render({f}),guide=screens.get('guide').render({f});
  assert.match(more,/data-screen="guide"/);
  assert.doesNotMatch(more,/data-action="(statguide|typechart|stadiums)"|data-screen="developer"/);
  for(const a of ['statguide','typechart','stadiums'])assert.match(guide,new RegExp(`data-action="${a}"`));
  assert.equal(TAB_OF.guide,'more');
});

test('HQ marks the current weekly stage and shows the last result in the collapsed recap', () => {
  const f = fresh();
  f.season.week = 2;
  f.season.day = 2;
  f.lastGame = { year: f.season.year, week: 1, won: true, playerScore: 24, oppScore: 17,
    opponent: 'Example Club', events: [{ kind: 'levelup', name: 'Puff', level: 2 }, { kind: 'injury', name: 'Frost', weeks: 1 }] };
  const { screens } = register(f);
  const render = () => screens.get('hq').render({ f });
  const html = render();
  assert.match(html, /aria-current="step"[^>]*Wednesday/);
  assert.match(html, /<span aria-hidden="true">✓ <\/span>Mon/);
  const recap = html.match(/<details class="polish-secondary hq-last-game"><summary>([\s\S]*?)<\/summary>/)?.[1];
  assert.match(recap, /24–17 · Example Club/);
  assert.match(recap, /Growth updates: 1 · 1 injured/);
  assert.doesNotMatch(recap, /Puff|Frost/);
  assert.match(html, /Puff Lv 2/);
  f.lastGame.bye = true;
  assert.doesNotMatch(render(), /hq-last-game/);
});

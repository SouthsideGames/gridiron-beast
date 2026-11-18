import * as FR from '../core/fraction.js';
import { isArchived } from '../franchise/lifecycle.js';
// Shared phone-first franchise controls. Game decisions still use existing engine APIs.
import * as F from '../franchise/franchise.js';
import { editPolish, polishState, toggleShortlist, shortlisted, draftScope, browsePreferences, setBrowsePreferences, matchesSearch, previewInvestment, commitInvestment, savePreset, lineupPresetPreview, replacementFor, shortPositionRoute } from '../franchise/polish.js';
import { rookieCharge } from '../franchise/draft.js';
import { monsterOverall } from '../data/monsters.js';
import { ATTRIBUTES } from '../data/personnel.js';
import { ATTR_NAME } from '../data/stat-guide.js';
import { PLAYS } from '../data/playbook.js';
import { buildDepthChart } from '../franchise/roster.js';
import { rosterWarnings } from '../franchise/assist-advice.js';
import { guideActive } from '../franchise/guide.js';
import { t, lineText } from '../text/index.js';
import { esc, sheet, toast, fmtMoney, fmtClock, confirmSheet } from './dom.js';
import { activityPaused, pauseActivity, resumeActivity } from './activity.js';
const buttons = (action,label,id='') => `<button class="btn small" data-polish="${action}" data-id="${esc(id)}" ${action==='point-add'?`aria-label="${esc(t('roster.invest_1_point_in',{attr:ATTR_NAME[id],cost:''}))}"`:''}>${label}</button>`;
const unknown = () => t('shared.unknown_value');
const attrOrder = {QB:['accuracy','arm','awareness','speed'],RB:['speed','agility','strength','catching'],WR:['catching','speed','agility','awareness'],TE:['catching','blocking','strength','speed'],OL:['blocking','strength','awareness','durability'],DL:['strength','tackling','speed','awareness'],LB:['tackling','awareness','coverage','speed'],CB:['coverage','speed','agility','awareness'],S:['coverage','tackling','awareness','speed'],K:['kicking','accuracy','awareness','durability']};
/** The comparison table's rows: [label, candidate, current beast]. Unknown candidate values stay ???; a salary appears only when
 * the caller's own card would show it (`salaryKnown`, which defaults to `ovrKnown`, since an asking price follows the ratings). */
export function comparisonRows(f, m, against, { ovrKnown=true, attrsKnown=true, potentialKnown=true, salaryKnown=ovrKnown, salary=null }={}) {
  const cell=(value,known=true)=>known&&value!=null?esc(value):unknown();
  return [[t('polish.overall'),ovrKnown?cell(monsterOverall(m)):unknown(),against?cell(monsterOverall(against)):unknown()],
      [t('polish.age'),cell(m.age),cell(against?.age)],
      [t('polish.salary'),salaryKnown?fmtMoney(salary??m.salary):unknown(),against?fmtMoney(against.salary):unknown()],
      [t('polish.potential'),potentialKnown?cell(m.potential):unknown(),cell(against?.potential)],
      [t('polish.fatigue'),cell(m.fatigue),cell(against?.fatigue)],
      [t('polish.scheme_fit'), attrsKnown ? (F.fitFor(f,m)?.fits ? t('polish.fits') : t('polish.off_scheme')) : unknown(), against ? (F.fitFor(f,against)?.fits ? t('polish.fits') : t('polish.off_scheme')) : unknown()],
      ... (attrOrder[m.position]||[]).map(a=>[ATTR_NAME[a],attrsKnown?cell(m.attributes?.[a]):unknown(),cell(against?.attributes?.[a])])];
}
export function compareBeast(f, m, opts={}) {
  let against=replacementFor(f,m);
  const choices=f.roster.filter(x=>x.position===m.position&&x.id!==m.id);
  const {el}=sheet('',{title:t('hq.vs_your_s', { name: m.name, position: m.position })});
  const draw=()=>{
    const rows=comparisonRows(f,m,against,opts);
    el.querySelector('.sheet-body').innerHTML=`<label>${t('polish.compare_with')}<select data-compare-target>${choices.map(x=>`<option value="${esc(x.id)}" ${x.id===against?.id?'selected':''}>${esc(x.name)}${x.injury?' · '+t('polish.injured'):''}</option>`).join('')}</select></label><table class="polish-comparison"><thead><tr><th>${esc(m.position)}</th><th>${esc(m.name)}</th><th>${against?esc(against.name):t('polish.no_starter')}</th></tr></thead><tbody>${rows.map(([label,a,b])=>`<tr><th>${label}</th><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>`;
  };
  el.addEventListener('change',e=>{if(e.target.matches('[data-compare-target]')){against=choices.find(x=>x.id===e.target.value);draw();}});draw();
}
export function pointPlanner(app,id,initialAttribute=null) {
  const f=app.f;if(isArchived(f))return; let attrs=initialAttribute&&previewInvestment(f,id,[initialAttribute]).ok?[initialAttribute]:[]; let committed=false;
  const {el,close}=sheet('',{title:t('polish.plan_points')});
  let shown=null; // the preview on screen: Confirm commits this one, so a change to the beast since it was drawn is refused
  const draw=()=>{
    const m=f.roster.find(x=>x.id===id);if(!m){close();return;}
    const pv=previewInvestment(f,id,attrs);shown=pv;const after=pv.monster||m;
    const body=el.querySelector('.sheet-body');
    body.innerHTML=`<b>${esc(m.name)}</b><p>${t('polish.preview_only')}</p><p>${t('polish.points_left',{points:FR.toNumber(after.dev.bank).toLocaleString('en-US',{maximumFractionDigits:2})})}</p><div class="stack">${ATTRIBUTES.map(a=>`<div class="row between"><span>${ATTR_NAME[a]}: ${m.attributes[a]} → <b>${after.attributes[a]}</b></span>${buttons('point-add','+',a)}</div>`).join('')}</div><div class="polish-actions"><span>${t('polish.investments',{n:attrs.length})}</span>${buttons('point-undo',t('polish.undo'))}${buttons('point-confirm',t('polish.confirm'))}</div>`;
  };
  el.addEventListener('click',e=>{
    const b=e.target.closest('[data-polish]');if(!b||committed)return;
    if(b.dataset.polish==='point-add') {const next=previewInvestment(f,id,[...attrs,b.dataset.id]);if(!next.ok){toast(next.reason,'bad');return;}attrs.push(b.dataset.id);draw();}
    if(b.dataset.polish==='point-undo'){attrs.pop();draw();}
    if(b.dataset.polish==='point-confirm'){
      const r=commitInvestment(f,shown,{locked:app.f!==f||isArchived(f)||F.pointsLocked(f)});
      if(!r.ok){toast(r.reason,'bad');return;}committed=true;app.save();close();app.polishRefresh?.();
    }
  });draw();
}
export function presetsSheet(app,Router,kind) {
  const f=app.f; const state=editPolish(f);state.presets||={lineup:[],plan:[]};state.presets.lineup||=[];state.presets.plan||=[];
  const {el,close}=sheet('',{title:kind==='lineup'?t('polish.lineup_presets'):t('polish.plan_presets')});
  const draw=()=>{el.querySelector('.sheet-body').innerHTML=`<label>${t('polish.preset_name')}<input data-preset-name maxlength="32" autocomplete="off"></label>${buttons('preset-save',t('polish.save_setup'))}<div class="stack">${state.presets[kind].filter(x=>x.club===f.club).map((x,i)=>`<div class="row between"><b>${esc(x.name)}</b>${buttons('preset-load',t('polish.review'),i)}${buttons('preset-delete',t('polish.remove'),i)}</div>`).join('')}</div>`;};
  el.addEventListener('click',async e=>{
    const b=e.target.closest('[data-polish]');if(!b)return;
    const list=state.presets[kind].filter(x=>x.club===f.club),p=list[Number(b.dataset.id)];
    if(b.dataset.polish==='preset-save'){
      const data=kind==='lineup'?{manual:f.lineupManual||{},depth:Object.fromEntries(Object.keys(F.GROUP_SLOTS).map(g=>[g,F.depthList(f,g)]))}:getPlanDraft(f);
      if(!savePreset(f,kind,el.querySelector('[data-preset-name]').value,data)){toast(t('polish.preset_limit'),'bad');return;}app.save();draw();
    }
    if(b.dataset.polish==='preset-delete'&&p&&await confirmSheet(p.name,{title:t('polish.remove_setup')})){state.presets[kind].splice(state.presets[kind].indexOf(p),1);app.save();draw();}
    if(b.dataset.polish==='preset-load'&&p){
      if(kind==='lineup'){
        const pv=lineupPresetPreview(f,p);if(!pv.ok){toast(t('polish.setup_unavailable'),'bad');return;}
        const detail=(pv.gone.length?t('polish.setup_adjustments',{n:pv.gone.length})+'\n':'')+pv.changes.map(x=>`${x.slot}: ${f.roster.find(m=>m.id===x.before)?.name||unknown()} → ${f.roster.find(m=>m.id===x.id)?.name||unknown()}`).join('\n');
        if(!await confirmSheet(detail||t('polish.no_changes'),{title:t('polish.apply_setup')}))return;
        const current=lineupPresetPreview(f,p);if(!current.ok){toast(t('polish.changed'),'bad');return;}
        f.depth=current.depth;f.lineupManual=current.manual;app.save();close();Router.render();
      }else{
        const cats={offense:F.catalog(f,'offense').concat(F.legendaryAvailable(f,'offense')),defense:F.catalog(f,'defense').concat(F.legendaryAvailable(f,'defense'))};
        if(!['offense','defense'].every(s=>p.data[s]?.length===F.PLAN_SIZE&&p.data[s].every(id=>cats[s].includes(id)))){toast(t('polish.setup_unavailable'),'bad');return;}
        if(!await confirmSheet(['offense','defense'].map(s=>p.data[s].map(id=>PLAYS[id]?.name||id).join(', ')).join('\n'),{title:t('polish.apply_setup')}))return;
        state.planDraft={stamp:planStamp(f),...structuredClone(p.data)};app.save();close();Router.render();
      }
    }
  });draw();
}
const planStamp=f=>[f.uid||f.seed,f.club,f.season.year,f.season.week,f.season.day].join('|');
export function getPlanDraft(f) {
  const saved=polishState(f).planDraft;
  return saved?.stamp===planStamp(f)?saved:{offense:F.startingPlan(f,'offense'),defense:F.startingPlan(f,'defense')};
}
export function storePlanDraft(f,sel){editPolish(f).planDraft={stamp:planStamp(f),offense:[...sel.offense],defense:[...sel.defense]};}
export function offerResolutionText(f,offers) {
  return offers.map(o=>{
    const m=f.roster.find(m=>m.id===o.mid)||F.freeAgentMarket(f).find(x=>x.monster.id===o.mid)?.monster;
    return `${m?.name||o.name||unknown()}: ${fmtMoney(o.salary)} × ${o.years}`;
  }).join('\n');
}
export function offseasonTracker(f) {
  if(!f.offseason)return '';
  const stages=[[t('polish.contracts'),F.offseasonReady(f)],[t('polish.free_agency'),F.freeAgencyDone(f)],[t('polish.draft'),F.draftDone(f)],[t('polish.team_ready'),f.roster.length>=F.ROSTER_MIN&&!F.nextStaffRole(f)&&!F.legendCompliance(f)?.due]];
  return `<div class="panel tight polish-progress">${stages.map(([name,done])=>`<span class="chip ${done?'good':''}">${done?'✓ ':''}${name}</span>`).join('')}</div>`;
}
export function polishHeader(ctx,name) {
  const {f}=ctx;if(!f?.roster||isArchived(f))return '';
  let out='';
  if(polishState(f).playbackPaused && ['match','clash-battle'].includes(name))pauseActivity();
  if(activityPaused()&&['match','clash-battle'].includes(name))out+=`<div class="panel polish-paused" role="status"><b>${t('polish.paused')}</b>${buttons('resume',t('polish.resume'))}</div>`;
  if(name==='hq'&&!guideActive(f)){
    const warnings=rosterWarnings(f,{all:true});const notes=F.notices(f).concat(f.roster.filter(m=>m.injury).map(m=>({screen:'assign',slot:F.GROUP_SLOTS[m.position]?.[0]||m.position,kind:'injury',text:t('polish.injury_action',{name:m.name,position:m.position})})));const unique=[...new Map([...warnings.map(w=>({...w,text:w.text})),...notes].map(x=>[x.text,x])).values()];
    out+=`<details class="panel tight polish-notices"><summary>${t('polish.decisions',{n:unique.length})}</summary><div class="stack">${unique.map(x=>`<button class="btn block" data-polish="go" data-screen="${esc(x.id?'monster':x.screen||'roster')}" data-id="${esc(x.id||'')}" data-slot="${esc(x.slot||'')}" data-kind="${esc(x.kind||'')}">${esc(x.text)}</button>`).join('')}</div><details><summary>${t('polish.team_updates')}</summary>${(f.news||[]).slice(-5).reverse().map(x=>`<p>${esc(lineText(x))}</p>`).join('')}</details></details>`;
  }
  if(name==='offseason')out+=offseasonTracker(f);
  if(['roster','contracts','famarket','draft','draftclass'].includes(name)){
    const prefs=browsePreferences(f,name);
    out+=`<div class="panel tight polish-browse"><label>${t('polish.search')}<input type="search" data-polish-search value="${esc(prefs.query||'')}" autocomplete="off"></label><div class="row wrap">${['shortlist','affordable','needed'].filter(k=>!['roster','contracts'].includes(name)||k==='needed').map(k=>`<label><input type="checkbox" data-polish-filter="${k}" ${prefs[k]?'checked':''}> ${k==='shortlist'?t('polish.shortlist_only'):k==='affordable'?t('polish.affordable'):t('polish.needed')}</label>`).join('')}${buttons('clear-filters',t('polish.clear_filters'))}</div><span data-polish-count role="status"></span></div>`;
  }
  if(['draft','draftclass','famarket','roster'].includes(name))out+=buttons('shortlist-page',t('polish.shortlist'));
  if(name==='roster')out+=buttons('presets-lineup',t('polish.lineup_presets'));
  if(name==='gameplan')out+=buttons('presets-plan',t('polish.plan_presets'));
  if(name==='monster'){
    const next=f.roster.find(x=>x.id!==ctx.params.id&&(x.points||0)>0);
    out+=buttons('points',t('polish.plan_points'),ctx.params.id)+(next?buttons('next-points',t('polish.next_points'),next.id):'');
  }
  return out;
}
export const POLISH_ROOT_ACTIONS=new Set(['explain','resume','go','clear-filters','shortlist','compare','shortlist-page','presets-lineup','presets-plan','points','next-points']);
export function mountPolish(root,ctx,name,Router) {
  const {app,f}=ctx;if(!f?.roster||!app||isArchived(f))return;app.polishRefresh=()=>Router.render();
  const scope=['draft','draftclass'].includes(name)?draftScope(f):'market';
  const candidates=new Map();
  const marketEntries=['famarket','offseason'].includes(name)?F.freeAgentMarket(f):[];
  const asking=new Map(marketEntries.map(x=>[x.monster.id,x.ask.salary]));
  if(['draft','draftclass'].includes(name))for(const m of f.draft?.class||[])candidates.set(m.id,m);
  else if(name==='famarket'||name==='offseason')for(const x of marketEntries)candidates.set(x.monster.id,x.monster);
  else for(const m of f.roster)candidates.set(m.id,m);
  const rows=[];
  if(name==='roster'&&root.querySelector('[data-action="view"][data-v="depth"]')&&!root.querySelector('.dc-row')) {
    // A searchable roster list complements the field diagram without hiding its slots.
    const list=document.createElement('div');list.className='list polish-roster-search';
    list.innerHTML=f.roster.map(m=>`<button class="item" data-action="monster" data-id="${esc(m.id)}"><span class="grow">${esc(m.name)} · ${esc(m.position)}</span><b>${monsterOverall(m)}</b></button>`).join('');
    root.querySelector('.polish-browse')?.after(list);
    list.addEventListener('click',e=>{const b=e.target.closest('[data-action="monster"]');if(b){e.stopPropagation();Router.go('monster',{id:b.dataset.id});}});
  }
  for(const row of root.querySelectorAll('[data-prospect-id], .item[data-action="faopen"], .item[data-action="fa"], .item[data-action="monster"], [data-polish-beast], .dc-row')){
    const id=row.dataset.prospectId||row.dataset.polishBeast||row.dataset.id||row.querySelector('[data-action="monster"]')?.dataset.id;
    const m=candidates.get(id);if(!m)continue;rows.push({row,m});
    if(!['roster','contracts'].includes(name)&&!row.querySelector('[data-polish="shortlist"]')){
      const bar=document.createElement('div');bar.className='row wrap polish-candidate-actions';
      bar.innerHTML=buttons('shortlist',shortlisted(f,scope,id)?t('polish.shortlisted'):t('polish.shortlist'),id)+buttons('compare',t('polish.compare'),id);row.querySelector('.grow')?.appendChild(bar);
    }
  }
  for(const node of root.querySelectorAll('.hl[title], .chip[title], .fat-pip[title], .boost[title]')){
    if(node.closest('button'))continue;
    const help=document.createElement('button');help.className='btn small polish-info';help.type='button';help.dataset.polish='explain';help.dataset.info=node.title;help.textContent='i';help.setAttribute('aria-label',node.title);node.appendChild(help);
  }
  const applyFilters=()=>{
    const p=browsePreferences(f,name);let n=0;
    const needs=new Set(F.depthNeeds(f).filter(x=>x.status!=='ok').map(x=>x.position));
    const room=name==='famarket'?F.freeAgencyCap(f).usable:F.salarySummary(f).remaining;
    const visibleIds=new Set();
    for(const {row,m} of rows){
      let charge=m.salary;
      if(scope.startsWith('draft:')){const v=F.prospectView(f,m);charge=v.ovr!=null?rookieCharge(m):null;}
      if(name==='famarket')charge=asking.get(m.id);
      const visible=matchesSearch(m.name,p.query)&&(!p.shortlist||shortlisted(f,scope,m.id))&&(!p.needed||needs.has(m.position))&&(!p.affordable||charge!=null&&charge<=room);
      row.hidden=!visible;if(visible)visibleIds.add(m.id);
    }
    const searchList=root.querySelector('.polish-roster-search');if(searchList)searchList.hidden=!p.query&&!p.needed;
    const count=root.querySelector('[data-polish-count]');if(count)count.textContent=t('polish.results',{n:visibleIds.size,total:new Set(rows.map(x=>x.m.id)).size});
  };
  const search=root.querySelector('[data-polish-search]');search?.addEventListener('input',()=>{setBrowsePreferences(f,name,{query:search.value});applyFilters();app.save();});
  root.querySelectorAll('[data-polish-filter]').forEach(el=>el.addEventListener('change',()=>{setBrowsePreferences(f,name,{[el.dataset.polishFilter]:el.checked});applyFilters();app.save();}));
  root.addEventListener('click',e=>{
    // Only the shared header/row actions are handled here; a screen's own data-polish controls (the shortlist page's Review and
    // Remove) must reach that screen's listener, so they are never claimed or stopped.
    const b=e.target.closest('[data-polish]');if(!b||!POLISH_ROOT_ACTIONS.has(b.dataset.polish))return;e.preventDefault();e.stopPropagation();
    const action=b.dataset.polish,id=b.dataset.id,m=candidates.get(id);
    if(action==='explain')sheet(`<p>${esc(b.dataset.info)}</p>`,{title:t('polish.explanation')});
    if(action==='resume'){delete editPolish(f).playbackPaused;app.save();resumeActivity();globalThis.dispatchEvent?.(new Event('gb-playback-resume'));Router.render();}
    if(action==='go'){
      let screen=b.dataset.screen,params=b.dataset.slot?{slot:b.dataset.slot}:id?{id}:{};
      if(b.dataset.kind==='call'&&name==='hq'){const deals=root.querySelector('.polish-deals');if(deals){deals.open=true;deals.scrollIntoView({block:'center'});return;}}
      if(b.dataset.warning==='depth'||b.dataset.warning==='forfeit'){
        const route=shortPositionRoute(f,F.depthNeeds(f).find(x=>x.status==='short'),screen);
        screen=route.screen;params=route.params;if(route.browse){setBrowsePreferences(f,'famarket',route.browse);app.save();}
      }
      Router.go(screen,params);
    }
    if(action==='clear-filters'){setBrowsePreferences(f,name,{query:'',shortlist:false,affordable:false,needed:false,position:'',keen:false});if(name==='draftclass')setBrowsePreferences(f,'draft',{position:''});app.save();Router.render();}
    if(action==='shortlist'&&m){const r=toggleShortlist(f,scope,m);if(r===null)toast(t('polish.shortlist_limit'),'bad');else b.textContent=r?t('polish.shortlisted'):t('polish.shortlist');app.save();applyFilters();}
    if(action==='compare'&&m){const v=scope.startsWith('draft:')?F.prospectView(f,m):null;compareBeast(f,m,v?{ovrKnown:v.ovr!=null,attrsKnown:v.level>=6,potentialKnown:v.potential!=null,salary:v.ovr!=null?rookieCharge(m):null}:{salary:asking.get(m.id)});}
    if(action==='shortlist-page')Router.go('shortlist');
    if(action==='presets-lineup')presetsSheet(app,Router,'lineup');
    if(action==='presets-plan')presetsSheet(app,Router,'plan');
    if(action==='points')pointPlanner(app,id);
    if(action==='next-points')Router.go('monster',{id},{replace:true});
  },{capture:true});applyFilters();
}
export function registerPolishScreens(Router,app) {
  Router.registerScreen('shortlist',{
    title:t('polish.shortlist'),
    render({f}){return `<div class="stack">${(polishState(f).shortlist||[]).map(x=>{
      const draft=x.scope.startsWith('draft:');const m=draft&&x.scope===draftScope(f)?f.draft?.class.find(m=>m.id===x.id):!draft?F.freeAgentMarket(f).find(y=>y.monster.id===x.id)?.monster:null;
      const available=m&&(draft?(!f.draft.started||f.draft.available?.includes(x.id)):true);
      return `<div class="panel"><b>${esc(x.name)} · ${esc(x.position)}</b><p>${available?t('polish.available'):t('polish.taken')}</p>${buttons('shortlist-open',t('polish.review'),`${x.scope}|${x.id}`)}${buttons('shortlist-remove',t('polish.remove'),`${x.scope}|${x.id}`)}</div>`;
    }).join('')||`<p>${t('polish.empty_shortlist')}</p>`}</div>`;},
    mount(root){root.addEventListener('click',e=>{const b=e.target.closest('[data-polish]');if(!b)return;const [scope,id]=b.dataset.id.split('|');const x=polishState(app.f).shortlist.find(x=>x.scope===scope&&x.id===id);if(!x)return;
      if(b.dataset.polish==='shortlist-remove'){toggleShortlist(app.f,scope,x);app.save();Router.render();}
      else if(b.dataset.polish==='shortlist-open'){
        const f=app.f;
        const m=scope.startsWith('draft:')&&scope===draftScope(f)?f.draft?.class.find(m=>m.id===id):scope==='market'?F.freeAgentMarket(f).find(y=>y.monster.id===id)?.monster:null;
        if(!m){toast(t('polish.unavailable'));return;}
        const v=scope.startsWith('draft:')?F.prospectView(f,m):null;
        compareBeast(f,m,v?{ovrKnown:v.ovr!=null,attrsKnown:v.level>=6,potentialKnown:v.potential!=null,salary:v.ovr!=null?rookieCharge(m):null}:{salary:F.freeAgentMarket(f).find(x=>x.monster.id===m.id)?.ask.salary});
      }
    });}
  });
}

export function returnSummary(f) {
  if(!f?.season)return '';
  const s=f.game?.state;
  return s ? `<p class="muted polish-return">${t('polish.return_match',{home:esc(s.home?.name||''),away:esc(s.away?.name||''),homeScore:s.score.home,awayScore:s.score.away,quarter:s.quarter,clock:fmtClock(s.clock),possession:esc(s[s.possession]?.abbr||s[s.possession]?.name||''),down:s.down||'—',distance:s.toGo||'—'})}</p>`
    : `<p class="muted polish-return">${t('polish.return_week',{week:f.season.week,day:esc(F.DAYS[f.season.day]||'')})}<br>${t('polish.next_task',{task:esc(F.creationDraftPending(f)?t('polish.draft'):F.needsGoal(f)?t('polish.board_goal'):f.season.finished?t('polish.offseason'):F.DAY_ACTIONS[f.season.day]||'')})}${f.roster.some(m=>m.injury)?`<br>${t('polish.injured_count',{n:f.roster.filter(m=>m.injury).length})}`:''}</p>`;
}

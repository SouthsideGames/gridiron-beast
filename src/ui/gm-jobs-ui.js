import * as F from '../franchise/franchise.js';
import { SEASON_CAP, seasonsCompleted } from '../franchise/lifecycle.js';
import { esc, delegate, confirmSheet, toast } from './dom.js';
import { STAFF, STAFF_ROLES, ROLE_LABEL } from '../data/staff.js';
import { ALL_TEAMS } from '../data/league.js';
import { picksOwnedBy } from '../franchise/trades.js';
import { t } from '../text/index.js';
const expectations = () => ({contend:t('gm.contend'),playoffs:t('gm.playoffs'),rebuild:t('gm.rebuild')});
export function registerGmJobs(Router,app) {
  Router.registerScreen('gm-jobs',{
    title:t('gm.market'),
    render({f}) {
      const offers=F.gmJobMarket(f), g=f.gmCareer, totals=F.gmCareerTotals(f);
      const history=[...(g?.stints || []),{club:f.club,from:g?.stintStart || f.history?.[0]?.year || 1,to:f.season.year,current:true,seasons:(f.history || []).filter(h=>h.club===f.club && h.year>=(g?.stintStart || 1))}];
      return `<div class="panel"><h2>${t('gm.career')}</h2><p>${t('gm.seasons',{n:seasonsCompleted(f),cap:SEASON_CAP})}</p><p>${t('gm.role')}</p><p>${t('gm.totals',{wins:totals.wins,titles:totals.titles,awards:totals.awards})}</p>${f.board?.fired?`<p class="bad">${t('gm.dismissed')}</p>`:''}<p class="dim">${t('gm.rules')}</p></div>
      <div class="list">${offers.map(o=>`<div class="panel"><h3>${esc(o.club)}</h3><p>${t('gm.overall',{n:o.overall})} · ${expectations()[o.expectation]}${o.rebuilding?` · ${t('gm.rebuilding_offer')}`:''}</p><p>${t('gm.cap',{n:o.capRoom.toLocaleString('en-US')})}</p><p>${o.approached?t('gm.approached'):o.applied?o.offered?t('gm.offered'):t('gm.declined'):t('gm.apply_hint')}</p><details><summary>${t('gm.review')}</summary><h4>${t('gm.staff')}</h4>${STAFF_ROLES.map(role=>`<p>${esc(ROLE_LABEL[role])}: ${esc(STAFF.find(x=>x.id===o.staff[role])?.name || role)}</p>`).join('')}<h4>${t('gm.roster')}</h4><div class="list">${o.roster.map(m=>`<div class="row between" style="flex-wrap:wrap;gap:4px"><span>${esc(m.name)} · ${esc(m.position)}</span><span>${(m.salary||0).toLocaleString('en-US')} · ${t('gm.contract',{year:m.contract?.permanent?'—':m.contract?.ends ?? '—'})}${m.injury?` · ${t('gm.injured')}`:''}</span></div>`).join('')}</div><h4>${t('gm.picks')}</h4><p>${esc(picksOwnedBy(f,o.club,f.season.year+1,ALL_TEAMS).map(p=>`${p.year} R${p.round}`).join(' · ') || t('gm.normal_picks'))}</p></details><button class="btn block" data-action="${o.offered?'acceptjob':'applyjob'}" data-club="${esc(o.club)}" ${o.applied&&!o.offered?'disabled':''}>${o.offered?t('gm.accept'):t('gm.apply')}</button></div>`).join('') || `<div class="panel"><p>${t('gm.window_closed')}</p></div>`}</div>
      ${F.gmJobWindow(f)&&!f.board?.fired?`<button class="btn primary block" data-action="stayjob">${t('gm.stay',{club:esc(f.club)})}</button>`:''}
      <div class="panel"><h3>${t('gm.stints')}</h3>${history.map(s=>`<p><b>${esc(s.club)}</b> · ${s.from}–${s.to}${s.current?` · ${t('gm.current')}`:''}${s.reason==='fired'?` · ${t('gm.let_go')}`:''}${s.seasons?.length?` · ${t('gm.stint_record',{wins:s.seasons.reduce((a,h)=>a+(h.record?.w || 0),0),losses:s.seasons.reduce((a,h)=>a+(h.record?.l || 0),0)})}`:''}</p>`).join('')}</div><button class="btn block" data-action="jobback">${t('gm.back')}</button>`;
    },
    mount(root) { delegate(root,{
      applyjob:async el=>{const r=F.applyForGmJob(app.f,el.dataset.club); if(!r.ok){toast(r.reason,'bad');return;} await app.save({immediate:true}); Router.render();},
      acceptjob:async el=>{
        const club=el.dataset.club; if(!(await confirmSheet(t('gm.confirm',{club}),{title:t('gm.accept'),okLabel:t('gm.accept')}))) return;
        const before=structuredClone(app.f); const r=F.acceptGmJob(app.f,club); if(!r.ok){toast(r.reason,'bad');return;}
        const saved=await app.save({immediate:true});
        if(saved?.ok===false){ for(const k of Object.keys(app.f))delete app.f[k]; Object.assign(app.f,before); app.lastSig=null; toast(t('gm.save_failed'),'bad'); Router.render(); return; }
        toast(t('gm.joined',{club}),'good'); Router.go('offseason',{}, {reset:true});
      },
      stayjob:async()=>{const r=F.stayAtClub(app.f); if(!r.ok){toast(r.reason,'bad');return;} await app.save({immediate:true}); Router.go('offseason');},
      jobback:()=>Router.go('hq',{}, {reset:true}),
    }); },
  });
}

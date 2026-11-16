import { teamInputs, selectUnit, staminaRatio, unavailable, requestSubstitution, philosophyLabel } from '../sim/substitutions.js';
import { PLAYS } from '../data/playbook.js';
import { positionOf } from '../data/personnel.js';
import { esc, sheet, delegate, toast } from './dom.js';
import { t } from '../text/index.js';
const reasons = () => ({availability:t('rotation.reason_availability'),fatigue:t('rotation.reason_fatigue'),manual:t('rotation.reason_manual')});
export function substitutionStrip(f) {
  const s=f.game?.state; if(!s || s.finished || !['scrimmage','try'].includes(s.phase))return '';
  const notices=(s.rotation?.notices || []).filter(n=>n.side===f.game.playerSide || n.reason==='injury').slice(-2);
  return `<div class="panel tight"><button class="btn small block" data-action="substitutions">${t('rotation.panel')}</button><div role="status" aria-live="polite">${notices.map(n=>`<p class="dim">${n.reason==='injury'?t('rotation.injury_notice',{name:esc(n.name)}):t('rotation.notice',{name:esc(n.name),slot:esc(n.slot),reason:reasons()[n.reason] || reasons().availability})}</p>`).join('')}</div></div>`;
}
export function openSubstitutions(f,teams,{save,refresh}) {
  const G=f.game,s=G.state,side=G.playerSide,team=teams[side];
  if(s.finished || G.lastEvent?.needsContinue)return;
  const unit=s.possession===side?'offense':'defense', selected=G.selected?.[unit], id=selected || team[`${unit}Plays`]?.[0];
  const slots=PLAYS[id]?.onField || Object.keys(team[unit]);
  const active=selectUnit(s,team,side,slots,team[unit]),pool=teamInputs(team);
  let close;
  const content=()=>`<p>${t('rotation.philosophy',{name:philosophyLabel(team.rotation?.philosophy)})}</p><label>${t('rotation.control')} <select class="input" data-change="rotationmode"><option value="auto" ${f.settings.substitutionMode!=='manual'?'selected':''}>${t('rotation.auto')}</option><option value="manual" ${f.settings.substitutionMode==='manual'?'selected':''}>${t('rotation.manual')}</option></select></label><p class="dim">${t('rotation.help')}</p>${slots.map(slot=>`<label class="block" style="margin-top:12px">${esc(slot)} · ${esc(active[slot]?.name || '—')}<select class="input" data-change="subpick" data-slot="${esc(slot)}"><option value="">${t('rotation.choose')}</option>${pool.filter(p=>p.position===positionOf(slot)).map(p=>`<option value="${esc(p.id)}" ${unavailable(s,p)||s.t8?.stamina?.[p.id]?.exhausted?'disabled':''}>${esc(p.name)} · ${Math.round(staminaRatio(s,p)*100)}%${unavailable(s,p)?` · ${t('rotation.unavailable')}`:''}</option>`).join('')}</select></label>`).join('')}`;
  const dialog=sheet(content(),{title:t('rotation.panel')}); close=dialog.close;
  const root=dialog.el; if(!root)return;
  delegate(root,{
    rotationmode:el=>{ f.settings.substitutionMode=el.value==='manual'?'manual':'auto'; save(); close();refresh(); },
    subpick:el=>{if(!el.value)return; const r=requestSubstitution(s,teams,side,el.dataset.slot,el.value); if(!r.ok){toast(r.reason,'bad');return;} save();close();refresh();},
  });
}

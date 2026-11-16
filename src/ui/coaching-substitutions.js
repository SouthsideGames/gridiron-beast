import { teamInputs, selectUnit, staminaRatio, unavailable, requestSubstitution, philosophyLabel, playNotices } from '../sim/substitutions.js';
import { PLAYS } from '../data/playbook.js';
import { positionOf } from '../data/personnel.js';
import { esc, sheet, delegate, toast } from './dom.js';
import { t } from '../text/index.js';
const reasons = () => ({availability:t('rotation.reason_availability'),fatigue:t('rotation.reason_fatigue'),manual:t('rotation.reason_manual'),lineup:t('rotation.reason_lineup')});
/** The strip under the play cards: injuries and the replacements of your injured monsters at once, one line each; the routine
 *  rotation for the coming play as one brief summary. Every change is listed in Lineup & Substitutions. */
export function substitutionStrip(f) {
  const s=f.game?.state; if(!s || s.finished || !['scrimmage','try'].includes(s.phase))return '';
  const {injuries,replacements,routine}=playNotices(s,f.game.playerSide);
  const lines=[...injuries.map(n=>`<p>${t('rotation.injury_notice',{name:esc(n.name)})}</p>`),...replacements.map(n=>`<p>${t('rotation.injury_entered',{name:esc(n.name),slot:esc(n.slot)})}</p>`)];
  if(routine.length) lines.push(`<p class="dim">${t('rotation.play_summary',{n:routine.length})}</p>`);
  return `<div class="panel tight"><button class="btn small block" data-action="substitutions">${t('rotation.panel')}</button><div role="status" aria-live="polite">${lines.join('')}</div></div>`;
}
export function openSubstitutions(f,teams,{save,refresh}) {
  const G=f.game,s=G.state,side=G.playerSide,team=teams[side];
  if(s.finished || G.lastEvent?.needsContinue)return;
  const unit=s.possession===side?'offense':'defense', selected=G.selected?.[unit], id=selected || team[`${unit}Plays`]?.[0];
  const slots=PLAYS[id]?.onField || Object.keys(team[unit]);
  const active=selectUnit(s,team,side,slots,team[unit]),pool=teamInputs(team);
  let close;
  const {injuries,replacements,routine}=playNotices(s,side);
  const changes=[...injuries.map(n=>t('rotation.injury_notice',{name:esc(n.name)})),...replacements.map(n=>t('rotation.injury_entered',{name:esc(n.name),slot:esc(n.slot)})),...routine.map(n=>t('rotation.notice',{name:esc(n.name),slot:esc(n.slot),reason:reasons()[n.reason] || reasons().availability}))];
  const lastPlay=changes.length?`<h3>${t('rotation.next_play_changes')}</h3><ul class="dim">${changes.map(x=>`<li>${x}</li>`).join('')}</ul>`:'';
  const content=()=>`<p>${t('rotation.philosophy',{name:philosophyLabel(team.rotation?.philosophy)})}</p>${lastPlay}<label>${t('rotation.control')} <select class="input" data-change="rotationmode"><option value="auto" ${f.settings.substitutionMode!=='manual'?'selected':''}>${t('rotation.auto')}</option><option value="manual" ${f.settings.substitutionMode==='manual'?'selected':''}>${t('rotation.manual')}</option></select></label><p class="dim">${t('rotation.help')}</p>${slots.map(slot=>`<label class="block" style="margin-top:12px">${esc(slot)} · ${esc(active[slot]?.name || '—')}<select class="input" data-change="subpick" data-slot="${esc(slot)}"><option value="">${t('rotation.choose')}</option>${pool.filter(p=>p.position===positionOf(slot)).map(p=>`<option value="${esc(p.id)}" ${unavailable(s,p)||s.t8?.stamina?.[p.id]?.exhausted?'disabled':''}>${esc(p.name)} · ${Math.round(staminaRatio(s,p)*100)}%${unavailable(s,p)?` · ${t('rotation.unavailable')}`:''}</option>`).join('')}</select></label>`).join('')}`;
  const dialog=sheet(content(),{title:t('rotation.panel')}); close=dialog.close;
  const root=dialog.el; if(!root)return;
  delegate(root,{
    rotationmode:el=>{ f.settings.substitutionMode=el.value==='manual'?'manual':'auto'; save(); close();refresh(); },
    subpick:el=>{if(!el.value)return; const r=requestSubstitution(s,teams,side,el.dataset.slot,el.value); if(!r.ok){toast(r.reason,'bad');return;} save();close();refresh();},
  });
}

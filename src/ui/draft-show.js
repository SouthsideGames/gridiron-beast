// Presentation reads only committed picks. Skipping never runs the engine or changes ownership/RNG.
import { esc } from './dom.js';
import { monsterSprite, portraitSprite } from './pixel-monster.js';
import { t } from '../text/index.js';

export function draftShowPick(d) {
  const show=d?.presentation;
  if(!show?.enabled)return null;
  const cursor=Math.max(0,Math.min(d.picks.length,Number.isInteger(show.cursor)?show.cursor:0));
  return d.picks[cursor] ? {pick:d.picks[cursor],cursor} : null;
}
export function startDraftShow(d, cursor=0) {
  d.presentation={enabled:true,cursor:Math.max(0,Math.min(d.picks.length,cursor))};
}
export function nextDraftShow(d, expectedCursor, skip=false) {
  const current=draftShowPick(d);
  if(!current || current.cursor!==expectedCursor)return false;
  d.presentation.cursor=skip?d.picks.length:current.cursor+1;
  return true;
}
export function draftShowHtml(d, playing=false) {
  const current=draftShowPick(d);if(!current)return '';
  const {pick:p,cursor}=current, beast=d.class.find(m=>m.id===p.id);
  const ceremony=p.round===1&&!p.passed&&!!beast;
  return `<section class="draft-show panel ${ceremony?'draft-ceremony':''}" aria-label="${t('presentation.draft_announcement')}">
    <div class="draft-show-pick">${t('presentation.draft_selection',{round:p.round,overall:p.overall})}</div>
    <h2>${esc(p.team)}</h2>
    <div class="draft-stage" aria-hidden="true">${ceremony?portraitSprite('commissioner',88,{hue:40}):''}${beast?monsterSprite(beast,ceremony?112:72):''}</div>
    <div class="draft-announcement" role="status">${p.passed?t('presentation.draft_pass',{team:esc(p.team)}):t('presentation.draft_selected',{team:esc(p.team),name:esc(p.name)})}</div>
    <p class="muted">${p.passed?esc(p.why||''):esc(p.position)}</p>
    <div class="draft-show-controls"><button class="btn primary" data-action="draft-next" data-cursor="${cursor}">${t('presentation.next_pick')}</button><button class="btn" data-action="draft-pause">${playing?t('presentation.pause'):t('presentation.resume')}</button><button class="btn ghost" data-action="draft-skip" data-cursor="${cursor}">${t('presentation.skip_to_turn')}</button></div>
  </section>`;
}

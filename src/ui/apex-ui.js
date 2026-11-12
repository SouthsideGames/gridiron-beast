// Apex presentation (Task 8 M6, spec §5 "Discovery and presentation"). Everything here is shown only for an Apex the player has
// discovered (src/franchise/t8/discovery.js apexKnown): an undiscovered Apex looks and reads exactly like an ordinary monster.
//   - apexEmblem / apexClass: the emblem on roster and profile cards and the subtle gold double outline. Species colours and
//     silhouette are untouched; no permanent overhead badge is added on the field.
//   - apexFactsHtml: "Potential 99 in every attribute, Starts undeveloped, Ageless, Neutral Temper", with current ratings kept apart.
//   - openApexDiscovery: the dedicated first-discovery panel, about five seconds: silhouette, a restrained gold and white outline
//     reveal, APEX DISCOVERED, the monster's name and the potential summary. Skippable at once; the confirmation stays on screen
//     afterwards; replayable from the profile. Reduced flash or reduced motion: a steady outline and a fade, no shake. It makes no
//     sound of its own. The panel only presents: the discovery was recorded and saved before it opened, so skipping, replaying,
//     closing or reloading cannot change the monster or award anything.
import { esc } from './dom.js';
import { monsterSprite } from './pixel-monster.js';
import { apexKnown, apexRecord, pendingApexPanels, markApexPanelShown, APEX_FACTS } from '../franchise/t8/discovery.js';
import { monsterOverall } from '../data/monsters.js';
import { yearOf } from '../data/calendar.js';
import { t as $t } from '../text/index.js';

/** Stage times in ms: silhouette, outline reveal, title, summary (the confirmation, which stays). Full: 5.2 s; steady: 4.2 s. */
export const APEX_TIMING = Object.freeze({ full: { reveal: 1300, title: 2700, summary: 3900, done: 5200 }, steady: { reveal: 900, title: 1900, summary: 2900, done: 4200 } });
export const APEX_STAGES = Object.freeze(['silhouette', 'reveal', 'title', 'summary']);

export const apexEmblem = (f, m) => (apexKnown(f, m) ? `<span class="apex-emblem" title="${$t('roster.apex_individual')}" aria-label="${$t('roster.apex')}">${$t('roster.apex_2')}</span>` : '');
export const apexClass = (f, m) => (apexKnown(f, m) ? ' apex-known' : '');
const VIA_TEXT = { roster: $t('roster.when_he_joined_your_club'), scouting: $t('roster.by_your_scouts_report'), 'draft-report': $t('roster.by_your_full_draft_report'), 'free-agent-report': $t('roster.from_his_free_agent_report') };

/** The facts block for a discovered Apex (profile and reports). Empty string otherwise. */
export function apexFactsHtml(f, m, { replay = false } = {}) {
  const r = apexRecord(f, m); if (!r) return '';
  const when = r.year != null ? ` in ${yearOf(r.year)}${r.week ? `${$t('roster.week', { week: r.week })}` : ''}` : '';
  return `<div class="panel apex-panel" data-apex="${esc(m.id)}"><div class="row between" style="gap:6px"><b><span class="apex-emblem">${$t('roster.apex_2')}</span> individual</b>${replay ? `<button class="btn small" data-action="apex-replay">${$t('roster.replay_discovery')}</button>` : ''}</div>
    <ul class="apex-facts">${APEX_FACTS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <div class="dim">${$t('roster.current_overall_b_b_the_ratings', { monsterOverall: monsterOverall(m), when, viaText: VIA_TEXT[r.via] || '' })}</div></div>`;
}

const steady = (settings) => !!(settings?.reducedFlash || settings?.reducedMotion) || (typeof matchMedia === 'function' && matchMedia($t('roster.prefers_reduced_motion_reduce')).matches);

/**
 * Open the first-discovery panel for monster `m`. `onClose()` runs once when the player continues. Returns a controller
 * ({ el, stage, skip, replay, close, steady, log }) used by the checks. Pure presentation.
 */
export function openApexDiscovery({ monster: m, settings = {}, onClose = null }) {
  const isSteady = steady(settings); const T = isSteady ? APEX_TIMING.steady : APEX_TIMING.full; const shake = !isSteady && settings.screenShake !== false;
  const el = document.createElement('div');
  el.className = `apex-scene${isSteady ? ' steady' : ''}${shake ? ' shake-ok' : ''}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `${$t('roster.apex_discovered', { name: m.name })}`);
  el.innerHTML = `<div class="apex-bg" aria-hidden="true"></div>
    <div class="apex-top"><button class="evo-btn ghost" data-apex="skip">${$t('roster.skip')}</button></div>
    <div class="apex-show"><div class="apex-figure"><div class="apex-ring" aria-hidden="true"></div>${monsterSprite(m, 160)}</div>
      <div class="apex-title" aria-live="polite">${$t('roster.apex_discovered_2')}</div><div class="apex-name">${esc(m.name)} <span class="dim">${esc(m.position)} · ${esc(m.type)}</span></div>
      <ul class="apex-facts big">${APEX_FACTS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="apex-current dim">${$t('roster.current_overall_his_ratings_today_are', { monsterOverall: monsterOverall(m) })}</div></div>
    <div class="apex-bottom"><button class="evo-btn ghost" data-apex="replay">${$t('roster.replay')}</button><button class="evo-btn primary" data-apex="continue">${$t('roster.continue')}</button></div>`;
  document.body.appendChild(el); document.documentElement.classList.add('apex-open');
  let timers = []; let stage = null; let closed = false; const log = [];
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const set = (s) => { stage = s; el.dataset.stage = s; log.push(s); };
  function play() { clear(); set('silhouette'); timers.push(setTimeout(() => set('reveal'), T.reveal), setTimeout(() => set('title'), T.title), setTimeout(() => set('summary'), T.summary)); }
  function skip() { clear(); set('summary'); }
  function close() { if (closed) return; closed = true; clear(); el.remove(); document.documentElement.classList.remove('apex-open'); document.removeEventListener('keydown', onKey); onClose?.(); }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); if (stage === 'summary') close(); else skip(); } }
  el.addEventListener('click', (e) => { const a = e.target.closest('[data-apex]')?.dataset.apex; if (a === 'skip') skip(); else if (a === 'replay') play(); else if (a === 'continue') close(); else if (!a && stage !== 'summary') skip(); });
  document.addEventListener('keydown', onKey); el.tabIndex = -1; el.focus({ preventScroll: true });
  play();
  const api = { el, skip, replay: play, close, steady: isSteady, get stage() { return stage; }, get log() { return log.slice(); } };
  el.__apex = api; return api;
}

let showing = false;
/**
 * Play the pending first-discovery panels, one at a time. Each is stamped as shown and saved BEFORE it opens (so it never plays
 * automatically twice). `find(id)` returns the monster wherever it now is; a monster that can no longer be found is stamped and
 * skipped. Returns true when a panel opened.
 */
export function playPendingApex({ f, find, settings, save, onDone = null }) {
  if (showing || !f || typeof document === 'undefined' || document.querySelector('.apex-scene, .evo-scene')) return false;
  const next = pendingApexPanels(f)[0]; if (!next) return false;
  markApexPanelShown(f, next.id); save?.();
  const m = find(next.id); if (!m) return playPendingApex({ f, find, settings, save, onDone });
  showing = true;
  openApexDiscovery({ monster: m, settings, onClose: () => { showing = false; if (!playPendingApex({ f, find, settings, save, onDone })) onDone?.(); } });
  return true;
}

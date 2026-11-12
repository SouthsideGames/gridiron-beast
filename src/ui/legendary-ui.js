// Legendary Plays on screen (GDD §36.7): the gold card, the detail sheet (requirement, what it does, strengths, weaknesses,
// the art, availability) and the "Legendary Play Discovered!" card. Reads the play data and the franchise status only.

import { PLAYS, LESSONS } from '../data/playbook.js';
import { SPECIES_BY_ID } from '../data/monsters.js';
import { legendaryStatus, markAnnounced } from '../franchise/legendary.js';
import { playCardSvg } from './play-art.js';
import { sprite16 } from './sprite16.js';
import { monsterSprite } from './pixel-monster.js';
import { esc, sheet } from './dom.js';
import { t as $t } from '../text/index.js';

const speciesName = (id) => SPECIES_BY_ID[id]?.name || id;
const portrait = (st, L) => (st.monster ? monsterSprite(st.monster, 22) : SPECIES_BY_ID[L.species] ? sprite16(SPECIES_BY_ID[L.species], 22) : '');

/** One card. `mode`: 'plan' (selectable when available), 'view' (opens the sheet). Unavailable plays are never selectable. */
export function legendaryCardHtml(f, id, { selected = false, mode = 'plan', side = null } = {}) {
  const p = PLAYS[id]; const L = p.legendary; const st = legendaryStatus(f, id);
  const label = st.discovered || mode === 'view' ? esc(p.name) : $t('market.legendary_play');
  const req = `${portrait(st, L)}<span>${esc(speciesName(L.species))} · ${esc(L.slot)}</span>`;
  if (mode === 'plan' && st.available) return `<button class="card legendary ${selected ? 'selected' : ''}" data-action="toggle" data-side="${side}" data-id="${id}" aria-pressed="${selected}" title="${esc(p.desc)}"><span class="lp-badge">${$t('market.legendary')}</span><div>${playCardSvg(id)}</div><span class="card-label">${label}</span><span class="lp-req">${req}</span></button>`;
  return `<button class="card legendary ${st.available ? '' : 'locked'}" data-action="lp-info" data-id="${id}" aria-label="${esc(p.name)}: ${esc(st.available ? 'available' : st.reason)}"><span class="lp-badge">${st.available ? $t('market.legendary') : st.discovered ? $t('market.unavailable') : $t('market.locked')}</span><div>${st.discovered ? playCardSvg(id) : '<div class="lp-mystery">?</div>'}</div><span class="card-label">${label}</span><span class="lp-req">${req}</span></button>`;
}

/** The detail sheet for one Legendary Play. */
export function legendarySheetHtml(f, id) {
  const p = PLAYS[id]; const L = p.legendary; const st = legendaryStatus(f, id); const les = LESSONS[id] || {};
  return `<div class="lp-sheet">
    <div class="lp-head"><span class="lp-badge">${$t('market.legendary_play_2')}</span><h2>${esc(p.name)}</h2><div class="dim">${p.side === 'offense' ? $t('market.offense') : $t('market.defense')} · ${esc(p.type === 'run' ? 'run' : p.side === 'offense' ? 'pass' : (p.tags.includes('blitz') ? 'pressure' : p.tags.includes('run') ? 'run defense' : 'coverage'))}</div></div>
    <div class="lp-art">${playCardSvg(id)}</div>
    <div class="lp-need">${portrait(st, L)}<div>${$t('market.b_requires_b_at_b_b', { species: esc(speciesName(L.species)), slot: esc(L.slot) })}</div></div>
    <p>${esc(p.desc)}</p>
    ${les.when ? `<div class="lp-row">${$t('market.b_when_b')}<span>${esc(les.when)}</span></div>` : ''}${les.watch ? `<div class="lp-row">${$t('market.b_watch_b')}<span>${esc(les.watch)}</span></div>` : ''}
    ${les.beats ? `<div class="lp-row good">${$t('market.b_strong_against_b')}<span>${esc(les.beats)}</span></div>` : ''}${les.loses ? `<div class="lp-row bad">${$t('market.b_weak_against_b')}<span>${esc(les.loses)}</span></div>` : ''}
    <div class="lp-status ${st.available ? 'ok' : ''}">${st.available ? $t('market.available_equip_it_in_one_of') : `🔒 ${esc(st.reason)}`}</div>
    <p class="dim" style="font-size:12px">${$t('market.a_legendary_play_uses_one_of')}</p>
  </div>`;
}
export function openLegendarySheet(f, id) { return sheet(legendarySheetHtml(f, id), { title: $t('market.legendary_play_3') }); }

/** The discovery card for newly discovered plays (shown once each). Returns the sheet or null. */
export function announceLegendary(f, ids, { onPlan = null, save = null } = {}) {
  if (!ids.length) return null;
  const items = ids.map((id) => { const p = PLAYS[id]; const d = f.legendaryPlays.discovered[id]; return `<div class="lp-found"><div class="lp-art small">${playCardSvg(id)}</div><div><div class="lp-found-name">${esc(p.name)}</div><div class="dim">${$t('market.unlocked_through_your_new_legendary', { monster: esc(d?.monster || speciesName(p.legendary.species)) })}</div></div></div>`; }).join('');
  markAnnounced(f, ids); save?.();
  const s = sheet(`<div class="lp-discovered"><div class="lp-burst">★</div><div class="lp-disc-title">${$t('market.legendary_play_discovered')}</div>${items}<p class="dim">${$t('market.it_is_now_available_for_your')}</p><div class="row" style="gap:8px">${onPlan ? `<button class="btn primary grow" data-action="lp-plan">${$t('market.open_the_game_plan')}</button>` : ''}<button class="btn grow" data-action="sheet-close">${$t('market.later')}</button></div></div>`, { title: $t('market.legendary_play_3') });
  s.el.addEventListener('click', (e) => { if (e.target.closest('[data-action="lp-plan"]')) { s.close(); onPlan?.(); } });
  return s;
}

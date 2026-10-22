// Legendary Plays on screen (GDD §36.7): the gold card, the detail sheet (requirement, what it does, strengths, weaknesses,
// the art, availability) and the "Legendary Play Discovered!" card. Reads the play data and the franchise status only.

import { PLAYS, LESSONS } from '../data/playbook.js';
import { SPECIES_BY_ID } from '../data/monsters.js';
import { legendaryStatus, markAnnounced } from '../franchise/legendary.js';
import { playCardSvg } from './play-art.js';
import { sprite16 } from './sprite16.js';
import { monsterSprite } from './pixel-monster.js';
import { esc, sheet } from './dom.js';

const speciesName = (id) => SPECIES_BY_ID[id]?.name || id;
const portrait = (st, L) => (st.monster ? monsterSprite(st.monster, 22) : SPECIES_BY_ID[L.species] ? sprite16(SPECIES_BY_ID[L.species], 22) : '');

/** One card. `mode`: 'plan' (selectable when available), 'view' (opens the sheet). Unavailable plays are never selectable. */
export function legendaryCardHtml(f, id, { selected = false, mode = 'plan', side = null } = {}) {
  const p = PLAYS[id]; const L = p.legendary; const st = legendaryStatus(f, id);
  const label = st.discovered || mode === 'view' ? esc(p.name) : '??? Legendary Play';
  const req = `${portrait(st, L)}<span>${esc(speciesName(L.species))} · ${esc(L.slot)}</span>`;
  if (mode === 'plan' && st.available) return `<button class="card legendary ${selected ? 'selected' : ''}" data-action="toggle" data-side="${side}" data-id="${id}" aria-pressed="${selected}" title="${esc(p.desc)}"><span class="lp-badge">★ LEGENDARY</span><div>${playCardSvg(id)}</div><span class="card-label">${label}</span><span class="lp-req">${req}</span></button>`;
  return `<button class="card legendary ${st.available ? '' : 'locked'}" data-action="lp-info" data-id="${id}" aria-label="${esc(p.name)}: ${esc(st.available ? 'available' : st.reason)}"><span class="lp-badge">${st.available ? '★ LEGENDARY' : st.discovered ? '🔒 UNAVAILABLE' : '🔒 LOCKED'}</span><div>${st.discovered ? playCardSvg(id) : '<div class="lp-mystery">?</div>'}</div><span class="card-label">${label}</span><span class="lp-req">${req}</span></button>`;
}

/** The detail sheet for one Legendary Play. */
export function legendarySheetHtml(f, id) {
  const p = PLAYS[id]; const L = p.legendary; const st = legendaryStatus(f, id); const les = LESSONS[id] || {};
  return `<div class="lp-sheet">
    <div class="lp-head"><span class="lp-badge">★ LEGENDARY PLAY</span><h2>${esc(p.name)}</h2><div class="dim">${p.side === 'offense' ? 'Offense' : 'Defense'} · ${esc(p.type === 'run' ? 'run' : p.side === 'offense' ? 'pass' : (p.tags.includes('blitz') ? 'pressure' : p.tags.includes('run') ? 'run defence' : 'coverage'))}</div></div>
    <div class="lp-art">${playCardSvg(id)}</div>
    <div class="lp-need">${portrait(st, L)}<div><b>Requires ${esc(speciesName(L.species))}</b> at <b>${esc(L.slot)}</b>. He takes that spot whenever the play is called.</div></div>
    <p>${esc(p.desc)}</p>
    ${les.when ? `<div class="lp-row"><b>When</b><span>${esc(les.when)}</span></div>` : ''}${les.watch ? `<div class="lp-row"><b>Watch</b><span>${esc(les.watch)}</span></div>` : ''}
    ${les.beats ? `<div class="lp-row good"><b>▲ Strong against</b><span>${esc(les.beats)}</span></div>` : ''}${les.loses ? `<div class="lp-row bad"><b>▼ Weak against</b><span>${esc(les.loses)}</span></div>` : ''}
    <div class="lp-status ${st.available ? 'ok' : ''}">${st.available ? '✅ Available: equip it in one of your six game-plan slots on Friday.' : `🔒 ${esc(st.reason)}`}</div>
    <p class="dim" style="font-size:12px">A Legendary Play uses one of the normal six slots. It changes no rating: its edge is the design and the Legendary's own ability.</p>
  </div>`;
}
export function openLegendarySheet(f, id) { return sheet(legendarySheetHtml(f, id), { title: 'Legendary Play' }); }

/** The discovery card for newly discovered plays (shown once each). Returns the sheet or null. */
export function announceLegendary(f, ids, { onPlan = null, save = null } = {}) {
  if (!ids.length) return null;
  const items = ids.map((id) => { const p = PLAYS[id]; const d = f.legendaryPlays.discovered[id]; return `<div class="lp-found"><div class="lp-art small">${playCardSvg(id)}</div><div><div class="lp-found-name">${esc(p.name)}</div><div class="dim">Unlocked through your new Legendary, ${esc(d?.monster || speciesName(p.legendary.species))}.</div></div></div>`; }).join('');
  markAnnounced(f, ids); save?.();
  const s = sheet(`<div class="lp-discovered"><div class="lp-burst">★</div><div class="lp-disc-title">LEGENDARY PLAY DISCOVERED!</div>${items}<p class="dim">It is now available for your game plan. Nothing in your plan changes until you choose it.</p><div class="row" style="gap:8px">${onPlan ? '<button class="btn primary grow" data-action="lp-plan">Open the game plan</button>' : ''}<button class="btn grow" data-action="sheet-close">Later</button></div></div>`, { title: 'Legendary Play' });
  s.el.addEventListener('click', (e) => { if (e.target.closest('[data-action="lp-plan"]')) { s.close(); onPlan?.(); } });
  return s;
}

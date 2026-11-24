// The League Hub (GDD §46, Phase 4): the persistent league made visible. Clubs (a directory, each opening its roster),
// career leaders across the universe, the league's recent moves, the award races and the rivalries (the rival GM and his
// signature monster, the gym legendaries) with their 20-season continuity. Every monster name opens its career. Reads only.

import { teamLogo, logoBody } from '../team-logo.js';
import { esc, delegate, sheet } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { monsterSprite } from '../pixel-monster.js';
import { careerLink } from '../career-ui.js';
import { TEAM_META, tierById, REG_WEEKS, teamSwatch, DIVISIONS, CONFERENCE_NAMES, divisionOf, conferenceFor, leagueSeasonFixtures, ACTIVE_LAYOUT } from '../../data/league.js';
import { AWARDS } from '../../franchise/awards.js';
import { RECORD_CATEGORIES } from '../../franchise/stats.js';
import { teamOverall } from '../../franchise/roster.js';
import { hasLeague, clubPayroll } from '../../franchise/league-registry.js';
import { clubDirectory, clubRosterView, universeCareerLeaders, protectedMonsters, headToHead } from '../../franchise/league-careers.js';
import { TRANSACTION_KINDS } from '../../franchise/league-news.js';
import * as F from '../../franchise/franchise.js';
import { historyNavHtml } from './history.js';
import { t as $t, lineText, fieldText } from '../../text/index.js';
import { REGIONS, CLUB_NAMES } from '../../data/club-identity.js';
import { GYM_BY_CLUB } from '../../data/gyms.js';
import { TYPES } from '../../data/monsters.js';
import { stadiumFor, ENVIRONMENTS } from '../../data/stadiums.js';
import { venueHtml } from '../stadium-preview.js';

const TAB_KEY = 'gridiron-beast-v7-league-tab';
const TABS = [['clubs', $t('league.clubs')], ['leaders', $t('league.leaders')], ['moves', $t('league.moves')], ['races', $t('league.races')], ['rivals', $t('league.rivals')]];
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* a convenience */ } };
const badge = (kind) => (kind === 'legendary' ? `<span class="chip accent" title="${$t('league.gym_legendary_bound_to_this_club')}">${$t('league.legend')}</span>` : kind === 'signature' ? `<span class="chip" style="border-color:#a855f7" title="${$t('league.the_rival_gms_signature_monster_bound')}">${$t('league.signature')}</span>` : '');
const seg = (items, key, cur) => `<div class="seg wrap" role="tablist">${items.map(([v, l]) => `<button class="btn small ${String(cur) === String(v) ? 'primary' : ''}" role="tab" aria-selected="${String(cur) === String(v)}" data-action="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;

const overallOf = (f) => (club) => (club === f.club ? teamOverall(F.playerTeam(f)) : teamOverall(F.aiTeam(f, club)));

function clubsTab(f) {
  const dir = clubDirectory(f, { overallOf: overallOf(f) }); const st = F.leagueStandings(f); const place = (c) => st.overall.indexOf(c) + 1;
  if (!hasLeague(f)) return `<p class="muted">${$t('league.this_franchise_still_plays_against_generated')}</p>`;
  const byDiv = {}; for (const c of dir) (byDiv[c.division] ||= []).push(c);
  return `<p class="muted">${$t('league.sixteen_clubs_one_universe_tap_a')}</p>${Object.entries(byDiv).map(([div, clubs]) => `<h3>${esc(div)}</h3><div class="list">${clubs.sort((a, b) => place(a.club) - place(b.club)).map((c) => `<button class="item ${c.mine ? 'mine' : ''}" data-action="club" data-club="${esc(c.club)}"><span class="rank">${place(c.club)}</span><div class="grow"><div class="name">${teamLogo(c.club, 22, { cls: 'team-logo inline' })}${teamSwatch(c.club)} ${esc(c.club)}${c.mine ? ` <span class="chip accent">you</span>` : ''}${c.rival ? ` <span class="chip" style="border-color:#a855f7">rival</span>` : ''}${c.gym ? ` <span class="chip">${$t('league.gym', { badge: esc(c.gym.badge) })}</span>` : ''}</div><div class="sub">${$t('league.ovr_monsters', { w: c.record.w, l: c.record.l, t: c.record.t ? '-' + c.record.t : '', overall: c.overall, size: c.size })}${c.protected.length ? ` · ${c.protected.map((p) => `${p.kind === 'legendary' ? '★' : '⚔️'} ${esc(p.name)}`).join(', ')}` : ''}</div></div><span class="dim">›</span></button>`).join('')}</div>`).join('')}`;
}

function leadersTab(f, mine) {
  const L = universeCareerLeaders(f, { n: 5, mine });
  return `<p class="muted">${$t('league.career_totals_regular_season_across', { mine: mine ? $t('league.your_roster') : $t('league.every_monster_the_universe_holds_the') })}</p>
    ${seg([['all', $t('league.whole_league')], ['mine', $t('league.your_monsters')]], 'scope', mine ? 'mine' : 'all')}
    ${RECORD_CATEGORIES.map((c) => { const rows = L[c.id]; if (!rows?.length) return ''; return `<div class="panel tight"><b>${esc(c.label)}</b><div class="list" style="margin-top:6px">${rows.map((r, i) => `<div class="item static ${r.club === f.club ? 'mine' : ''}"><span class="rank ${i === 0 ? 'top' : ''}">${i + 1}</span>${monsterSprite(r, 30)}<div class="grow"><div class="name">${careerLink(r.id, r.name)} <span class="dim">${esc(r.position)}${r.club ? ` · ${esc(r.club)}` : ''}${r.where === 'legend' ? $t('league.retired') : r.where === 'pool' || r.where === 'waivers' ? $t('league.free_agent') : ''}</span></div><div class="sub">${r.games} games</div></div><span class="chip ${i === 0 ? 'accent' : ''} mono">${Number(r.value).toLocaleString('en-US')}</span></div>`).join('')}</div></div>`; }).join('') || `<p class="dim">${$t('league.no_career_totals_yet_careers_begin')}</p>`}`;
}

function movesTab(f) {
  const items = (f.leagueNews || []).filter((it) => TRANSACTION_KINDS.has(it.kind)).slice(0, 60);
  if (!items.length) return `<p class="dim">${$t('league.no_league_moves_on_record_yet')}</p>`;
  const byWeek = []; for (const it of items) { const k = `${it.year}|${it.week}`; let g = byWeek.find((x) => x.k === k); if (!g) { g = { k, year: it.year, week: it.week, items: [] }; byWeek.push(g); } g.items.push(it); }
  const label = (w) => (w === 0 ? $t('league.offseason') : w > REG_WEEKS ? $t('league.playoffs') : `${$t('league.week', { w })}`);
  return `<p class="muted">${$t('league.the_leagues_moves_worth_a_line')}</p>${byWeek.map((g) => `<h3>${yearOf(g.year)} · ${label(g.week)}</h3><div class="list">${g.items.map((it) => `<div class="item static"><span>${it.icon || '📰'}</span><div class="grow"><div class="sub" style="font-size:14px">${linkText(it)}</div>${it.lines?.length ? `<div class="dim" style="font-size:12px;margin-top:4px">${it.lines.map((l) => linkText(l)).join(`<br>`)}</div>` : ''}</div></div>`).join('')}</div>`).join('')}`;
}
/** An item's text with its monster's name linked (the News UI's rule). */
function linkText(it) { let t = esc(lineText(it)); if (it.mid && it.mname) { const n = esc(it.mname); const i = t.indexOf(n); if (i >= 0) t = t.slice(0, i) + careerLink(it.mid, it.mname) + t.slice(i + n.length); } return t; }

function racesTab(f) {
  if (!f.season || f.season.week <= 1 && !f.season.awardsFinal) return `<p class="dim">${$t('league.races_start_after_the_first_sunday')}</p>`;
  const races = F.awardRaces(f, { n: 3 }); const frozen = !!f.season.awardsFinal;
  return `<p class="muted">${frozen ? `${$t('league.the_awards', { year: yearOf(f.season.year), finished: f.season.finished ? '' : $t('league.frozen_for_the_playoffs') })}` : $t('league.where_the_award_races_stand_this')}</p>${Object.entries(AWARDS).map(([k, aw]) => { const rows = races[k]; if (!Array.isArray(rows) || !rows.length) return ''; return `<div class="panel tight"><b>${esc(aw.label)}</b><div class="list" style="margin-top:6px">${rows.map((r, i) => `<div class="item static ${r.team === f.club ? 'mine' : ''}"><span class="rank ${i === 0 ? 'top' : ''}">${i + 1}</span><div class="grow"><div class="name">${k === 'coy' ? esc(r.coach || r.name) : careerLink(r.id, r.name)} <span class="dim">${esc(r.position || '')} · ${esc(r.team)}</span></div><div class="sub">${esc(fieldText(r, 'why') || '')}</div></div></div>`).join('')}</div></div>`; }).join('')}`;
}

function rivalsTab(f) {
  const rv = f.rivals?.[f.tier]; const prot = protectedMonsters(f); const sig = prot.find((p) => p.kind === 'signature');
  const h2h = rv ? headToHead(f, rv.team) : null;
  const rivalPanel = rv ? `<div class="panel" style="border-color:#a855f7"><b>⚔️ ${esc(rv.team)}</b> <span class="dim">GM ${esc(rv.gm)}</span><div class="muted" style="margin-top:4px">${$t('league.all_time_against_you_b_b', { w: h2h.w, l: h2h.l })}${h2h.last ? ` ${$t('league.last_meeting_week', { won: h2h.last.won ? 'W' : 'L', score: esc(h2h.last.score), year: yearOf(h2h.last.year), last: h2h.last.week })}` : ''}</div>
    ${sig ? `<div class="row" style="gap:10px;margin-top:8px;align-items:center">${monsterSprite(sig, 44)}<div class="grow"><div class="name">${careerLink(sig.id, sig.name)} ${badge('signature')}</div><div class="sub">${$t('league.ovr_games_honors_with_the_club', { position: esc(sig.position), ovr: sig.ovr, games: sig.games, honors: sig.honours, n: sig.honours })}</div></div></div>` : `<p class="dim">${$t('league.the_rivals_signature_monster_is_on')}</p>`}
    <div class="grid2" style="margin-top:8px"><button class="btn small" data-action="club" data-club="${esc(rv.team)}">${$t('league.their_roster')}</button></div></div>` : `<p class="dim">${$t('league.no_rival_yet')}</p>`;
  const legends = prot.filter((p) => p.kind === 'legendary');
  return `${rivalPanel}<h3>${$t('league.gym_legendaries')}</h3><p class="muted">${$t('league.each_gyms_legendary_belongs_to_its')}</p><div class="list">${legends.map((p) => `<div class="item static">${monsterSprite(p, 36)}<div class="grow"><div class="name">${careerLink(p.id, p.name)} ${badge('legendary')}</div><div class="sub">${esc(p.club)}${p.gym ? ` ${$t('league.the', { gym: esc(p.gym) })}` : ''} ${$t('league.ovr_games_honors', { position: esc(p.position), ovr: p.ovr, games: p.games, honors: p.honours, n: p.honours })}</div></div><button class="btn small" data-action="club" data-club="${esc(p.club)}">${$t('league.club')}</button></div>`).join('') || `<p class="dim">${$t('league.no_gym_legendaries_on_record_yet')}</p>`}</div>`;
}

// ---------------------------------------------------------------- The region map (owner 2026-11-23): the league as a place.
// Two landmasses across a strait: Veyra in the west, its four regions north to south, and Koruun in the east with the Azure
// Isles off its southern coast. Every club sits at its home stadium; Gym Leaders carry their type's colour and, once beaten, a
// gold star. Drawn here (not in a module of its own) because the released game is at the artifact's 512-file limit.
export const MAP_VIEW = Object.freeze({ x: -10, y: 0, w: 820, h: 548 });
/** Where each club's home stadium stands, in map units (a wide world, 820 × 548). Four to a region, around the region's name. */
export const MAP_PINS = Object.freeze({
  'Frostpeak Howlers': [72, 104], 'Glacier Guardians': [160, 96], 'Northstar Novas': [160, 222], 'Ironpeak Colossi': [70, 222],
  'Stormport Bolts': [246, 102], 'Canyon Crushers': [334, 110], 'Sundown Drakes': [248, 222], 'Thunder Mesa Blitz': [336, 218],
  'Goldhaven Royals': [160, 310], 'Riverbend Rapids': [74, 312], 'Pinecrest Wardens': [82, 430], 'Skyvale Cyclones': [158, 438],
  'Emberfall Infernos': [248, 312], 'Coral Bay Tides': [334, 318], 'Cliffhaven Chargers': [246, 428], 'Palm Isle Mystics': [324, 430],
  'Stonehaven Bastions': [552, 84], 'Eastport Phantoms': [470, 92], 'Harbor Anchors': [460, 196], 'Ashford Cinders': [550, 196],
  'Thornwood Wildroots': [630, 88], 'Silvergrove Arcanists': [716, 98], 'Mossvale Quakes': [632, 196], 'Fernhaven Wisps': [714, 192],
  'Ember City Beasts': [486, 282], 'Bayou Stalkers': [700, 282], 'Sunfire Solars': [530, 372], 'Palmetto Wyrms': [660, 372],
  'Aetheria Seers': [500, 476], 'Deepwater Chompers': [596, 488], 'Mistport Veils': [690, 470], 'Westhaven Pirates': [774, 494],
});
/**
 * The pins of the league layout in play (data/league.js LEAGUE_LAYOUTS). Layout 2 swaps four clubs between divisions, and each
 * pair swaps home grounds on the map too, so every club still stands in its own region: Canyon Crushers and Pinecrest Wardens
 * (Redrock / Golden Valley), Sunfire Solars and Fernhaven Wisps (Everwild / Greenheart). MAP_PINS is layout 1.
 */
const PIN_SWAPS = Object.freeze({ 2: [['Canyon Crushers', 'Pinecrest Wardens'], ['Sunfire Solars', 'Fernhaven Wisps']] });
const pinsByLayout = {};
export function mapPins(layout = ACTIVE_LAYOUT) {
  if (pinsByLayout[layout]) return pinsByLayout[layout];
  const pins = { ...MAP_PINS }; for (const [a, b] of PIN_SWAPS[layout] || []) [pins[a], pins[b]] = [MAP_PINS[b], MAP_PINS[a]];
  return (pinsByLayout[layout] = Object.freeze(pins));
}
/** Each region's ground on the map, where its name is written, and the small landmarks scattered over it. */
const MAP_REGIONS = Object.freeze({
  Frostlands: { fill: '#dcebf1', shade: '#b9d3dd', label: [116, 162], motif: 'peak' },
  Redrock: { fill: '#b8673d', shade: '#8d4a2a', label: [292, 162], motif: 'mesa' },
  'Golden Valley': { fill: '#cdb259', shade: '#a68c3c', label: [118, 372], motif: 'wheat' },
  Suncoast: { fill: '#e8d6a0', shade: '#cdb67a', label: [288, 372], motif: 'palm' },
  Kingsport: { fill: '#8f8a84', shade: '#6d6863', label: [508, 142], motif: 'town' },
  Greenheart: { fill: '#3f7a3a', shade: '#2d5a2a', label: [672, 142], motif: 'tree' },
  Everwild: { fill: '#5a6838', shade: '#414c27', label: [594, 328], motif: 'reed' },
  'Azure Isles': { fill: '#dcc895', shade: '#b9a36d', label: [640, 536], motif: 'palm' },
});
// The two landmasses (squared-off ellipses: centre and radii) and the islands off Koruun.
const SHAPES = Object.freeze({ Veyra: [200, 270, 182, 226], Koruun: [592, 232, 172, 196] });
const ISLE_CENTERS = [[500, 478, 44, 27, 2.2], [596, 490, 42, 26, 5.3], [690, 470, 42, 26, 3.1], [774, 494, 32, 24, 6.6]];
// Region borders: wavy lines, the same function wherever two regions meet. Veyra splits at x≈200 and y≈270; Koruun at x≈592
// (north half only) and y≈246.
const waveY = (y0) => (x) => y0 + 6 * Math.sin(x / 19 + y0) + 3 * Math.sin(x / 7 + y0 * 2);
const waveX = (x0) => (y) => x0 + 6 * Math.sin(y / 19 + x0) + 3 * Math.sin(y / 7 + x0 * 2);
const SPLIT = Object.freeze({ Veyra: { x: waveX(200), y: waveY(270) }, Koruun: { x: waveX(592), y: waveY(246) } });
/** The region at a map point, or null for the sea. */
export function mapRegionAt(x, y) {
  const inShape = ([cx, cy, a, b], m = 0) => Math.abs((x - cx) / (a - m)) ** (2 / 0.6) + Math.abs((y - cy) / (b - m)) ** (2 / 0.6) < 1;
  if (inShape(SHAPES.Veyra)) { const s = SPLIT.Veyra; const east = x > s.x(y), south = y > s.y(x); return south ? (east ? 'Suncoast' : 'Golden Valley') : (east ? 'Redrock' : 'Frostlands'); }
  if (inShape(SHAPES.Koruun)) { const s = SPLIT.Koruun; return y > s.y(x) ? 'Everwild' : x > s.x(y) ? 'Greenheart' : 'Kingsport'; }
  if (ISLE_CENTERS.some(([cx, cy, a, b]) => inShape([cx, cy, a, b]))) return 'Azure Isles';
  return null;
}
const wobble = (seed, t) => Math.sin(t * 2 + seed) * 0.42 + Math.sin(t * 5 + seed * 2.3) * 0.32 + Math.sin(t * 11 + seed * 0.7) * 0.18 + Math.sin(t * 23 + seed * 1.9) * 0.08;
/** A coastline: a squared-off ellipse whose edge wanders by up to `amp` map units (never far inland). */
function coast(cx, cy, a, b, seed, amp = 6, n = 96) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), k = 0.6;
    const x = Math.sign(c) * Math.abs(c) ** k * a, y = Math.sign(s) * Math.abs(s) ** k * b, r = Math.hypot(x, y) || 1, w = 1 + (Math.max(-0.55, wobble(seed, t)) * amp) / r;
    pts.push(`${(cx + x * w).toFixed(1)},${(cy + y * w).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
export const MAP_LAND = Object.freeze({
  Veyra: coast(...SHAPES.Veyra, 1.7, 16, 180),
  Koruun: coast(...SHAPES.Koruun, 4.1, 16, 180),
  isles: [...ISLE_CENTERS.map(([x, y, a, b, s]) => coast(x, y, a, b, s, 5, 70)), coast(548, 462, 9, 6, 1.1, 2, 30), coast(452, 512, 8, 6, 0.4, 2, 30), coast(800, 452, 7, 5, 2.9, 2, 30), coast(410, 40, 8, 6, 3.3, 2, 30)],
});
/** A half-plane bounded by a wavy line, as a clip path: the side of x = wave(y) ('east') or y = wave(x) ('south'). */
function halfPlane(fn, side) {
  const p = []; if (side === 'east') { for (let y = -20; y <= 580; y += 6) p.push(`${fn(y).toFixed(1)},${y}`); return `M${p.join('L')}L840,580L840,-20Z`; }
  for (let x = -20; x <= 840; x += 6) p.push(`${x},${fn(x).toFixed(1)}`); return `M${p.join('L')}L840,580L-20,580Z`;
}
const MOTIF = {
  peak: (c) => `<path d="M-7 4L0 -7L7 4Z" fill="${c.shade}"/><path d="M-2.6 -3L0 -7L2.6 -3L1 -2L-1 -3.4Z" fill="#fff"/>`,
  mesa: (c) => `<path d="M-8 4L-5 -3H5L8 4Z" fill="${c.shade}"/><path d="M-5 -3H5L4.2 -1.4H-4.2Z" fill="#e2a36a"/>`,
  wheat: () => `<path d="M-4 4V-3M0 4V-5M4 4V-3" stroke="#f3dc8a" stroke-width="1.4" stroke-linecap="round"/>`,
  palm: () => `<path d="M0 5Q1 0 0 -4" stroke="#7a5a34" stroke-width="1.4" fill="none"/><path d="M0 -4Q-5 -6 -7 -2M0 -4Q5 -6 7 -2M0 -4Q-2 -8 -5 -8M0 -4Q2 -8 5 -8" stroke="#3f8a45" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  town: (c) => `<path d="M-7 4V-1H-3V4ZM-2 4V-4H2V4ZM3 4V0H7V4Z" fill="${c.shade}"/><path d="M-2 -4L0 -7L2 -4Z" fill="#c9675a"/>`,
  tree: (c) => `<circle cx="-3" cy="0" r="3.6" fill="${c.shade}"/><circle cx="3" cy="-1" r="4" fill="#2a6a2c"/><circle cx="0" cy="-4" r="3.4" fill="#356f33"/>`,
  reed: () => `<ellipse cx="0" cy="3.5" rx="7" ry="2" fill="#3e6f73" opacity=".8"/><path d="M-3 3V-5M0 3V-7M3 3V-4" stroke="#c9cf8a" stroke-width="1.2" stroke-linecap="round"/>`,
};
/** Landmarks: a jittered grid over the land, each in its region's style, kept clear of the stadiums and the region names. */
const MAP_MOTIFS = (() => {
  let h = 2166136261; const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const pins = Object.values(mapPins()); const out = [];
  for (let y = 30; y < 530; y += 22) for (let x = 14; x < 800; x += 24) {
    const px = x + (rnd() - 0.5) * 14, py = y + (rnd() - 0.5) * 12, d = mapRegionAt(px, py), skip = rnd() < 0.4;
    if (!d || skip || d === 'Azure Isles' || mapRegionAt(px + 10, py) !== d || mapRegionAt(px - 10, py) !== d || mapRegionAt(px, py + 8) !== d || mapRegionAt(px, py - 8) !== d) continue;
    const c = MAP_REGIONS[d]; if (pins.some(([cx, cy]) => Math.hypot(px - cx, py - cy) < 30) || (Math.abs(px - c.label[0]) < 56 && Math.abs(py - c.label[1]) < 12)) continue;
    out.push(`<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${(0.85 + rnd() * 0.35).toFixed(2)})">${MOTIF[c.motif](c)}</g>`);
  }
  return out.join('');
})();

/** Larger landmarks, one style per region (map units around 0,0, roughly 36 × 28). */
const FEATURE = {
  Frostlands: () => `<path d="M-18 9L-6-13L2-3L8-11L19 9Z" fill="#9fbccb"/><path d="M-18 9L-6-13L-3 9Z" fill="#c7dde6"/><path d="M2-3L8-11L10 9Z" fill="#b6cfda"/><path d="M-10-6L-6-13L-2-6L-4-4L-6-7L-8-4Z" fill="#fff"/><path d="M5-7L8-11L11-7L9-6L8-8Z" fill="#fff"/>`,
  Redrock: () => `<path d="M-18 9L-13-4H-1L3 9Z" fill="#8d4a2a"/><path d="M-13-4H-1L-2-1H-12Z" fill="#e2a36a"/><path d="M-15 3H1" stroke="#a65a33" stroke-width="1.4"/><path d="M-1 9L4-8H14L18 9Z" fill="#9c5230"/><path d="M4-8H14L13.4-5.6H4.6Z" fill="#eab07a"/><path d="M2 1H16M3-2H15" stroke="#b0653a" stroke-width="1.2"/>`,
  'Golden Valley': () => `<rect x="-3" y="-6" width="6" height="15" fill="#f1e7c8" stroke="#7a5a34" stroke-width=".8"/><path d="M-4-6L0-11L4-6Z" fill="#b8483a"/><g stroke="#5a4520" stroke-width="1.6" stroke-linecap="round"><path d="M0-6L-9-14M0-6L9 2M0-6L8-14M0-6L-8 2"/></g><circle cy="-6" r="1.6" fill="#5a4520"/><rect x="-1" y="4" width="2" height="5" fill="#5a4520"/>`,
  Suncoast: () => `${[[-10, 2, 1], [0, -2, 1.15], [10, 3, .9]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 8Q1.4 1 0-5" stroke="#7a5a34" stroke-width="1.8" fill="none"/><path d="M0-5Q-6-8-9-3M0-5Q6-8 9-3M0-5Q-3-10-6-11M0-5Q3-10 6-11" stroke="#3f8a45" stroke-width="2" fill="none" stroke-linecap="round"/></g>`).join('')}`,
  Kingsport: () => `<rect x="-16" y="-4" width="8" height="13" fill="#6d6863"/><rect x="-7" y="-12" width="9" height="21" fill="#5f5a55"/><rect x="3" y="-7" width="8" height="16" fill="#77716b"/><rect x="11" y="0" width="6" height="9" fill="#6d6863"/><path d="M-7-12L-2.5-17L2-12Z" fill="#c9675a"/><g fill="#ffe7a3" opacity=".85"><rect x="-5" y="-9" width="2" height="2"/><rect x="-1" y="-9" width="2" height="2"/><rect x="-5" y="-4" width="2" height="2"/><rect x="5" y="-4" width="2" height="2"/><rect x="-14" y="0" width="2" height="2"/></g>`,
  Greenheart: () => `${[[-10, 3, 6], [9, 4, 6], [-3, -3, 7.5], [5, -6, 6], [0, 5, 6.5]].map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${['#2a6a2c', '#2f7431', '#22592a', '#358038', '#2a6a2c'][i]}"/>`).join('')}<circle cx="-5" cy="-6" r="2.4" fill="#4f9a4a" opacity=".7"/>`,
  Everwild: () => `<ellipse cx="0" cy="3" rx="16" ry="7" fill="#3e6f73"/><ellipse cx="-3" cy="2" rx="9" ry="3.5" fill="#5a8f90" opacity=".6"/><circle cx="7" cy="4" r="2" fill="#7fae6a"/><circle cx="-8" cy="5" r="1.6" fill="#7fae6a"/><path d="M-14 3V-8M-11 3V-11M-8 3V-6M12 3V-9M15 4V-5" stroke="#c9cf8a" stroke-width="1.3" stroke-linecap="round"/><path d="M4-2V-14M4-10L0-14M4-8L8-12" stroke="#4a3b2a" stroke-width="1.6" stroke-linecap="round"/>`,
};
/** Hand-placed scenery: rivers and a lake, the canyon, the volcano, the city, the lighthouse, sea lanes, a ship, a serpent. */
const SCENERY = Object.freeze({
  rivers: ['M118 48C108 80 124 110 116 132S108 192 116 240S104 300 108 330S118 382 120 396', 'M120 412C118 440 126 470 122 506', 'M672 40C666 70 678 100 672 120S664 200 674 236S640 270 616 286', 'M604 300C590 330 606 370 596 400S600 420 598 440'],
  lakes: [[120, 404, 15, 8], [610, 293, 13, 7]],
  canyon: 'M286 46L294 66L284 86L297 106L289 128L296 146',
  volcano: [352, 398], lighthouse: [438, 244], city: [512, 56],
  lanes: ['M378 330Q402 318 424 300', 'M380 168Q402 176 424 172', 'M560 430Q546 446 528 458', 'M676 430Q684 446 688 452', 'M760 470Q770 470 772 478'],
  ship: [398, 412], serpent: [404, 246], whirlpool: [786, 392], compass: [420, 498], bowl: [410, 44],
});
/** Everything on the map that never changes, built once: shallows and sea marks, terrain shading, scenery, landmarks. */
const MAP_DETAIL = (() => {
  let h = 977; const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const pins = Object.values(mapPins()); const taken = [];
  const clear = (x, y, r, pinGap = 20) => !pins.some(([px, py]) => Math.hypot(px - x, py - y) < pinGap + r || (Math.abs(px - x) < 26 + r * 0.6 && y - r < py + 34 && y + r > py + 20))
    && !Object.entries(MAP_REGIONS).some(([d, { label: [lx, ly] }]) => Math.abs(lx - x) < d.length * 7.6 + 6 + r && Math.abs(ly - y) < 10 + r) && !taken.some(([tx, ty, tr]) => Math.hypot(tx - x, ty - y) < tr + r);
  const inRegion = (x, y, r) => { const d = mapRegionAt(x, y); return d && [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dy]) => mapRegionAt(x + dx, y + dy) === d) ? d : null; };
  // terrain shading: soft organic patches a shade darker or lighter than the ground
  let shade = '';
  for (let i = 0; i < 260; i++) { const x = 20 + rnd() * 780, y = 40 + rnd() * 480, d = inRegion(x, y, 10); if (!d || d === 'Azure Isles') continue; const c = MAP_REGIONS[d];
    shade += `<path d="${coast(x, y, 10 + rnd() * 22, 6 + rnd() * 12, rnd() * 9, 4, 24)}" fill="${rnd() < 0.7 ? c.shade : '#fff'}" opacity="${rnd() < 0.7 ? 0.2 : 0.07}"/>`; }
  // fields in Golden Valley
  for (let i = 0; i < 90; i++) { const x = 30 + rnd() * 170, y = 280 + rnd() * 200, w = 12 + rnd() * 14, hh = 7 + rnd() * 8; if (inRegion(x, y, 14) !== 'Golden Valley' || !clear(x, y, 6, 24)) continue;
    shade += `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - hh / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" transform="rotate(${(rnd() * 30 - 15).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" fill="${['#d9c068', '#b9a24a', '#c6b25e', '#a9a54e'][i % 4]}" opacity=".55"/>`; }
  // fine texture: snow sparkle, grass ticks, sand dots, cobbles
  const tick = { Frostlands: '#ffffff', Redrock: '#7a3e22', 'Golden Valley': '#8d7330', Suncoast: '#b89a5a', Kingsport: '#5f5a55', Greenheart: '#2d5a2a', Everwild: '#3a4520', 'Azure Isles': '#b89a5a' };
  let fine = ''; for (let i = 0; i < 900; i++) { const x = 16 + rnd() * 790, y = 34 + rnd() * 500, d = inRegion(x, y, 3); if (!d || pins.some(([px, py]) => Math.hypot(px - x, py - y) < 18)) continue;
    fine += d === 'Greenheart' || d === 'Everwild' || d === 'Golden Valley' ? `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l1-3l1 3" stroke="${tick[d]}" stroke-width=".7" fill="none" opacity=".45"/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r=".9" fill="${tick[d]}" opacity="${d === 'Frostlands' ? 0.8 : 0.35}"/>`; }
  // rivers and lakes (drawn under the landmarks)
  const S = SCENERY;
  let water = S.rivers.map((d) => `<path d="${d}" fill="none" stroke="#2f6f96" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#6fb3d6" stroke-width="2.6" stroke-linecap="round"/>`).join('')
    + S.lakes.map(([x, y, a, b]) => `<path d="${coast(x, y, a, b, x / 7, 2, 30)}" fill="#4f93b8" stroke="#2f6f96" stroke-width="1.4"/><path d="${coast(x - 2, y - 1, a * 0.55, b * 0.4, 1, 1, 20)}" fill="#8cc6e0" opacity=".6"/>`).join('');
  water += `<path d="${S.canyon}" fill="none" stroke="#5e2d17" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="${S.canyon}" fill="none" stroke="#e2a36a" stroke-width="1.2" stroke-linejoin="round" transform="translate(1.6 0)" opacity=".8"/>`;
  for (const [x, y] of [S.volcano, S.lighthouse, S.city]) taken.push([x, y, 20]);
  for (const d of S.rivers) { const m = d.match(/-?\d+(\.\d+)?/g).map(Number); for (let k = 0; k + 1 < m.length; k += 2) taken.push([m[k], m[k + 1], 7]); }
  for (const [x, y, a] of S.lakes) taken.push([x, y, a + 4]);
  // roads: each division's clubs joined, a pale dashed track
  let roads = ''; for (const [d, clubs] of Object.entries(DIVISIONS)) { if (d === 'Azure Isles') continue; const p = clubs.map((c) => mapPins()[c]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    for (const [a, b] of [[p[0], p[1]], [p[0], p[2]], [p[1], p[3]], [p[2], p[3]]]) roads += `<path d="M${a[0]} ${a[1]}Q${(a[0] + b[0]) / 2 + 6} ${(a[1] + b[1]) / 2 - 6} ${b[0]} ${b[1]}" fill="none" stroke="#f4ecd0" stroke-width="1.6" stroke-dasharray="3 3" opacity=".55"/>`; }
  // landmarks: a few large ones per region, clear of everything else
  let marks = ''; const want = { Frostlands: 12, Redrock: 9, 'Golden Valley': 6, Suncoast: 6, Kingsport: 6, Greenheart: 13, Everwild: 8 };
  for (const [d, n] of Object.entries(want)) { let got = 0; for (let k = 0; k < 3000 && got < n; k++) { const x = 20 + rnd() * 780, y = 40 + rnd() * 470; if (inRegion(x, y, 16) !== d || !clear(x, y, 14)) continue;
    taken.push([x, y, 20]); got++; marks += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.85 + rnd() * 0.3).toFixed(2)})">${FEATURE[d]()}</g>`; } }
  const [vx, vy] = S.volcano, [lx, ly] = S.lighthouse, [cx, cy] = S.city;
  marks += `<g transform="translate(${vx} ${vy})"><path d="M-17 10L-5-9H5L17 10Z" fill="#5a3a2a"/><path d="M-5-9H5L3-5Q0-3-3-5Z" fill="#ff6a2a"/><path d="M-2-6L-6 4M2-6L4 2" stroke="#ff8a3a" stroke-width="1.4" stroke-linecap="round"/><g fill="#8a8a8a" opacity=".6"><circle cx="2" cy="-15" r="4"/><circle cx="7" cy="-21" r="5"/><circle cx="13" cy="-28" r="6"/></g></g>`
    + `<g transform="translate(${lx} ${ly})"><path d="M-3 10L-2-8H2L3 10Z" fill="#f4ecd0"/><path d="M-2.6-2H2.6M-2.8 4H2.8" stroke="#b8483a" stroke-width="2.4"/><rect x="-3" y="-12" width="6" height="4" fill="#ffd34d"/><path d="M-3.4-12L0-15.5L3.4-12Z" fill="#b8483a"/><path d="M3-10L22-15V-5Z" fill="#ffd34d" opacity=".35"/></g>`
    + `<g transform="translate(${cx} ${cy}) scale(1.15)">${FEATURE.Kingsport()}</g>`;
  // the sea: shallows round every coast, sea lanes, a ship, a serpent, a whirlpool, the compass, the Beast Bowl's island
  const shallows = [MAP_LAND.Veyra, MAP_LAND.Koruun, ...MAP_LAND.isles].map((d) => `<path d="${d}" fill="none" stroke="#2f7aa6" stroke-width="26" opacity=".35"/><path d="${d}" fill="none" stroke="#4f9cc6" stroke-width="12" opacity=".45"/>`).join('');
  const lanes = S.lanes.map((d) => `<path d="${d}" fill="none" stroke="#cfe6f5" stroke-width="1.3" stroke-dasharray="2 4" opacity=".6"/>`).join('');
  const [sx, sy] = S.ship, [ex, ey] = S.serpent, [wx, wy] = S.whirlpool, [kx, ky] = S.compass, [bx, by] = S.bowl;
  const sea = `${lanes}<g transform="translate(${sx} ${sy})"><path d="M-11 2H11L7 8H-7Z" fill="#7a4a2a"/><path d="M0 2V-14" stroke="#4a3020" stroke-width="1.4"/><path d="M1-13L10 0H1Z" fill="#f4ecd0"/><path d="M-1-11L-8 0H-1Z" fill="#e2d6b0"/><path d="M-14 10q4-2 8 0t8 0t8 0" stroke="#cfe6f5" stroke-width="1" fill="none" opacity=".6"/></g>`
    + `<g transform="translate(${ex} ${ey})" fill="#3f8a6a" stroke="#1d4a3a" stroke-width="1"><path d="M-16 4Q-13-6-10 4Z"/><path d="M-6 4Q-2-9 2 4Z"/><path d="M6 4Q8-14 14-10Q17-8 15-6Q12-9 10-4L10 4Z"/><circle cx="13.5" cy="-9.5" r="1" fill="#ffd34d" stroke="none"/><path d="M-20 5H20" stroke="#cfe6f5" stroke-width="1" opacity=".7"/></g>`
    + `<g transform="translate(${wx} ${wy})" fill="none" stroke="#cfe6f5" opacity=".55" stroke-linecap="round"><path d="M0 0m-12 0a12 7 0 1 1 24 0" stroke-width="1.4"/><path d="M-8 1a8 4.6 0 1 0 16 0" stroke-width="1.2"/><path d="M-4 0a4 2.4 0 1 1 8 0" stroke-width="1"/></g>`
    + `<g transform="translate(${kx} ${ky})"><circle r="17" fill="#173f5c" stroke="#cfe6f5" stroke-width=".8" opacity=".9"/><path d="M0-22L3.6 0L0 22L-3.6 0Z" fill="#f4ecd0"/><path d="M0-22L3.6 0H-3.6Z" fill="#ffd34d"/><path d="M-22 0L0-3.6L22 0L0 3.6Z" fill="#cfe6f5" opacity=".7"/><text y="-25" class="map-compass">N</text></g>`
    + `<g transform="translate(${bx} ${by})"><path d="${coast(0, 0, 15, 11, 3.3, 2, 30)}" fill="#e8d6a0" stroke="#24384a" stroke-width="1.1"/><ellipse rx="9" ry="5.6" fill="#2f8a5c" stroke="#f4ecd0" stroke-width="1.6"/><ellipse rx="5" ry="2.6" fill="none" stroke="#f4ecd0" stroke-width=".7"/><path d="M-1.6-8H1.6L1-5H-1Z" fill="#ffd34d"/><text y="22" class="map-bowl">${esc($t('map.beast_bowl')).toUpperCase()}</text></g>`;
  return { shallows, shade: shade + fine, water, roads, marks, sea };
})();

/** This week's league games ([{home, away}]), or none in the playoffs, the offseason or the league's bye. */
export function mapWeekGames(f) {
  if (!f?.season || f.season.finished || f.season.playoffs) return [];
  const w = leagueSeasonFixtures(f.season.year, f.seed).find((x) => x.week === f.season.week);
  return w && !w.bye ? w.games : [];
}
const MAP_MODES = ['all', 'division', 'gyms', 'week'];
/** Who is lit on the map in a mode. */
export function mapLit(f, mode) {
  const all = Object.keys(MAP_PINS);
  if (mode === 'division') return new Set(DIVISIONS[divisionOf(f.club)] || all);
  if (mode === 'gyms') return new Set([...all.filter((c) => GYM_BY_CLUB[c]), f.club]);
  if (mode === 'week') { const s = new Set(mapWeekGames(f).flatMap((g) => [g.home, g.away])); return s.size ? s : new Set(all); }
  return new Set(all);
}
/** The whole map as one inline svg. `sel` is the club whose card is open. */
export function regionMapSvg(f, { mode = 'all', sel = null } = {}) {
  const lit = mapLit(f, mode); const mine = f.club;
  const next = (f.season?.schedule || []).find((g) => g.week === f.season.week && !g.bye && !g.result)?.opponent || null;
  const rival = f.rivals?.[f.tier]?.team || null;
  const R = (d) => MAP_REGIONS[d].fill; const full = `<rect x="-20" y="-20" width="860" height="600"`;
  const defs = `<defs><linearGradient id="map-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#143651"/><stop offset="1" stop-color="#1c4f72"/></linearGradient>
    <clipPath id="map-veyra"><path d="${MAP_LAND.Veyra}"/></clipPath><clipPath id="map-koruun"><path d="${MAP_LAND.Koruun}"/></clipPath>
    <clipPath id="map-v-east"><path d="${halfPlane(SPLIT.Veyra.x, 'east')}"/></clipPath><clipPath id="map-v-south"><path d="${halfPlane(SPLIT.Veyra.y, 'south')}"/></clipPath>
    <clipPath id="map-k-east"><path d="${halfPlane(SPLIT.Koruun.x, 'east')}"/></clipPath><clipPath id="map-k-south"><path d="${halfPlane(SPLIT.Koruun.y, 'south')}"/></clipPath>
    <filter id="map-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#06121e" flood-opacity=".55"/></filter></defs>`;
  // the sea, with a few wave marks
  let waves = ''; { let h = 7; const r = () => ((h = (h * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 120; i++) { const x = -10 + r() * 820, y = r() * 548; if (mapRegionAt(x, y) || mapRegionAt(x + 12, y)) continue; waves += `<path d="M${x.toFixed(0)} ${y.toFixed(0)}q3 -3 6 0t6 0" stroke="#5f9cc4" stroke-width="1" fill="none" opacity=".35"/>`; } }
  const shore = (d, w = 1.4) => `<path d="${d}" fill="#e8dcb2" filter="url(#map-shadow)"/><path d="${d}" fill="none" stroke="#f4ecd0" stroke-width="6" opacity=".5"/>`;
  const outline = (d, w = 1.4) => `<path d="${d}" fill="none" stroke="#24384a" stroke-width="${w}"/>`;
  // regions: nested clips along the shared wavy borders, so neighbours always meet exactly
  const veyra = `<g clip-path="url(#map-veyra)">${full} fill="${R('Frostlands')}"/><g clip-path="url(#map-v-east)">${full} fill="${R('Redrock')}"/></g>
    <g clip-path="url(#map-v-south)">${full} fill="${R('Golden Valley')}"/><g clip-path="url(#map-v-east)">${full} fill="${R('Suncoast')}"/></g></g></g>`;
  const koruun = `<g clip-path="url(#map-koruun)">${full} fill="${R('Kingsport')}"/><g clip-path="url(#map-k-east)">${full} fill="${R('Greenheart')}"/></g><g clip-path="url(#map-k-south)">${full} fill="${R('Everwild')}"/></g></g>`;
  const isles = MAP_LAND.isles.map((d) => `<path d="${d}" fill="${R('Azure Isles')}" filter="url(#map-shadow)"/>${outline(d, 1.2)}`).join('')
    + ISLE_CENTERS.map(([cx, cy, a, b], i) => `<g transform="translate(${cx + (i % 2 ? -a * 0.62 : a * 0.6)} ${cy + (i % 2 ? b * 0.2 : -b * 0.25)}) scale(.85)">${MOTIF.palm()}</g>`).join('');
  const labels = Object.entries(MAP_REGIONS).map(([d, c]) => { const w = d.length * 7.6 + 8;
    return `<g class="map-region-tap" data-action="mapregion" data-division="${esc(d)}" role="button" tabindex="0" aria-label="${esc($t('map.region_aria', { region: d }))}"><rect x="${c.label[0] - w}" y="${c.label[1] - 11}" width="${w * 2}" height="22" rx="6" fill="transparent"/><text class="map-region" x="${c.label[0]}" y="${c.label[1]}">${esc(REGIONS[d]?.label || d).toUpperCase()}</text></g>`; }).join('')
    + CONFERENCE_NAMES.map((conf) => { const [cx] = SHAPES[conf]; return `<text class="map-conf" x="${cx}" y="22">${esc(conf).toUpperCase()}</text>`; }).join('');
  // this week's games: every pairing in "This week", otherwise only yours
  const games = mode === 'week' ? mapWeekGames(f) : next ? [{ home: mine, away: next }] : [];
  const routes = games.map((g) => { const a = mapPins()[g.home], b = mapPins()[g.away]; if (!a || !b) return ''; const me = g.home === mine || g.away === mine;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, bend = Math.min(40, len * 0.22);
    const qx = mx - (dy / len) * bend, qy = my + (dx / len) * bend;
    const res = mode === 'week' ? (f.season?.results || []).find((x) => x.week === f.season.week && x.home === g.home && x.away === g.away) : null;
    const score = res ? `<g class="map-score${me ? ' mine' : ''}" transform="translate(${((mx + qx) / 2).toFixed(1)} ${((my + qy) / 2).toFixed(1)})"><rect x="-17" y="-8" width="34" height="16" rx="8"/><text y="4">${res.homeScore}–${res.awayScore}</text></g>` : '';
    return `<path class="map-route ${me ? 'mine' : ''}" d="M${a[0]} ${a[1]}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${b[0]} ${b[1]}"/>${score}`; }).join('');
  const pins = Object.entries(mapPins()).map(([club, [x, y]]) => {
    const gym = GYM_BY_CLUB[club]; const held = gym && F.badgeOf(f, club); const me = club === mine; const dim = !lit.has(club);
    const ring = me ? `<circle class="map-ring you" r="20.5"/>` : club === next ? `<circle class="map-ring next" r="19.5"/>` : club === rival ? `<circle class="map-ring rival" r="19.5"/>` : '';
    const g = gym ? `<g transform="translate(12.5 -12.5)"><circle r="5.6" fill="${held ? '#ffd34d' : `hsl(${TYPES[gym.element]?.hue ?? 0} 70% 52%)`}" stroke="#0b1622" stroke-width="1.4"/>${held ? `<path d="M0 -3.4L1 -1L3.4 -1L1.5 .6L2.2 3L0 1.6L-2.2 3L-1.5 .6L-3.4 -1L-1 -1Z" fill="#7a4a00"/>` : ''}</g>` : '';
    const place = CLUB_NAMES[club]?.[0] || club;
    return `<g class="map-pin${me ? ' me' : ''}${dim ? ' dim' : ''}${sel === club ? ' sel' : ''}" data-action="mapclub" data-club="${esc(club)}" transform="translate(${x} ${y})" role="button" tabindex="0" aria-label="${esc(club)}">
      <circle class="map-hit" r="24"/>${ring}<circle r="15.5" fill="#0e1824" stroke="${sel === club ? '#fff' : '#f4ecd0'}" stroke-width="${sel === club ? 2.4 : 1.4}"/>
      <g transform="translate(-13.5 -13.5) scale(.27)">${logoBody(club)}</g>${g}<text class="map-name" y="28">${esc(place)}</text>${mode === 'week' && !dim ? `<text class="map-rec" y="39">${f.season?.records?.[club]?.w ?? 0}-${f.season?.records?.[club]?.l ?? 0}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="region-map" viewBox="${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.w} ${MAP_VIEW.h}" role="img" aria-label="${esc($t('map.aria', { n: Object.keys(MAP_PINS).length }))}">${defs}
    <rect x="${MAP_VIEW.x}" y="${MAP_VIEW.y}" width="${MAP_VIEW.w}" height="${MAP_VIEW.h}" fill="url(#map-sea)"/>${waves}
    ${MAP_DETAIL.shallows}${MAP_DETAIL.sea}${shore(MAP_LAND.Veyra)}${shore(MAP_LAND.Koruun)}${veyra}${koruun}<g clip-path="url(#map-veyra)">${MAP_DETAIL.shade}</g><g clip-path="url(#map-koruun)">${MAP_DETAIL.shade}</g>${MAP_DETAIL.water}${MAP_MOTIFS}${MAP_DETAIL.roads}${MAP_DETAIL.marks}${outline(MAP_LAND.Veyra)}${outline(MAP_LAND.Koruun)}${isles}
    ${labels}<g class="map-routes">${routes}</g>${pins}</svg>`;
}
/** The card under the map for one club. */
function mapClubCard(f, club) {
  const meta = TEAM_META[club]; if (!meta) return '';
  const div = divisionOf(club), conf = conferenceFor(div); const st = stadiumFor(club); const env = ENVIRONMENTS[st.env] || ENVIRONMENTS.grass;
  const rec = f.season?.records?.[club] || { w: 0, l: 0 }; const placeIn = (F.leagueStandings(f).divisions?.[div] || []).indexOf(club) + 1;
  const gym = GYM_BY_CLUB[club]; const held = gym && F.badgeOf(f, club); const mine = club === f.club;
  const next = (f.season?.schedule || []).find((g) => g.week === f.season.week && !g.bye && !g.result)?.opponent === club; const rival = f.rivals?.[f.tier]?.team === club;
  const tags = [mine ? `<span class="chip accent">${$t('map.your_club')}</span>` : '', next ? `<span class="chip bad">${$t('map.plays_you')}</span>` : '', rival ? `<span class="chip" style="border-color:#a855f7">⚔️ ${$t('map.rival')}</span>` : ''].join('');
  return `<div class="panel map-card"><div class="row" style="gap:10px;align-items:center">${teamLogo(club, 46, { cls: 'team-logo inline' })}<div class="grow"><div style="font-weight:900;color:${meta.ink}">${esc(club)}</div><div class="dim">${$t('map.division_line', { division: esc(div), conference: esc(conf) })}</div></div><span class="chip mono">${rec.w}-${rec.l}</span></div>
    ${tags ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${tags}</div>` : ''}
    <div class="kv" style="margin-top:8px"><b>${$t('map.home')}</b><span>${env.icon} ${esc(st.name)} <span class="dim">${esc(env.short)}</span></span><b>${$t('map.standing')}</b><span>${placeIn ? $t('map.place_in', { place: placeIn, division: esc(div) }) : '—'}</span>${gym ? `<b>${$t('map.gym')}</b><span>${$t('map.gym_line', { coach: esc(gym.coach.name), element: esc(gym.element), badge: esc(gym.badge) })}<br><span class="${held ? 'good' : 'dim'}">${held ? $t('map.badge_held', { year: yearOf(held.year) }) : $t('map.badge_open')}</span></span>` : ''}</div>
    <div class="grid2" style="margin-top:8px"><button class="btn block" data-action="stadium" data-club="${esc(club)}">${$t('map.view_stadium')}</button><button class="btn block" data-action="club" data-club="${esc(club)}">${$t('map.club_page')}</button></div></div>`;
}
/** A region's sheet: its four clubs in standing order, each with record and points, and a way to each club. */
export function mapRegionHtml(f, division) {
  const clubs = (F.leagueStandings(f).divisions?.[division] || DIVISIONS[division] || []); const rec = (c) => f.season?.records?.[c] || { w: 0, l: 0, pf: 0, pa: 0 };
  const gyms = clubs.filter((c) => GYM_BY_CLUB[c]).map((c) => `${esc(CLUB_NAMES[c]?.[0] || c)} (${esc(GYM_BY_CLUB[c].element)})`);
  return `<p class="muted">${gyms.length ? $t('map.region_gyms', { conference: esc(conferenceFor(division)), gyms: gyms.join(', ') }) : $t('map.region_none', { conference: esc(conferenceFor(division)) })}</p><div class="list">${clubs.map((c, i) => { const g = GYM_BY_CLUB[c]; const r = rec(c);
    return `<button class="item${c === f.club ? ' mine' : ''}" data-action="regionclub" data-club="${esc(c)}"><span class="dim mono" style="width:16px">${i + 1}</span>${teamLogo(c, 32, { cls: 'team-logo inline' })}<div class="grow"><div class="name">${esc(c)}</div><div class="sub">${esc(stadiumFor(c).name)}${g ? ` · 👑 ${esc(g.element)} Gym` : ''}</div></div><span class="mono">${r.w}-${r.l}</span><span class="dim mono" style="font-size:12px">${r.pf ?? 0}/${r.pa ?? 0}</span></button>`; }).join('')}</div>
    <p class="dim" style="margin-top:6px">${$t('map.region_foot')}</p>`;
}
const MAP_ZOOMS = [1, 2, 3];
// The whole world fits a wide screen; on a phone the map opens at 2× on your club and drags sideways.
const mapDefaultZoom = () => 1; // the whole world first, on every screen (owner 2026-11-24); zoom in with + or a pinch
const MAP_KEY = 'gridiron-beast-v7-map';

/**
 * Map gestures beyond native scrolling: two-finger pinch (touch), ctrl/⌘ + wheel or a trackpad pinch (desktop), and dragging
 * with a mouse when zoomed in. Zoom snaps to MAP_ZOOMS when the gesture ends; while pinching the map scales live.
 */
function mapGestures(sc, { zoom, setZoom, canvas }) {
  const snap = (z) => MAP_ZOOMS.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
  let pinch = null;
  const mid = (t) => { const r = sc.getBoundingClientRect(); return [(t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top]; };
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  sc.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { pinch = { d0: dist(e.touches), at: mid(e.touches), k: 1 }; } }, { passive: true });
  sc.addEventListener('touchmove', (e) => { if (!pinch || e.touches.length !== 2) return; e.preventDefault();
    pinch.k = Math.max(1 / zoom, Math.min(MAP_ZOOMS[MAP_ZOOMS.length - 1] / zoom, dist(e.touches) / pinch.d0));
    if (canvas) { canvas.style.transformOrigin = `${sc.scrollLeft + pinch.at[0]}px ${sc.scrollTop + pinch.at[1]}px`; canvas.style.transform = `scale(${pinch.k})`; } }, { passive: false });
  const endPinch = () => { if (!pinch) return; const p = pinch; pinch = null; if (canvas) canvas.style.transform = '';
    const z1 = snap(zoom * p.k); if (z1 !== zoom) setZoom(z1, p.at[0], p.at[1]); };
  sc.addEventListener('touchend', (e) => { if (e.touches.length < 2) endPinch(); }); sc.addEventListener('touchcancel', endPinch);
  let wheel = 0, wheelAt = null, wheelT = null;
  sc.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = sc.getBoundingClientRect();
    wheel -= e.deltaY; wheelAt = [e.clientX - r.left, e.clientY - r.top]; clearTimeout(wheelT);
    wheelT = setTimeout(() => { const i = MAP_ZOOMS.indexOf(zoom) + (wheel > 0 ? 1 : -1); wheel = 0; const z1 = MAP_ZOOMS[Math.max(0, Math.min(MAP_ZOOMS.length - 1, i))]; if (z1 !== zoom) setZoom(z1, ...wheelAt); }, 140); }, { passive: false });
  let drag = null, moved = false;
  sc.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0 || zoom === MAP_ZOOMS[0]) return; drag = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop }; moved = false; });
  sc.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!moved && Math.hypot(dx, dy) < 5) return;
    moved = true; sc.classList.add('dragging'); sc.scrollLeft = drag.l - dx; sc.scrollTop = drag.t - dy; });
  const up = () => { drag = null; sc.classList.remove('dragging'); }; sc.addEventListener('pointerup', up); sc.addEventListener('pointerleave', up);
  sc.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true); // a drag is not a tap on a club
}

export function registerLeagueHubScreens(Router, app) {
  let scope = 'all';
  Router.registerScreen('league', {
    title: $t('league.league_hub'),
    render({ f }) {
      if (!f) return `<div class="panel"><p>${$t('league.no_franchise_is_open')}</p><button class="btn block" data-action="go" data-screen="menu">${$t('league.main_menu')}</button></div>`;
      const tab = TABS.some(([k]) => k === get(TAB_KEY)) ? get(TAB_KEY) : 'clubs';
      const body = tab === 'clubs' ? clubsTab(f) : tab === 'leaders' ? leadersTab(f, scope === 'mine') : tab === 'moves' ? movesTab(f) : tab === 'races' ? racesTab(f) : rivalsTab(f);
      return `<button class="btn block league-standings" data-action="go" data-screen="standings" style="margin-bottom:8px">${$t('league.standings')}</button><div class="seg wrap" role="tablist" style="margin-bottom:8px">${TABS.map(([k, l]) => `<button class="btn small ${tab === k ? 'primary' : ''}" role="tab" aria-selected="${tab === k}" data-action="tab" data-tab="${k}">${l}</button>`).join('')}</div>${body}<h3 class="hh-h">${$t('league.history_and_records')}</h3>${historyNavHtml(null)}`;
    },
    mount(root) {
      delegate(root, { tab: (el) => { set(TAB_KEY, el.dataset.tab); Router.render(); }, scope: (el) => { scope = el.dataset.v; Router.render(); }, club: (el) => Router.go('club', { club: el.dataset.club }), go: (el) => Router.go(el.dataset.screen), hnav: (el) => Router.go(el.dataset.screen) });
    },
  });
  // The region map: a tab of its own (it replaced My Office on the tab bar; My Office is on HQ).
  let mapSel = null, mapScroll = null;
  const mapPrefs = () => { try { return JSON.parse(get(MAP_KEY) || '{}') || {}; } catch { return {}; } };
  Router.registerScreen('map', {
    title: $t('map.title'), back: false,
    render({ f }) {
      if (!f) return `<div class="panel"><p>${$t('league.no_franchise_is_open')}</p></div>`;
      const p = mapPrefs(); const mode = MAP_MODES.includes(p.mode) ? p.mode : 'all'; const zoom = MAP_ZOOMS.includes(p.zoom) ? p.zoom : mapDefaultZoom();
      const sel = mapPins()[mapSel] ? mapSel : f.club; const week = mapWeekGames(f);
      const label = { all: $t('map.mode_all'), division: $t('map.mode_division'), gyms: $t('map.mode_gyms'), week: $t('map.mode_week') };
      const note = mode === 'week' ? (week.length ? $t('map.week_games', { n: week.length, week: f.season.week }) : $t('map.week_none')) : $t('map.tap_hint');
      return `<div class="seg map-modes" role="tablist">${MAP_MODES.map((m) => `<button class="btn small ${m === mode ? 'primary' : ''}" role="tab" aria-selected="${m === mode}" data-action="mapmode" data-mode="${m}">${label[m]}</button>`).join('')}</div>
        <div class="map-frame"><div class="map-scroll" data-zoom="${zoom}"><div class="map-canvas" style="width:${zoom * 100}%">${regionMapSvg(f, { mode, sel })}</div></div></div>
        <div class="map-under"><p class="dim map-note">${note}</p><div class="map-zoom"><button class="btn small" data-action="mapzoom" data-d="-1" aria-label="${$t('map.zoom_out')}" ${zoom === MAP_ZOOMS[0] ? 'disabled' : ''}>−</button><button class="btn small" data-action="mapzoom" data-d="1" aria-label="${$t('map.zoom_in')}" ${zoom === MAP_ZOOMS[MAP_ZOOMS.length - 1] ? 'disabled' : ''}>+</button></div></div>
        <div class="map-legend"><span><i class="lg you"></i>${$t('map.legend_you')}</span><span><i class="lg next"></i>${$t('map.legend_next')}</span><span><i class="lg rival"></i>${$t('map.rival')}</span><span><i class="lg gym"></i>${$t('map.legend_gym')}</span><span><i class="lg badge"></i>${$t('map.legend_badge')}</span></div>
        ${mapClubCard(f, sel)}`;
    },
    mount(root) {
      const sc = root.querySelector?.('.map-scroll');
      if (sc && mapScroll) { sc.scrollLeft = mapScroll.left; sc.scrollTop = mapScroll.top; }
      else if (sc && app.f && mapPins()[mapSel || app.f.club]) { // first visit: centre on the open club
        const [px, py] = mapPins()[mapSel || app.f.club]; const w = sc.scrollWidth, h = sc.scrollHeight;
        sc.scrollLeft = ((px - MAP_VIEW.x) / MAP_VIEW.w) * w - sc.clientWidth / 2; sc.scrollTop = ((py - MAP_VIEW.y) / MAP_VIEW.h) * h - sc.clientHeight / 2; }
      const keep = () => { if (sc) mapScroll = { left: sc.scrollLeft, top: sc.scrollTop }; };
      const curZoom = () => { const p = mapPrefs(); return MAP_ZOOMS.includes(p.zoom) ? p.zoom : mapDefaultZoom(); };
      /** Change zoom keeping the map point under (fx, fy) — the scroller's own pixels; its centre by default — where it was. */
      const setZoom = (z1, fx = sc ? sc.clientWidth / 2 : 0, fy = sc ? sc.clientHeight / 2 : 0) => { const z0 = curZoom(); if (!MAP_ZOOMS.includes(z1) || z1 === z0) return;
        if (sc) { const k = z1 / z0; mapScroll = { left: (sc.scrollLeft + fx) * k - fx, top: (sc.scrollTop + fy) * k - fy }; }
        set(MAP_KEY, JSON.stringify({ ...mapPrefs(), zoom: z1 })); Router.render(); };
      const openRegion = (division) => { if (!app.f || !DIVISIONS[division]) return;
        const h = sheet(mapRegionHtml(app.f, division), { title: REGIONS[division]?.label || division });
        const el = h?.el || document.querySelector('.sheet'); el?.addEventListener?.('click', (e) => { const b = e.target.closest?.('[data-action="regionclub"]'); if (!b) return;
          h?.close ? h.close() : el.querySelector('[data-action="sheet-close"]')?.click(); mapSel = b.dataset.club; selectPin(mapSel);
          root.querySelector(`.map-pin[data-club="${CSS.escape(mapSel)}"]`)?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }); };
      const save = (patch) => set(MAP_KEY, JSON.stringify({ ...mapPrefs(), ...patch }));
      // A tap only moves the selection and swaps the card: the map itself is not drawn again.
      const selectPin = (club) => {
        for (const g of root.querySelectorAll('.map-pin')) { const on = g.dataset.club === club; g.classList.toggle('sel', on); const c = g.querySelector('circle:not(.map-hit):not(.map-ring)'); if (c) { c.setAttribute('stroke', on ? '#fff' : '#f4ecd0'); c.setAttribute('stroke-width', on ? '2.4' : '1.4'); } }
        const card = root.querySelector('.map-card'); if (card && app.f) card.outerHTML = mapClubCard(app.f, club);
      };
      delegate(root, {
        mapclub: (el) => { mapSel = el.dataset.club; selectPin(mapSel); },
        mapmode: (el) => { keep(); save({ mode: el.dataset.mode }); Router.render(); },
        mapzoom: (el) => { const z = curZoom(); setZoom(MAP_ZOOMS[Math.max(0, Math.min(MAP_ZOOMS.length - 1, MAP_ZOOMS.indexOf(z) + Number(el.dataset.d)))]); },
        mapregion: (el) => openRegion(el.dataset.division),
        stadium: (el) => { const v = stadiumFor(el.dataset.club); sheet(venueHtml({ ...v, club: el.dataset.club }), { title: v.name }); },
        club: (el) => Router.go('club', { club: el.dataset.club }),
      });
      root.addEventListener?.('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; const pin = e.target?.closest?.('.map-pin'), reg = e.target?.closest?.('.map-region-tap');
        if (pin) { e.preventDefault(); mapSel = pin.dataset.club; selectPin(mapSel); } else if (reg) { e.preventDefault(); openRegion(reg.dataset.division); } });
      if (sc) mapGestures(sc, { zoom: curZoom(), setZoom, canvas: root.querySelector('.map-canvas') });
    },
  });
  Router.registerScreen('club', {
    title: ({ params }) => params.club || $t('league.club'),
    render({ f, params }) {
      const club = params.club; const meta = TEAM_META[club]; if (!meta) return `<p>${$t('league.no_such_club')}</p>`;
      const rows = clubRosterView(f, club); const rec = f.season.records[club] || { w: 0, l: 0 }; const mine = club === f.club;
      const cap = tierById(f.tier).cap; const payroll = mine ? F.salarySummary(f).monsters : (hasLeague(f) ? clubPayroll(f, club) : null);
      const h2h = mine ? null : headToHead(f, club);
      const year = f.season.year;
      return `<div class="panel"><div class="row between"><b style="color:${meta.ink}">${teamLogo(club, 40, { cls: 'team-logo inline' })}${teamSwatch(club)} ${esc(club)}</b><span class="chip">${rec.w}-${rec.l}</span></div><div class="muted">${$t('league.monsters_team_ovr', { n: rows.length, club: overallOf(f)(club) })}${payroll != null ? ` ${$t('league.payroll_cr', { toLocaleString: payroll.toLocaleString('en-US'), toLocaleString2: cap.toLocaleString('en-US') })}` : ''}${h2h ? ` ${$t('league.against_you', { w: h2h.w, l: h2h.l })}` : ''}</div></div>
        ${rows.length ? `<div class="list">${rows.map((m) => `<div class="item static ${m.injury ? 'hurt' : ''}">${monsterSprite(m, 32)}<div class="grow"><div class="name">${careerLink(m.id, m.name)} ${m.kind ? badge(m.kind) : ''}${m.rookie ? ` <span class="chip">rookie</span>` : ''}${m.injury ? ` <span class="chip" style="border-color:var(--bad)">${$t('league.out_w', { weeks: m.injury.weeks })}</span>` : ''}</div><div class="sub">${$t('league.ovr_age_lvl', { position: esc(m.position), ovr: m.ovr, age: m.age, level: m.level })}${m.seasonsHere != null ? ` · ${m.seasonsHere === 1 ? 'first season here' : `${m.seasonsHere} seasons here`}` : ''}${m.permanent ? $t('league.for_life') : m.ends != null ? ` ${$t('league.deal_to', { year: yearOf(m.ends) })}` : ''}</div></div></div>`).join('')}</div>` : `<p class="dim">${hasLeague(f) ? $t('league.no_roster_on_record') : $t('league.a_generated_roster_it_changes_each')}</p>`}
        <p class="dim" style="margin-top:8px">${$t('league.tap_a_name_for_the_career', { year: yearOf(year) })}</p>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen) }); },
  });
}

// The League Hub (GDD §46, Phase 4): the persistent league made visible. Clubs (a directory, each opening its roster),
// career leaders across the universe, the league's recent moves, the award races and the rivalries (the rival GM and his
// signature monster, the gym legendaries) with their 20-season continuity. Every monster name opens its career. Reads only.

import { teamLogo, logoBody } from '../team-logo.js';
import { esc, delegate } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import { monsterSprite } from '../pixel-monster.js';
import { careerLink } from '../career-ui.js';
import { TEAM_META, tierById, REG_WEEKS, teamSwatch, DIVISIONS, CONFERENCE_NAMES, divisionOf, conferenceFor, leagueSeasonFixtures } from '../../data/league.js';
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
  const pins = Object.values(MAP_PINS); const out = [];
  for (let y = 30; y < 530; y += 22) for (let x = 14; x < 800; x += 24) {
    const px = x + (rnd() - 0.5) * 14, py = y + (rnd() - 0.5) * 12, d = mapRegionAt(px, py), skip = rnd() < 0.4;
    if (!d || skip || d === 'Azure Isles' || mapRegionAt(px + 10, py) !== d || mapRegionAt(px - 10, py) !== d || mapRegionAt(px, py + 8) !== d || mapRegionAt(px, py - 8) !== d) continue;
    const c = MAP_REGIONS[d]; if (pins.some(([cx, cy]) => Math.hypot(px - cx, py - cy) < 30) || (Math.abs(px - c.label[0]) < 56 && Math.abs(py - c.label[1]) < 12)) continue;
    out.push(`<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${(0.85 + rnd() * 0.35).toFixed(2)})">${MOTIF[c.motif](c)}</g>`);
  }
  return out.join('');
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
  const labels = Object.entries(MAP_REGIONS).map(([d, c]) => `<text class="map-region" x="${c.label[0]}" y="${c.label[1]}">${esc(REGIONS[d]?.label || d).toUpperCase()}</text>`).join('')
    + CONFERENCE_NAMES.map((conf) => { const [cx] = SHAPES[conf]; return `<text class="map-conf" x="${cx}" y="22">${esc(conf).toUpperCase()}</text>`; }).join('');
  // this week's games: every pairing in "This week", otherwise only yours
  const games = mode === 'week' ? mapWeekGames(f) : next ? [{ home: mine, away: next }] : [];
  const routes = games.map((g) => { const a = MAP_PINS[g.home], b = MAP_PINS[g.away]; if (!a || !b) return ''; const me = g.home === mine || g.away === mine;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, bend = Math.min(40, len * 0.22);
    return `<path class="map-route ${me ? 'mine' : ''}" d="M${a[0]} ${a[1]}Q${(mx - (dy / len) * bend).toFixed(1)} ${(my + (dx / len) * bend).toFixed(1)} ${b[0]} ${b[1]}"/>`; }).join('');
  const pins = Object.entries(MAP_PINS).map(([club, [x, y]]) => {
    const gym = GYM_BY_CLUB[club]; const held = gym && F.badgeOf(f, club); const me = club === mine; const dim = !lit.has(club);
    const ring = me ? `<circle class="map-ring you" r="20.5"/>` : club === next ? `<circle class="map-ring next" r="19.5"/>` : club === rival ? `<circle class="map-ring rival" r="19.5"/>` : '';
    const g = gym ? `<g transform="translate(12.5 -12.5)"><circle r="5.6" fill="${held ? '#ffd34d' : `hsl(${TYPES[gym.element]?.hue ?? 0} 70% 52%)`}" stroke="#0b1622" stroke-width="1.4"/>${held ? `<path d="M0 -3.4L1 -1L3.4 -1L1.5 .6L2.2 3L0 1.6L-2.2 3L-1.5 .6L-3.4 -1L-1 -1Z" fill="#7a4a00"/>` : ''}</g>` : '';
    const place = CLUB_NAMES[club]?.[0] || club;
    return `<g class="map-pin${me ? ' me' : ''}${dim ? ' dim' : ''}${sel === club ? ' sel' : ''}" data-action="mapclub" data-club="${esc(club)}" transform="translate(${x} ${y})" role="button" tabindex="0" aria-label="${esc(club)}">
      <circle class="map-hit" r="24"/>${ring}<circle r="15.5" fill="#0e1824" stroke="${sel === club ? '#fff' : '#f4ecd0'}" stroke-width="${sel === club ? 2.4 : 1.4}"/>
      <g transform="translate(-13.5 -13.5) scale(.27)">${logoBody(club)}</g>${g}<text class="map-name" y="28">${esc(place)}</text></g>`;
  }).join('');
  return `<svg class="region-map" viewBox="${MAP_VIEW.x} ${MAP_VIEW.y} ${MAP_VIEW.w} ${MAP_VIEW.h}" role="img" aria-label="${esc($t('map.aria', { n: Object.keys(MAP_PINS).length }))}">${defs}
    <rect x="${MAP_VIEW.x}" y="${MAP_VIEW.y}" width="${MAP_VIEW.w}" height="${MAP_VIEW.h}" fill="url(#map-sea)"/>${waves}
    ${shore(MAP_LAND.Veyra)}${shore(MAP_LAND.Koruun)}${veyra}${koruun}${MAP_MOTIFS}${outline(MAP_LAND.Veyra)}${outline(MAP_LAND.Koruun)}${isles}
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
    <button class="btn block" data-action="club" data-club="${esc(club)}" style="margin-top:8px">${$t('map.club_page')}</button></div>`;
}
const MAP_ZOOMS = [1, 2, 3];
// The whole world fits a wide screen; on a phone the map opens at 2× on your club and drags sideways.
const mapDefaultZoom = () => ((globalThis.innerWidth || 1024) < 700 ? 2 : 1);
const MAP_KEY = 'gridiron-beast-v7-map';

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
      const sel = MAP_PINS[mapSel] ? mapSel : f.club; const week = mapWeekGames(f);
      const label = { all: $t('map.mode_all'), division: $t('map.mode_division'), gyms: $t('map.mode_gyms'), week: $t('map.mode_week') };
      const note = mode === 'week' ? (week.length ? $t('map.week_games', { n: week.length, week: f.season.week }) : $t('map.week_none')) : $t('map.tap_hint');
      return `<div class="seg wrap map-modes" role="tablist">${MAP_MODES.map((m) => `<button class="btn small ${m === mode ? 'primary' : ''}" role="tab" aria-selected="${m === mode}" data-action="mapmode" data-mode="${m}">${label[m]}</button>`).join('')}</div>
        <div class="map-frame"><div class="map-scroll" data-zoom="${zoom}"><div class="map-canvas" style="width:${zoom * 100}%">${regionMapSvg(f, { mode, sel })}</div></div></div>
        <div class="map-under"><p class="dim map-note">${note}</p><div class="map-zoom"><button class="btn small" data-action="mapzoom" data-d="-1" aria-label="${$t('map.zoom_out')}" ${zoom === MAP_ZOOMS[0] ? 'disabled' : ''}>−</button><button class="btn small" data-action="mapzoom" data-d="1" aria-label="${$t('map.zoom_in')}" ${zoom === MAP_ZOOMS[MAP_ZOOMS.length - 1] ? 'disabled' : ''}>+</button></div></div>
        <div class="map-legend"><span><i class="lg you"></i>${$t('map.legend_you')}</span><span><i class="lg next"></i>${$t('map.legend_next')}</span><span><i class="lg rival"></i>${$t('map.rival')}</span><span><i class="lg gym"></i>${$t('map.legend_gym')}</span><span><i class="lg badge"></i>${$t('map.legend_badge')}</span></div>
        ${mapClubCard(f, sel)}`;
    },
    mount(root) {
      const sc = root.querySelector?.('.map-scroll');
      if (sc && mapScroll) { sc.scrollLeft = mapScroll.left; sc.scrollTop = mapScroll.top; }
      else if (sc && app.f && MAP_PINS[mapSel || app.f.club]) { // first visit: centre on the open club
        const [px, py] = MAP_PINS[mapSel || app.f.club]; const w = sc.scrollWidth, h = sc.scrollHeight;
        sc.scrollLeft = ((px - MAP_VIEW.x) / MAP_VIEW.w) * w - sc.clientWidth / 2; sc.scrollTop = ((py - MAP_VIEW.y) / MAP_VIEW.h) * h - sc.clientHeight / 2; }
      const keep = () => { if (sc) mapScroll = { left: sc.scrollLeft, top: sc.scrollTop }; };
      const save = (patch) => set(MAP_KEY, JSON.stringify({ ...mapPrefs(), ...patch }));
      delegate(root, {
        mapclub: (el) => { keep(); mapSel = el.dataset.club; Router.render(); },
        mapmode: (el) => { keep(); save({ mode: el.dataset.mode }); Router.render(); },
        mapzoom: (el) => { const p = mapPrefs(); const z = MAP_ZOOMS.includes(p.zoom) ? p.zoom : mapDefaultZoom(); const i = Math.max(0, Math.min(MAP_ZOOMS.length - 1, MAP_ZOOMS.indexOf(z) + Number(el.dataset.d)));
          if (sc) { const z0 = z, z1 = MAP_ZOOMS[i], k = z1 / z0; mapScroll = { left: (sc.scrollLeft + sc.clientWidth / 2) * k - sc.clientWidth / 2, top: (sc.scrollTop + sc.clientHeight / 2) * k - sc.clientHeight / 2 }; }
          save({ zoom: MAP_ZOOMS[i] }); Router.render(); },
        club: (el) => Router.go('club', { club: el.dataset.club }),
      });
      root.addEventListener?.('keydown', (e) => { const pin = e.target?.closest?.('.map-pin'); if (pin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); keep(); mapSel = pin.dataset.club; Router.render(); } });
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

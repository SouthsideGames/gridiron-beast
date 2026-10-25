// The full-screen Monster Career Profile (GDD §48): what the page shows, derived from the one career profile every career
// view already uses (career-profile.js). Nothing here is stored and nothing is invented; building a page never writes the
// monster or the franchise (no backfill, no stats initialisation). Sections: Overview, Timeline, Statistics, Awards & Trophy
// Case, Team History.

import { careerProfile, findMonster, seasonBooks, leagueRowsFor, statValue, TROPHY_META } from './career-profile.js';
import { withDerived, addInto, POSITION_COLUMNS, STAT_GROUPS, GROUP_LABEL, groupsWithData } from './stats.js';
import { SPECIES_BY_ID } from '../data/monsters.js';
import { hasLeague } from './league-registry.js';
import { isArchived } from './lifecycle.js';

export const PAGE_TABS = Object.freeze([['overview', 'Overview'], ['timeline', 'Timeline'], ['stats', 'Stats'], ['awards', 'Awards'], ['teams', 'Teams']]);
const MOVE_TYPES = new Set(['join', 'drafted', 'signed', 'left']);
const MILESTONE_TYPES = new Set(['debut', 'first', 'milestone', 'season', 'playoff', 'evolve', 'level', 'star', 'rival', 'bowl']);
const sum = (...ls) => { const o = {}; for (const l of ls) addInto(o, l || {}); return o; };
const AWARD_KINDS = ['mvp', 'opoy', 'dpoy', 'smoy', 'oroy', 'droy'];

/** Where the monster stands today, from where the save finds him (never guessed). */
export function careerStatus(f, found, p) {
  if (p.kind === 'snapshot') return { key: 'retired', label: p.honours?.hof ? 'Hall of Famer' : 'Retired', detail: p.legacy ? 'From an older Hall of Fame card' : 'Career as it stood at retirement' };
  if (p.kind === 'prospect') return { key: 'prospect', label: 'Draft prospect', detail: 'No professional games yet' };
  if (p.kind === 'league') return { key: 'gone', label: 'Not on a current roster', detail: hasLeague(f) ? 'His season lines remain in the league tables' : 'Known from the league tables' };
  switch (found?.where) {
    case 'roster': return isArchived(f) ? { key: 'archived', label: 'Final roster', detail: 'Archived franchise' } : { key: 'active', label: 'Active', detail: 'Your club' };
    case 'league': return { key: 'active', label: 'Active', detail: found.team ? `With the ${found.team}` : 'In the league' };
    case 'waivers': return { key: 'free', label: 'On waivers', detail: 'Waiting for a claim' };
    case 'pool': case 'market': return { key: 'free', label: 'Free agent', detail: 'In a regional pool' };
    case 'legend': return { key: 'retired', label: 'Retired', detail: found.m?.retired != null ? `Left the league after season ${found.m.retired}` : 'Left the league' };
    case 'drafted': return { key: 'active', label: 'Drafted', detail: found.team ? `By the ${found.team}` : 'This year\'s class' };
    default: return { key: 'unknown', label: 'On record', detail: '' };
  }
}

/** Gym legendary, rival signature or a legendary species (the owner's own legendaries). */
export function designationOf(m, p) {
  if (m?.signature) return { kind: 'signature', label: 'Rival signature' };
  if (m?.legendary) return { kind: 'legendary', label: 'Gym legendary' };
  if (SPECIES_BY_ID[p?.species]?.rarity === 'legendary') return { kind: 'legendary-species', label: 'Legendary' };
  return null;
}

/** Season lines on record, oldest first: [{ year, team, reg, post }] and the career totals the game itself keeps. */
export function seasonLines(f, found, p) {
  if (p.kind === 'full' && found?.m) {
    const m = found.m; const ownClub = found.where === 'roster' ? f.club : null;
    const now = found.where === 'roster' ? f.club : found.where === 'league' ? found.team : null; // the current season's book does not name the club: it is the one he plays for now
    const seasons = seasonBooks(m).map((b) => ({ year: b.year, team: b.team || (b.year === f.season?.year ? now : null) || ownClub || null, reg: b.reg || {}, post: b.post || {} }));
    const career = m.stats?.career ? { reg: m.stats.career.reg || {}, post: m.stats.career.post || {} } : { reg: sum(...seasons.map((s) => s.reg)), post: sum(...seasons.map((s) => s.post)) };
    return { seasons, career, source: 'books' };
  }
  if (p.kind === 'league') {
    const seasons = leagueRowsFor(f, p.id).map((r) => ({ year: r.year, team: r.team, reg: r.reg, post: r.post })).sort((a, b) => a.year - b.year);
    return { seasons, career: { reg: sum(...seasons.map((s) => s.reg)), post: sum(...seasons.map((s) => s.post)) }, source: 'tables' };
  }
  return { seasons: [], career: { reg: {}, post: {} }, source: 'none' };
}

/** The statistic groups a career has numbers in, the position's own first. */
export function statGroups(position, line) {
  const own = Object.keys(STAT_GROUPS).find((g) => STAT_GROUPS[g][0] === ({ TE: 'WR', LB: 'DL', S: 'CB' }[position] || position)) || null;
  return [...new Set([own, ...groupsWithData(line)])].filter(Boolean).map((g) => ({ key: g, label: GROUP_LABEL[g] || g }));
}
/** Columns for a group: the position's own columns for its own group, else the group's. */
export function statColumns(position, group) {
  const colPos = group ? STAT_GROUPS[group]?.[0] : position;
  const own = Object.keys(STAT_GROUPS).find((g) => STAT_GROUPS[g][0] === ({ TE: 'WR', LB: 'DL', S: 'CB' }[position] || position));
  return POSITION_COLUMNS[!group || group === own ? position : colPos] || POSITION_COLUMNS[colPos] || POSITION_COLUMNS.WR;
}
/** One cell: '—' when the line has no such number or a rate lacks the volume to mean anything (never a misleading 0). */
export function statCell(line, key) {
  const d = withDerived(line || {});
  if (d[key] == null || Number.isNaN(d[key])) return '—';
  const v = statValue(line, key); if (v.value === null) return '—';
  return typeof d[key] === 'number' && !Number.isInteger(d[key]) ? String(d[key]) : Number(d[key]).toLocaleString('en-US');
}
export const bucketLine = (s, bucket) => (bucket === 'post' ? s.post || {} : bucket === 'all' ? sum(s.reg, s.post) : s.reg || {});

/** Team history: each club with its seasons, games, recorded moves and the honours won there. */
export function teamHistory(p, lines) {
  const out = []; const byClub = (c) => out.find((x) => x.club === c);
  for (const c of p.clubs || []) { let t = byClub(c.club); if (!t) { t = { club: c.club, spans: [], seasons: [], games: 0, post: 0, moves: [], honours: [] }; out.push(t); } t.spans.push({ from: c.from, to: c.to, how: c.how || null }); }
  for (const s of lines.seasons) { if (!s.team) continue; let t = byClub(s.team); if (!t) { t = { club: s.team, spans: [], seasons: [], games: 0, post: 0, moves: [], honours: [] }; out.push(t); } if (!t.seasons.includes(s.year)) t.seasons.push(s.year); t.games += s.reg?.games || 0; t.post += s.post?.games || 0; }
  const chrono = (p.timeline || []).slice().reverse();
  for (const e of chrono) if (MOVE_TYPES.has(e.t) && e.c) { const t = byClub(e.c); if (t && !t.moves.some((x) => x.k === e.k)) t.moves.push({ k: e.k, t: e.t, y: e.y ?? null, icon: e.icon, title: e.title, desc: e.desc }); }
  for (const tr of p.trophies || []) for (const en of tr.entries || []) { const t = en.club && byClub(en.club); if (t) t.honours.push({ kind: tr.kind, icon: tr.icon, label: tr.short || tr.label, year: en.year ?? null }); }
  for (const t of out) {
    t.seasons.sort((a, b) => a - b); t.honours.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    // The span is everything the record proves for this club: club entries (their start resets at each contract renewal),
    // seasons with lines, and the moves (draft, signing, release) — the earliest and latest of them.
    const froms = [...t.spans.map((x) => x.from), ...t.seasons, ...t.moves.filter((mv) => mv.t !== 'left').map((mv) => mv.y)].filter((y) => y != null);
    const open = t.spans.some((x) => x.from != null && x.to == null) && !t.moves.some((mv) => mv.t === 'left' && mv.y != null && mv.y >= Math.max(...t.spans.map((x) => x.from ?? 0)));
    const tos = [...t.spans.map((x) => x.to), ...t.seasons, ...t.moves.map((mv) => mv.y)].filter((y) => y != null);
    t.from = froms.length ? Math.min(...froms) : null; t.to = open ? null : tos.length ? Math.max(...tos) : null;
  }
  return out;
}

/**
 * The whole page for a monster id (or a ready profile: Hall of Fame snapshots). Returns null when the id is unknown.
 * `profile` lets the screen pass the scouting-aware profile (withVisibility) it shows elsewhere.
 */
export function careerPage(f, id, { profile = null } = {}) {
  const p = profile || careerProfile(f, id); if (!p) return null;
  const found = p.kind === 'snapshot' ? null : findMonster(f, p.id);
  const lines = seasonLines(f, found, p);
  const years = lines.seasons.map((s) => s.year);
  const clubYears = (p.clubs || []).flatMap((c) => [c.from, c.to]).filter((y) => y != null);
  const allYears = [...years, ...clubYears];
  const span = allYears.length ? { from: Math.min(...allYears), to: found?.where === 'roster' || found?.where === 'league' ? null : Math.max(...allYears) } : null;
  const count = (k) => (p.trophies || []).find((t) => t.kind === k)?.count || 0;
  const careerAll = sum(lines.career.reg, lines.career.post);
  const teams = teamHistory(p, lines);
  const timeline = p.timeline || [];
  return {
    p, found: found ? { where: found.where, team: found.team || null } : null,
    status: careerStatus(f, found, p), designation: designationOf(found?.m, p), span,
    facts: { seasons: p.seasons ?? null, onRecord: p.onRecord ?? lines.seasons.length, games: lines.source === 'none' ? (p.stats?.games || 0) : (lines.career.reg.games || 0) + (lines.career.post.games || 0), regGames: lines.source === 'none' ? (p.stats?.games || 0) : (lines.career.reg.games || 0), postGames: lines.career.post.games || 0, teams: teams.length, titles: count('champion'), awards: AWARD_KINDS.reduce((a, k) => a + count(k), 0), records: count('record'), hof: count('hof') > 0 },
    lines, groups: statGroups(p.position, careerAll), teams,
    milestones: timeline.filter((e) => MILESTONE_TYPES.has(e.t)).slice().reverse(),
    moments: timeline.filter((e) => e.tier !== 'career').slice(0, 5),
    awards: (p.trophies || []).map((t) => ({ kind: t.kind, icon: t.icon, label: t.label, count: t.count, entries: t.entries.map((e) => ({ year: e.year ?? null, club: e.club || null })) })),
    meta: TROPHY_META,
  };
}

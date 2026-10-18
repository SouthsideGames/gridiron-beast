// The draft (GDD §19). A class of first-year monsters appears for the final
// regular-season week and the playoffs; Mondays in those weeks scout it,
// Tuesdays are recovery days. In the offseason, after contracts, sixteen clubs
// draft three rounds in snake order from the worst record up. Rookies sign
// two-year deals at 70% of market rate. AI picks persist on their clubs.

import { generateMonster, regionSpecies, salaryFor, monsterOverall, ROSTER_MAX } from '../data/monsters.js';
import { REGIONS } from '../data/staff.js';
import { newContract } from './contracts.js';

export const DRAFT_ROUNDS = 3;
export const ROOKIE_SCALE = 0.70;
export const CLASS_SHAPE = Object.freeze([['QB', 4], ['RB', 5], ['WR', 8], ['TE', 4], ['OL', 7], ['DL', 7], ['LB', 5], ['CB', 6], ['S', 5], ['K', 2]]); // 53

/** Build the class: ages 19–22, all first-year, a spread of quality with a few gems. Scouting reveals them. */
export function generateDraftClass(rng, { year, uniqueName }) {
  const out = []; let n = 0;
  for (const [position, count] of CLASS_SHAPE) {
    for (let i = 0; i < count; i++) {
      const regionName = rng.pick(Object.keys(REGIONS));
      const pool = regionSpecies(regionName, REGIONS[regionName].types, 10).filter((s) => s.position === position || s.secondary === position);
      const sp = pool.length ? rng.pick(pool) : null; if (!sp) continue;
      const roll = rng.next(); const quality = roll < 0.08 ? 62 + rng.int(6) : roll < 0.35 ? 55 + rng.int(6) : 47 + rng.int(8); // gems, solid, projects
      const m = generateMonster(rng, { position, quality, species: sp.id, age: 19 + rng.int(4), yearsPro: 0 });
      m.origin = regionName; m.rookie = year; m.draftRank = ++n;
      uniqueName?.(m, out.map((x) => x.name));
      out.push(m);
    }
  }
  // Public board order: a rough consensus (true quality with noise) so the owner's scouting has something to beat.
  for (const m of out) m.board = monsterOverall(m) + (rng.next() - 0.5) * 8 + (m.potential - 70) * 0.15;
  out.sort((a, b) => b.board - a.board); out.forEach((m, i) => { m.boardRank = i + 1; delete m.board; });
  return out;
}

export function openDraftClass(f, rng, { uniqueName }) {
  if (f.draft && f.draft.year === f.season.year) return f.draft;
  f.draft = { year: f.season.year, class: generateDraftClass(rng, { year: f.season.year, uniqueName }), revealed: {}, picks: [], order: [], round: 0, index: 0, done: false, started: false, scoutWeeks: 0 };
  return f.draft;
}

/** Monday in the final week or the playoffs: the scout studies prospects — a few fully (focus position first), a few partially. */
export function scoutDraftClass(f, rng, { skill = 50, focus = null, bonus = 0 } = {}) {
  const d = f.draft; if (!d) return { ok: false, reason: 'No draft class yet.' };
  const full = (skill >= 80 ? 3 : skill >= 45 ? 2 : 1) + bonus, partial = 3;
  const unseen = d.class.filter((m) => (d.revealed[m.id] || 0) < 6);
  const pri = (m) => (focus && m.position === focus ? 0 : 1) + (d.revealed[m.id] || 0) / 10 + m.boardRank / 1000;
  const sorted = unseen.slice().sort((a, b) => pri(a) - pri(b));
  const studied = sorted.slice(0, full); const glanced = sorted.slice(full, full + partial);
  for (const m of studied) d.revealed[m.id] = 6;
  for (const m of glanced) d.revealed[m.id] = Math.max(d.revealed[m.id] || 0, 2 + rng.int(2));
  d.scoutWeeks += 1;
  return { ok: true, studied, glanced };
}

/** Draft order: worst record first, snake across rounds. `standings` is the overall order best→worst. */
export function draftOrder(standingsBestFirst, rounds = DRAFT_ROUNDS) {
  const base = standingsBestFirst.slice().reverse(); const order = [];
  for (let r = 0; r < rounds; r++) { const seq = r % 2 === 0 ? base : base.slice().reverse(); for (const team of seq) order.push({ round: r + 1, team }); }
  return order;
}

export function startDraft(f, standingsBestFirst) {
  const d = f.draft; if (!d) return { ok: false, reason: 'No draft class.' };
  if (d.started) return { ok: true, draft: d };
  d.order = draftOrder(standingsBestFirst); d.index = 0; d.round = 1; d.started = true; d.available = d.class.map((m) => m.id);
  return { ok: true, draft: d };
}
export const onTheClock = (f) => f.draft?.started && !f.draft.done ? f.draft.order[f.draft.index]?.team : null;

/** AI pick: best available by overall with a little positional taste, never two kickers. */
export function aiDraftPick(f, team, rng) {
  const d = f.draft; const avail = d.class.filter((m) => d.available.includes(m.id));
  const taken = d.picks.filter((p) => p.team === team).map((p) => p.position);
  const score = (m) => monsterOverall(m) + (m.potential - 70) * 0.2 + (rng.next() - 0.5) * 3 - (taken.includes(m.position) ? 4 : 0) - (m.position === 'K' ? 6 : 0);
  return avail.sort((a, b) => score(b) - score(a))[0] || null;
}

function recordPick(f, team, m, { mine = false }) {
  const d = f.draft; const slot = d.order[d.index];
  d.picks.push({ round: slot.round, overall: d.index + 1, team, id: m.id, name: m.name, position: m.position, ovr: monsterOverall(m), mine });
  d.available = d.available.filter((id) => id !== m.id);
  d.index += 1; d.round = d.order[d.index]?.round || d.round;
  if (d.index >= d.order.length) d.done = true;
}

/** Run AI picks until it is the owner's turn or the draft ends. Returns the picks made. */
export function advanceDraft(f, rng, { playerClub, onAiPick = null }) {
  const d = f.draft; const made = [];
  while (d.started && !d.done && d.order[d.index].team !== playerClub) {
    const team = d.order[d.index].team; const m = aiDraftPick(f, team, rng);
    if (!m) { d.done = true; break; }
    recordPick(f, team, m, { mine: false }); made.push({ team, m });
    (f.draftResults ||= {}); (f.draftResults[f.draft.year] ||= {}); (f.draftResults[f.draft.year][team] ||= []).push(m);
    onAiPick?.(team, m);
  }
  return made;
}

/** The owner's pick: a rookie deal at 70% of market, two seasons. */
export function playerPick(f, id, { playerClub, nextYear }) {
  const d = f.draft; if (!d?.started || d.done) return { ok: false, reason: 'The draft is not on.' };
  if (d.order[d.index].team !== playerClub) return { ok: false, reason: 'Not your pick.' };
  if (f.roster.length >= ROSTER_MAX) return { ok: false, reason: `Roster full (${ROSTER_MAX}). Pass, or release someone first.` };
  const m = d.class.find((x) => x.id === id && d.available.includes(x.id)); if (!m) return { ok: false, reason: 'Already taken.' };
  m.salary = Math.round(salaryFor(m) * ROOKIE_SCALE / 100) * 100; m.contract = newContract(nextYear, 2); m.contract.rookie = true;
  f.roster.push(m); recordPick(f, playerClub, m, { mine: true });
  return { ok: true, monster: m };
}
export function passPick(f, { playerClub }) {
  const d = f.draft; if (!d?.started || d.done || d.order[d.index].team !== playerClub) return { ok: false, reason: 'Not your pick.' };
  d.picks.push({ round: d.order[d.index].round, overall: d.index + 1, team: playerClub, id: null, name: '— passed —', position: '', ovr: 0, mine: true, passed: true });
  d.index += 1; d.round = d.order[d.index]?.round || d.round; if (d.index >= d.order.length) d.done = true;
  return { ok: true };
}

/** What the owner knows about a prospect: 6 = everything, 0 = name, position, age and the public board rank only. */
export function prospectView(f, m) { const lvl = f.draft?.revealed?.[m.id] || 0; return { level: lvl, ovr: lvl >= 4 ? monsterOverall(m) : null, potential: lvl >= 6 ? m.potential : null, natureKnown: lvl >= 6, headline: Math.min(4, Math.ceil(lvl / 1.5)) }; }

/** Drafted rookies on AI clubs persist: swap them into the generated roster at their position (weakest out). Keeps three classes. */
export function injectDraftees(f, team, roster, year) {
  const classes = Object.entries(f.draftResults || {}).filter(([y]) => Number(y) >= year - 3).flatMap(([, byTeam]) => byTeam[team] || []);
  for (const rookie of classes) {
    if (roster.some((m) => m.id === rookie.id)) continue;
    const same = roster.filter((m) => m.position === rookie.position && !m.legendary && !m.signature).sort((a, b) => monsterOverall(a) - monsterOverall(b));
    const out = same[0]; if (!out) continue;
    const i = roster.indexOf(out); roster[i] = rookie;
  }
  return roster;
}
/** Age AI draftees at the turn of the year — except the class just drafted, whose first season is the one about to start. */
export function ageDraftees(f, draftedYear) { for (const [y, byTeam] of Object.entries(f.draftResults || {})) { if (Number(y) === draftedYear) continue; for (const list of Object.values(byTeam)) for (const m of list) { m.age += 1; m.yearsPro = (m.yearsPro || 0) + 1; } } }

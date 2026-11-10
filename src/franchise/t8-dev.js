// Task 8 test tools (private test builds only, GDD §42.10). Developer shortcuts for hands-on testing of the M1 systems
// (generation, Basics, Tempers, Apex, levelling, training, evolution, ageing, saving) without playing several seasons.
// Every function refuses unless BUILD.test is true, which no released build sets. Anything that changes the franchise marks it
// `devAssisted` for good and uses the game's own approved functions (level-up, natural growth, the offseason, evolution, the
// save format), never a shortcut formula, so what you see is what the game would do. The sampler changes nothing.

import { BUILD } from '../version.js';
import * as F from './franchise.js';
import { generateMonster, monsterOverall, levelUp, tryEvolve, evolutionReady, nextEvolution, resolveSpecies, syncFromDev, salaryFor, ROSTER_MAX, xpForLevel } from '../data/monsters.js';
import { SPECIES_DEX } from '../data/species.js';
import { ATTRIBUTES } from '../data/personnel.js';
import { TEMPERS, temperSummary, temperEfficiency } from '../data/temper.js';
import { generateIndividual, addBankedPoints, MAX_LEVEL } from './t8/progression.js';
import { offseason } from './progression.js';
import { newContract } from './contracts.js';
import { exportJson, importJson } from './save.js';
import { createRng, hashString } from '../core/rng.js';
import * as FR from '../core/fraction.js';

export const t8ToolsEnabled = () => BUILD.test === true;
const off = { ok: false, reason: 'Task 8 test tools are only in the private test build.' };
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const CHANNELS = ['roster', 'draft', 'scouting', 'encounter', 'arrival'];
export { POSITIONS as T8_POSITIONS, CHANNELS as T8_CHANNELS };

/**
 * Generation sampler (changes nothing): `n` monsters from a channel at a quality, through the real generator. Returns the Basic
 * share, Temper counts (uniform for ordinary, neutral-only for Apex), Apex count and OVR spread, for checking B17 and N7f by eye.
 */
export function generationSample({ channel = 'roster', quality = 58, n = 1000, seed = 1, metric = 'current', veterans = false } = {}) {
  if (!t8ToolsEnabled()) return off;
  const rng = createRng(hashString(`t8-sample|${channel}|${quality}|${seed}`));
  const rows = [];
  for (let i = 0; i < n; i++) {
    const position = POSITIONS[i % POSITIONS.length];
    const m = generateMonster(rng, { position, quality, channel, metric, age: veterans ? null : 20, yearsPro: veterans ? null : 0 });
    rows.push({ species: m.species, rarity: resolveSpecies(m).rarity, temper: m.dev.temper, apex: !!m.dev.apex, ovr: monsterOverall(m), level: m.dev.level });
  }
  const tempers = {}; for (const r of rows) tempers[r.temper] = (tempers[r.temper] || 0) + 1;
  const ovr = rows.map((r) => r.ovr).sort((a, b) => a - b); const q = (p) => ovr[Math.floor(p * (ovr.length - 1))];
  return {
    ok: true, channel, quality, n, basicShare: rows.filter((r) => r.rarity === 'basic').length / n, apex: rows.filter((r) => r.apex).length,
    apexTempers: rows.filter((r) => r.apex).map((r) => r.temper), tempers, ovr: { p10: q(0.1), p50: q(0.5), p90: q(0.9), min: ovr[0], max: ovr[ovr.length - 1] },
    meanLevel: rows.reduce((a, r) => a + r.level, 0) / n,
  };
}

function guard(f) {
  if (!t8ToolsEnabled()) return off;
  if (!f) return { ok: false, reason: 'Open a franchise first.' };
  if (f.roster.length >= ROSTER_MAX) return { ok: false, reason: `Roster full (${ROSTER_MAX}). Release someone first.` };
  return null;
}
function join(f, m, label) {
  m.salary = salaryFor(m); m.contract = newContract(f.season.year, 2); m.devGranted = true;
  (m.history ||= []).push({ club: f.club, from: f.season.year, to: null, reason: 'developer' });
  F.uniqueName?.(f, m, f.roster.map((x) => x.name));
  f.roster.push(m); f.devAssisted = true; F.dexRecord?.(f, m, 'signed');
  return { ok: true, monster: m, label };
}

/** Add a level-1 test monster to the roster: kind 'basic' | 'ordinary' | 'apex', at a position (or any). Real generator; Apex via the approved Apex generator. */
export function devAddMonster(f, { kind = 'ordinary', position = null } = {}) {
  const g = guard(f); if (g) return g;
  const rng = createRng(hashString(`t8-add|${f.seed}|${f.roster.length}|${kind}|${position}|${Date.now()}`));
  const pool = SPECIES_DEX.filter((s) => (position ? s.position === position : true) && (kind === 'basic' ? s.rarity === 'basic' : s.rarity !== 'basic' && s.rarity !== 'legendary'));
  if (!pool.length) return { ok: false, reason: `No ${kind} family at ${position}.` };
  const sp = pool[rng.int(pool.length)];
  const m = generateMonster(rng, { species: sp.id, quality: 58, age: 20, yearsPro: 0, id: `dev_${kind}_${rng.seed().toString(36)}` });
  if (kind === 'apex') { m.dev = generateIndividual(rng, m.dev.form, { apex: true }); m.age = 20; syncFromDev(m); }
  return join(f, m, kind === 'apex' ? 'Apex (ageless, all-99 ceilings, neutral Temper)' : kind === 'basic' ? 'Basic' : 'ordinary');
}

const byId = (f, id) => f?.roster.find((m) => m.id === id) || null;
/** Level up `levels` times through the real level-up (natural growth only, B6). */
export function devLevelUp(f, id, levels = 1) {
  if (!t8ToolsEnabled()) return off; const m = byId(f, id); if (!m) return { ok: false, reason: 'Not on your roster.' };
  const before = { level: m.dev.level, ovr: monsterOverall(m) }; const rng = createRng(hashString(`t8-lv|${id}|${m.dev.level}`));
  for (let i = 0; i < levels && m.dev.level < MAX_LEVEL; i++) { m.xp = 0; levelUp(m, rng, { autoSpend: false }); }
  f.devAssisted = true; return { ok: true, from: before, to: { level: m.dev.level, ovr: monsterOverall(m) } };
}
/** Raise to the next evolution level through real level-ups (does not evolve: Evolve stays manual on the monster page). */
export function devToEvolutionLevel(f, id) {
  if (!t8ToolsEnabled()) return off; const m = byId(f, id); if (!m) return { ok: false, reason: 'Not on your roster.' };
  const next = nextEvolution(m); if (!next) return { ok: false, reason: `${m.name} has no further evolution.` };
  if (evolutionReady(m)) return { ok: true, already: true, level: m.dev.level };
  return devLevelUp(f, id, next.level - m.dev.level);
}
/** Bank `n` training points (exact), as the offseason does; spend them on the monster page or let the trainer allocate. */
export function devBankPoints(f, id, n = 5) {
  if (!t8ToolsEnabled()) return off; const m = byId(f, id); if (!m) return { ok: false, reason: 'Not on your roster.' };
  addBankedPoints(m.dev, n); syncFromDev(m); f.devAssisted = true; return { ok: true, bank: m.dev.bank };
}
/** One real offseason for this monster only: age +1 (unless ageless), the approved decline, 2 banked points; the trainer does not spend them. */
export function devAgeOneSeason(f, id) {
  if (!t8ToolsEnabled()) return off; const m = byId(f, id); if (!m) return { ok: false, reason: 'Not on your roster.' };
  const before = { age: m.age, ovr: monsterOverall(m), attrs: { ...m.attributes } };
  offseason([m], createRng(hashString(`t8-age|${id}|${m.age}`)), { autoAllocate: false }); f.devAssisted = true;
  const changed = ATTRIBUTES.filter((a) => m.attributes[a] !== before.attrs[a]).map((a) => `${a} ${before.attrs[a]}→${m.attributes[a]}`);
  return { ok: true, from: before, to: { age: m.age, ovr: monsterOverall(m) }, changed };
}
/** Put a Basic recruitable target on this Tuesday's board (prospect 1), to test the Basic encounter XP bonus (N7g). */
export function devBasicProspect(f) {
  if (!t8ToolsEnabled()) return off; if (!f) return { ok: false, reason: 'Open a franchise first.' };
  const p = f.week?.prospects?.[0]; if (!p) return { ok: false, reason: 'Scout a region first (Monday), then use this on Tuesday.' };
  if (f.week.encounter && f.week.encounter.status !== 'ready') return { ok: false, reason: 'This Tuesday\'s encounter has already started.' };
  const pool = SPECIES_DEX.filter((s) => s.rarity === 'basic'); const rng = createRng(hashString(`t8-bp|${f.seed}|${f.season.year}|${f.season.week}`));
  const sp = pool[rng.int(pool.length)];
  p.monster = generateMonster(rng, { species: sp.id, quality: 50, age: 21, yearsPro: 0, id: p.monster.id }); p.monster.origin = f.week.region; p.revealed = 6;
  f.devAssisted = true; return { ok: true, monster: p.monster };
}
/** Put an UNIDENTIFIED Apex on this Tuesday's board (prospect 1): ratings shown, potential hidden, so nothing marks him as Apex (M6, spec §5). */
export function devApexProspect(f) {
  if (!t8ToolsEnabled()) return off; if (!f) return { ok: false, reason: 'Open a franchise first.' };
  const p = f.week?.prospects?.[0]; if (!p) return { ok: false, reason: 'Scout a region first (Monday), then use this on Tuesday.' };
  if (f.week.encounter && f.week.encounter.status !== 'ready') return { ok: false, reason: 'This Tuesday\'s encounter has already started.' };
  const pool = SPECIES_DEX.filter((s) => s.rarity !== 'basic' && s.rarity !== 'legendary'); const rng = createRng(hashString(`t8-ap|${f.seed}|${f.season.year}|${f.season.week}`));
  const sp = pool[rng.int(pool.length)]; const m = generateMonster(rng, { species: sp.id, quality: 50, age: 20, yearsPro: 0, id: `dev_apexp_${rng.seed().toString(36)}`, apexRoll: false });
  m.dev = generateIndividual(rng, m.dev.form, { apex: true }); m.age = 20; syncFromDev(m); m.salary = salaryFor(m); m.origin = f.week.region;
  p.monster = m; p.revealed = 6; p.potentialKnown = false; p.natureKnown = false; f.devAssisted = true; return { ok: true, monster: m };
}
/** Complete the scout's report on prospect 1 (reveals potential): for an unidentified Apex this is the discovery (M6, spec §5). */
export function devRevealProspect(f) {
  if (!t8ToolsEnabled()) return off; const p = f?.week?.prospects?.[0]; if (!p) return { ok: false, reason: 'No prospect on the board.' };
  p.revealed = 6; p.potentialKnown = true; p.natureKnown = true; f.devAssisted = true; return { ok: true, monster: p.monster };
}
/** Save check: export and re-import through the real save format; reports whether every development record came back exactly. */
export function devSaveRoundTrip(f) {
  if (!t8ToolsEnabled()) return off; if (!f) return { ok: false, reason: 'Open a franchise first.' };
  const json = exportJson(f); const back = importJson(json);
  const diffs = f.roster.filter((m) => JSON.stringify(m.dev) !== JSON.stringify(back.roster.find((x) => x.id === m.id)?.dev)).map((m) => m.name);
  const ledger = JSON.stringify(f.rewardLedger || null) === JSON.stringify(back.rewardLedger || null);
  return { ok: diffs.length === 0 && ledger, schemaVersion: back.schemaVersion, bytes: json.length, monsters: f.roster.length, diffs, ledger };
}

/** The development record of a monster, for display: Temper, Apex, level/XP, bank and the per-attribute ledger. */
export function devInspect(m) {
  const d = m?.dev; if (!d) return null; const t = temperSummary(d.temper);
  return {
    form: d.form, temper: { id: d.temper, ...t }, apex: !!d.apex, level: d.level, xp: m.xp, next: xpForLevel(d.level), bank: FR.floor(d.bank), bankExact: d.bank,
    attrs: ATTRIBUTES.map((a) => ({ a, cur: d.current[a], pot: d.potential[a], ref: d.ref[a], natural: d.natural[a], trained: d.trained[a], loss: d.loss[a], eff: temperEfficiency(d.temper, a) })),
  };
}
export const TEMPER_COUNT = Object.keys(TEMPERS).length;

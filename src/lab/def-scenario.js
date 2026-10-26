// Defensive scenarios (Defensive AI audit, v42.9), Developer Tools only: the Attribute Testing Lab's "Defensive scenario" mode.
// Pick any offensive play and any defensive call, which defenders get the attribute under test (one slot, the coverage group,
// the pass rushers, or everyone), a low and a high rating, and how the quarterback behaves (the real AI, holding the ball to test
// the rush, or throwing to one receiver at a set time to test coverage on that route). Both ratings run on the real engine with
// the same seeds; every monster is a plain 65 with no ability or type (as in the attribute trials). Plays run with the engine's
// developer trace (`options.trace`), which records each defender's decision and the point he is steering to; it exists only in
// these lab runs and changes nothing in the play (tests/def-scenario.test.js). Pure: no franchise, no save, nothing stored.
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, RESERVE_OFFENSE_IDS, RESERVE_DEFENSE_IDS, LEGENDARY_IDS, manKeyTargets, eligibleReceivers } from '../data/playbook.js';
import { play } from './attr-trials.js';

export const DEF_ATTRS = ['coverage', 'awareness', 'speed', 'agility', 'strength', 'tackling', 'catching'];
export const GROUPS = { coverage: 'Coverage defenders (CB, S, LB)', rush: 'Pass rushers (DL and blitzers)', all: 'All defenders' };
const uniq = (xs) => [...new Set(xs)].filter((k) => PLAYS[k]);
export const offensePlays = () => uniq([...OFFENSE_IDS, ...(RESERVE_OFFENSE_IDS || []), ...(LEGENDARY_IDS || []).filter((k) => PLAYS[k]?.side === 'offense')]).filter((k) => PLAYS[k].side === 'offense');
export const defensePlays = () => uniq([...DEFENSE_IDS, ...(RESERVE_DEFENSE_IDS || []), ...(LEGENDARY_IDS || []).filter((k) => PLAYS[k]?.side === 'defense')]).filter((k) => PLAYS[k].side === 'defense');
/** "Man", "Zone", "Blitz" or "Run front": how the Lab groups the calls. */
export function defenseKind(id) { const t = PLAYS[id]?.tags || []; return t.includes('blitz') ? 'Blitz' : t.includes('run') || t.includes('goalline') ? 'Run front' : t.includes('man') ? 'Man' : 'Zone'; }
/** Ready-made scenarios covering the brief's cases; the owner can change any field after choosing one. */
export const PRESETS = [
  { id: 'man_go', label: 'Man: go route vs Cover 1 (ball to WR1)', off: 'three_verticals', def: 'cover_1', subject: 'coverage', attr: 'coverage', qb: 'throw', target: 'WR1', at: 2.4 },
  { id: 'man_comeback', label: 'Man: comeback vs Cover 1 (ball to WR1)', off: 'curl_flat', def: 'cover_1', subject: 'coverage', attr: 'coverage', qb: 'throw', target: 'WR1', at: 1.9 },
  { id: 'man_drag', label: 'Man: drag across vs Cover 1 (ball to WR2)', off: 'mesh', def: 'cover_1', subject: 'coverage', attr: 'coverage', qb: 'throw', target: 'WR2', at: 1.6 },
  { id: 'man_flat', label: 'Man: back to the flat vs Cover 1 (ball to RB)', off: 'curl_flat', def: 'cover_1', subject: 'coverage', attr: 'coverage', qb: 'throw', target: 'RB', at: 1.3 },
  { id: 'zone_curl', label: 'Zone: curl vs Cover 3 (ball to WR2)', off: 'curl_flat', def: 'cover_3', subject: 'coverage', attr: 'coverage', qb: 'throw', target: 'WR2', at: 1.8 },
  { id: 'zone_post', label: 'Zone: post vs Cover 3 (ball to WR1)', off: 'deep_post', def: 'cover_3', subject: 'coverage', attr: 'coverage', qb: 'throw', target: 'WR1', at: 2.2 },
  { id: 'zone_flood', label: 'Zone: flood vs Cover 2 (real QB)', off: 'flood', def: 'cover_2_zone', subject: 'coverage', attr: 'awareness', qb: 'ai' },
  { id: 'rush_hold', label: 'Pass rush: QB holds 4 s vs Cover 3', off: 'deep_post', def: 'cover_3', subject: 'rush', attr: 'strength', qb: 'hold' },
  { id: 'blitz', label: 'Blitz: DB blitz, real QB', off: 'curl_flat', def: 'db_blitz', subject: 'rush', attr: 'speed', qb: 'ai' },
  { id: 'run_inside', label: 'Run: inside zone vs Cover 3 (recognition)', off: 'inside_zone', def: 'cover_3', subject: 'coverage', attr: 'awareness', qb: 'ai' },
  { id: 'run_outside', label: 'Run: outside zone vs Cover 3 (pursuit)', off: 'outside_zone', def: 'cover_3', subject: 'all', attr: 'speed', qb: 'ai' },
  { id: 'pa', label: 'Play-action post vs Cover 3 (the bite)', off: 'pa_post', def: 'cover_3', subject: 'coverage', attr: 'awareness', qb: 'ai' },
].filter((p) => PLAYS[p.off] && PLAYS[p.def]);

/** The defenders who get the rating: one slot, or a group of the call's defenders. */
export function subjectsOf(def, subject) {
  const p = PLAYS[def]; if (!p) return [];
  if (p.onField.includes(subject)) return [subject];
  const asg = p.assignments;
  if (subject === 'rush') return p.onField.filter((s) => ['rush', 'contain'].includes(asg[s]?.a));
  if (subject === 'all') return [...p.onField];
  return p.onField.filter((s) => ['man', 'zone', 'spy'].includes(asg[s]?.a)); // coverage
}
export const receiversOf = (off) => (PLAYS[off] ? eligibleReceivers(PLAYS[off]) : []);
const qbOptions = (sc) => sc.qb === 'hold' ? { qb: { mode: 'hold' }, maxTime: 4 } : sc.qb === 'throw' ? { qb: { mode: 'human', at: Number(sc.at) || 1.8, action: 'throw', target: sc.target } } : {};

/** One play of the scenario at one rating (the same seed gives the same play). `trace` adds the developer decision trace. */
export function runScenario(sc, value, seed, { trace = false } = {}) {
  return play({ off: sc.off, def: sc.def, defSubjects: subjectsOf(sc.def, sc.subject), attr: sc.attr, value, seed, options: { ...qbOptions(sc), ...(trace ? { trace: true } : {}) } });
}
/** The scenario's measurements from one play (null where they do not apply). */
export function measureScenario(sim) {
  const ev = (k) => sim.events.find((e) => e.kind === k); const thrown = !!ev('throw'); const run = !sim.qb && !thrown && !!sim.stats.carrier && sim.result !== 'sack';
  const pr = ev('qb_pressure');
  return {
    yardsAllowed: sim.yards, explosive: sim.yards >= (run ? 10 : 20),
    completeAllowed: thrown ? !!sim.stats.receiver : null, arriveSep: thrown ? sim.stats.arriveSep ?? null : null, int: thrown ? !!sim.stats.interceptor : null,
    sack: sim.result === 'sack', pressureAt: pr ? pr.t : null,
    runYards: run ? sim.yards : null, brokenAllowed: sim.events.filter((e) => e.kind === 'broken_tackle').length,
  };
}
export const SCENARIO_METRIC = Object.freeze({
  yardsAllowed: ['Yards allowed', 'yd'], explosive: ['Explosive plays (20+ pass, 10+ run)', '%'], completeAllowed: ['Completion allowed (when thrown)', '%'], arriveSep: ['Separation when the ball arrives', 'yd'],
  int: ['Interceptions (when thrown)', '%'], sack: ['Sacks', '%'], pressureAt: ['Time to pressure', 's'], runYards: ['Yards per carry (runs)', 'yd'], brokenAllowed: ['Broken tackles allowed per play', ''],
});
/** Aggregate measurement rows: rates for yes/no measures, means for numbers, null when nothing applied. */
export function aggregate(rows) {
  const out = {};
  for (const k of Object.keys(SCENARIO_METRIC)) { const xs = rows.map((r) => r[k]).filter((x) => x != null); out[k] = !xs.length ? null : typeof xs[0] === 'boolean' ? xs.filter(Boolean).length / xs.length : xs.reduce((a, b) => a + b, 0) / xs.length; }
  return out;
}
/** Each defender's assignment as the overlay shows it: { slot: { kind, label, at?, man? } }. */
export function assignmentsOf(sc) {
  const p = PLAYS[sc.def]; const keys = PLAYS[sc.off] ? manKeyTargets(PLAYS[sc.off]) : {}; const out = {};
  for (const s of p.onField) {
    const a = p.assignments[s] || {};
    if (a.a === 'man') out[s] = { kind: 'man', man: keys[a.key] || null, label: `man ${keys[a.key] || '(nobody)'}` };
    else if (a.a === 'zone') out[s] = { kind: 'zone', at: a.at, role: a.role, label: `${a.role} zone` };
    else out[s] = { kind: a.a || 'none', label: a.a === 'rush' ? 'rush' : a.a || '—' };
  }
  return out;
}

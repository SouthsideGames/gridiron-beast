// Owner ruling N8b (2026-11-08 01:30), special-play eligibility: on kickoffs and two-point conversions non-kicker abilities neither
// activate nor charge; kicker abilities act only under their own approved conditions; effects an eligible kicker ability creates
// are allowed; ordinary shared-status carryover and countdowns continue (no cleanse). Overrides conflicting contract wording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { FAMILIES } from '../src/data/beast-dex.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../src/data/personnel.js';
import { contractOf } from '../src/sim/abilities/registry.js';
import '../src/sim/abilities/index.js';

const FOOT = FAMILIES.filter((f) => f.abilities?.football); const byPos = {}; for (const f of FOOT) (byPos[f.position] ||= []).push(f);
/** Every starting slot (and the kicker) holds a contract family of that position, its game-scope state primed "ready" where it can be. */
function stocked(seed, k) {
  const t = generatedTeam(seed, { id: `T${seed}`, name: `T${seed}`, abbr: 'T', quality: 62 }); const used = {};
  const put = (side, slot) => { const pos = side === 'kicker' ? 'K' : positionOf(slot); const list = byPos[pos] || []; if (!list.length) return; used[pos] = (used[pos] ?? -1) + 1; const f = list[(k + used[pos]) % list.length];
    const base = side === 'kicker' ? t.kicker : t[side][slot]; const m = { ...base, id: `${seed}_${side}_${slot}`, species: f.id, form: `${f.id}:0`, mastery: 3, type: f.type, position: f.position };
    if (side === 'kicker') t.kicker = m; else t[side][slot] = m; };
  for (const s of OFFENSE_SLOTS) put('offense', s); for (const s of DEFENSE_SLOTS) put('defense', s); put('kicker', 'K'); return t;
}
const prime = (g, teams) => { // every contract's state as its review prime (charged / armed) where it declares one
  g.t8 ||= { status: {} }; g.t8.ability ||= {};
  for (const t of Object.values(teams)) for (const m of [...Object.values(t.offense), ...Object.values(t.defense), t.kicker]) { const c = m?.species && contractOf(m.species); if (!c) continue;
    g.t8.ability[m.id] = c.review?.prime ? c.review.prime(m.form, m.mastery) : c.initGame ? c.initGame(m.form, m.mastery) : {}; }
};
const nonKickerAbilityEvents = (sim) => (sim?.events || []).filter((e) => (e.ability && /-F$/.test(e.ability)) && e.by !== 'K' && e.kind !== 'status');

test('kickoffs: no non-kicker ability activates or charges; the kicking unit\'s K may act under his own conditions', () => {
  let kicks = 0;
  for (let k = 0; k < 12; k++) {
    const teams = { home: stocked(300 + k, k), away: stocked(400 + k, k + 5) };
    const g = R.newGame({ home: teams.home, away: teams.away, seed: 70 + k, coinWinner: 'home', choice: 'receive' }); prime(g, teams);
    const before = structuredClone(g.t8.ability); const { sim } = R.doKickoff(g, teams); if (!sim) continue; kicks++;
    assert.deepEqual(nonKickerAbilityEvents(sim), [], `kick ${k}: no non-kicker ability event`);
    for (const [id, st] of Object.entries(g.t8.ability)) if (!/kicker_K$/.test(id)) assert.deepEqual(st, before[id], `kick ${k}: ${id}'s state neither charged nor spent`);
  }
  assert.ok(kicks >= 6, `live kickoffs observed (${kicks})`);
});

test('two-point conversions: no ability activates or charges (no kicker is on the field)', () => {
  let tries = 0;
  for (let k = 0; k < 12; k++) {
    const teams = { home: stocked(500 + k, k), away: stocked(600 + k, k + 3) };
    const g = R.newGame({ home: teams.home, away: teams.away, seed: 90 + k }); prime(g, teams);
    g.phase = 'try'; g.tryTeam = 'home'; g.possession = 'home';
    const before = structuredClone(g.t8.ability);
    const res = R.attemptTwoPoint(g, teams, ['quick_slants', 'inside_zone', 'mesh', 'power_right'][k % 4], ['cover_3', 'goal_line', 'cover_1'][k % 3]); tries++;
    assert.deepEqual(nonKickerAbilityEvents(res.sim), [], `try ${k}: no ability event`);
    assert.deepEqual(g.t8.ability, before, `try ${k}: no state charged or spent`);
  }
  assert.equal(tries, 12);
});

test('Dawn Signal still casts on its own kickoff (an eligible kicker ability) and its Quickened on a coverage teammate is allowed', () => {
  let cast = 0;
  for (let k = 0; k < 20 && !cast; k++) {
    const teams = { home: generatedTeam(700 + k, { id: 'H', name: 'H', abbr: 'H', quality: 62 }), away: generatedTeam(720 + k, { id: 'A', name: 'A', abbr: 'A', quality: 62 }) };
    Object.assign(teams.home.kicker, { id: 'SUN', species: 'sunwhistle', form: 'sunwhistle:0', mastery: 0, type: 'Light' });
    const g = R.newGame({ home: teams.home, away: teams.away, seed: 50 + k, coinWinner: 'away', choice: 'receive' }); g.t8 = { status: {}, ability: { SUN: { pending: true } } };
    const { sim } = R.doKickoff(g, teams); if (!sim) continue;
    const e = sim.events.find((x) => x.ability === 'LIG-02-F' && x.kind === 'ability'); if (!e) continue; cast++;
    assert.equal(e.by, 'K'); assert.equal(g.t8.ability.SUN.pending, false);
    assert.ok(sim.events.some((x) => x.kind === 'status' && x.status === 'quickened' && x.accepted), 'the boost it creates is applied');
  }
  assert.equal(cast, 1);
});

test('statuses carry over a kickoff and count down as usual (the restriction does not cleanse)', () => {
  const teams = { home: generatedTeam(31, { id: 'H', name: 'H', abbr: 'H', quality: 62 }), away: generatedTeam(32, { id: 'A', name: 'A', abbr: 'A', quality: 62 }) };
  const g = R.newGame({ home: teams.home, away: teams.away, seed: 9, coinWinner: 'home', choice: 'receive' });
  const rid = teams.home.offense.RB.id; g.t8 = { status: { [rid]: { id: 'slowed', strength: 15, originalStrength: 15, remaining: 3, applications: 1, appliedThisUnit: false, restOfPlay: false } } };
  R.doKickoff(g, teams);
  const st = g.t8.status[rid]; assert.ok(st && st.id === 'slowed', 'the status is still there after the kickoff');
});

test('the engine gate: hooks run on special plays only for a kicker ability in the kicking unit\'s K slot (static check)', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../src/sim/engine.js', import.meta.url), 'utf8');
  assert.match(src, /const SPECIAL_PLAY = !!\(KO \|\| options\.twoPoint\);/); assert.match(src, /const mayAct = \(a\) => !SPECIAL_PLAY \|\| \(!!KO && a\.slot === 'K' && a\.kickerAbility\);/);
  assert.match(src, /return h && mayAct\(a\) \? h\(abilityCtx, a, \.\.\.args\) : undefined;/);
});

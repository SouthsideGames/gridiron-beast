// Task 8 M3 Nature / Electric batch: the twelve football ability contracts on the real engine (simulatePlay) and the real game rules
// (rules.js runScrimmagePlay, for the pre-snap step and field creation). Synthetic lineups: tests/tools/lineup.js with species / form /
// mastery / type / id on the slot inputs. Probabilities (B12): sample sizes and tolerances are fixed in each test before running.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import * as R from '../src/sim/rules.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';
import { contractOf, hasContract } from '../src/sim/abilities/registry.js';
import { FAMILIES } from '../src/data/beast-dex.js';
import { cutAngle } from '../src/sim/abilities/nature-electric-common.js';
import '../src/sim/abilities/index.js';

const FAM = { thornkit: 'NAT-01-F', mossclaw: 'NAT-02-F', rootram: 'NAT-03-F', leafhorn: 'NAT-04-F', thornback: 'NAT-05-F', elderoot: 'NAT-06-F', flicker: 'ELE-01-F', voltfin: 'ELE-02-F', voltfang: 'ELE-03-F', stormlynx: 'ELE-04-F', joltrex: 'ELE-05-F', stormcrown: 'ELE-06-F' };
const open = (p) => !p.legendary && !p.reserve;
const PASS = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.type === 'pass' && open(p)).map((p) => p.id);
const RUN = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.type === 'run' && open(p)).map((p) => p.id);
const DEF = Object.values(PLAYS).filter((p) => p.side === 'defense' && open(p)).map((p) => p.id);
const BUNCH = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.type === 'pass' && /^bunch_|^whip_|^y_pivot|^corner_arrow/.test(p.id)).map((p) => p.id);
const ab = (r, id) => r.events.filter((e) => e.kind === 'ability' && e.ability === id);

/** One play with one monster of the batch on `slot`. */
function play(fam, side, slot, seed, { type, form, mastery = 0, off, def, t8 = { status: {} }, toGo = 10, twoPoint = false, kickoff, mutate, fields } = {}) {
  const L = lineup(11, 60), D = lineup(12, 64);
  const tgt = side === 'off' ? L.offense : D.defense;
  tgt[slot] = { ...tgt[slot], id: 'X', species: fam, form: form || `${fam}:0`, mastery, type: type || FAMILIES.find((f) => f.id === fam).type, name: fam };
  mutate?.(L, D);
  const op = PLAYS[off || PASS[seed % PASS.length]], dp = typeof def === 'object' ? def : PLAYS[def || DEF[seed % DEF.length]];
  if (!(side === 'off' ? op : dp).onField.includes(slot)) return null;
  return simulatePlay({ offensePlay: op, defensePlay: dp, offense: L.offense, defense: D.defense, ballOn: 30, seed, options: { t8, toGo, twoPoint, ...(kickoff ? { kickoff } : {}), ...(fields ? { fields } : {}) } });
}
/** A real game in its first scrimmage series; `setup(teams, side)` places the batch monsters. */
function game(seed, setup) {
  const mk = (name, s) => { const x = lineup(s, 60); for (const sd of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[sd])) { p.id = `${name}_${slot}`; p.type = 'Fire'; } return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking: 70 }, name: 'K', id: `${name}_K` } }; };
  const teams = { home: mk('H', 11), away: mk('A', 12) };
  const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 900, coinWinner: 'home', choice: 'receive' }); R.doKickoff(g, teams);
  const side = g.possession, other = side === 'home' ? 'away' : 'home';
  setup?.(teams, side, other); return { g, teams, side, other };
}
const fieldsOf = (g, ability) => (g.t8.fields?.list || []).filter((f) => f.ability === ability);

// ------------------------------------------------------------------ gate
test('Nature / Electric batch: every family registered once with its Dex football id; the legacy effect never also runs', () => {
  for (const [fam, id] of Object.entries(FAM)) {
    const f = FAMILIES.find((x) => x.id === fam); assert.equal(f.abilities.football, id); assert.ok(hasContract(fam)); assert.equal(contractOf(fam).abilityId, id);
  }
  // Static Field's legacy 10% catching restriction (staticField key) and Ancient Grove (grove key) are never reached: no legacy events
  for (let seed = 1; seed <= 12; seed++) for (const [fam, slot] of [['stormlynx', 'FS'], ['elderoot', 'LB1'], ['rootram', 'LG']]) {
    const r = play(fam, fam === 'rootram' ? 'off' : 'def', slot, seed); if (!r) continue;
    assert.ok(!r.events.some((e) => e.kind === 'ability' && !e.ability && e.by === slot && e.side === (fam === 'rootram' ? 'off' : 'def')), `${fam} legacy effect fired`);
  }
});

// ------------------------------------------------------------------ Nature
test('Bloom Break: a designated cut of 45 degrees or more on a pass route earns one activation while ready; never on runs, two-point tries, while cooling down or pending', () => {
  let earned = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0, token: false, fresh: false } } };
    const r = play('thornkit', 'off', 'WR1', seed, { t8 }); if (!r) continue;
    const ev = ab(r, 'NAT-01-F'); assert.ok(ev.length <= 1);
    const pts = PLAYS[r.offensePlay].assignments.WR1.points; const sharp = pts.some((_, k) => k >= 1 && k <= pts.length - 2 && cutAngle(pts, k) >= 45);
    if (ev.length) { earned++; assert.ok(sharp, `${r.offensePlay}: earned without a 45-degree drawn cut`); assert.equal(t8.ability.X.token, true); assert.equal(t8.mastery.X.executions, 1); }
    else assert.equal(t8.ability.X.token, false);
  }
  assert.ok(earned >= 5, `earned ${earned}`);
  for (let seed = 1; seed <= 20; seed++) {
    for (const [opts, why] of [[{ off: RUN[seed % RUN.length] }, 'run'], [{ twoPoint: true }, 'two-point'], [{ t8: { status: {}, ability: { X: { cd: 2 } } } }, 'cooldown'], [{ t8: { status: {}, ability: { X: { cd: 0, token: true } } } }, 'pending']]) {
      const t8 = opts.t8 || { status: {}, ability: { X: { cd: 0 } } };
      const r = play('thornkit', 'off', 'WR1', seed, { ...opts, t8 }); if (!r) continue;
      assert.equal(ab(r, 'NAT-01-F').length, 0, `${why}: no activation`);
    }
  }
});

test('Bloom Break spawn: two recorded non-overlapping 6x4 Nature patches inside the 0-12 yard band, form strength, one play including the spawn; cooldown from spawn', () => {
  const TURN = { 'thornkit:0': 15, 'thornkit:1': 20, 'thornkit:2': 25 };
  for (const [form, mastery] of [['thornkit:0', 0], ['thornkit:1', 2], ['thornkit:2', 3]]) {
    const { g, teams, side } = game(3, (T, s) => Object.assign(T[s].offense.WR1, { species: 'thornkit', form, mastery, type: 'Nature' }));
    const id = teams[side].offense.WR1.id; g.t8 = { status: {}, ability: { [id]: { cd: 0, token: true, fresh: false } } };
    const { sim } = R.runScrimmagePlay(g, teams, 'slant_flat', DEFENSE_IDS[0]);
    const made = sim.fields.filter((f) => f.ability === 'NAT-01-F'); assert.equal(made.length, 2);
    for (const f of made) { assert.equal(f.strength, TURN[form]); assert.equal(f.type, 'Nature'); assert.ok(Math.abs(f.lat[1] - f.lat[0] - 6) < 1e-6); assert.ok(Math.abs(f.yard[1] - f.yard[0] - 4) < 1e-6); assert.ok(f.yard[0] >= -1e-6 && f.yard[1] <= 12 + 1e-6, `band ${f.yard}`); }
    const [a, b] = made; assert.ok(!(a.yard[0] < b.yard[1] && b.yard[0] < a.yard[1] && a.lat[0] < b.lat[1] && b.lat[0] < a.lat[1]), 'no overlap');
    assert.equal(fieldsOf(g, 'NAT-01-F').length, 0, 'one completed play including the spawn');
    const st = g.t8.ability[id]; assert.equal(st.token, false); assert.equal(st.cd, [5, 4, 3, 2][mastery], 'cooldown starts on spawn'); assert.equal(st.fresh, false);
  }
  // cooldown units: subsequent offensive plays he takes part in
  const t8 = { status: {}, ability: { X: { cd: 3, fresh: false } } }; play('thornkit', 'off', 'WR1', 4, { t8 }); assert.equal(t8.ability.X.cd, 2);
  play('thornkit', 'off', 'WR1', 5, { t8, twoPoint: true }); assert.equal(t8.ability.X.cd, 2, 'a two-point try is not a cooldown unit');
});

test('Vine Vault: first engagement of a pass rusher while ready; one contest (rate within 0.10 of the stated chance over the frozen sample); success lands past the blocker; failure stays engaged; both spend the cooldown', () => {
  let n = 0, wins = 0, pSum = 0;
  for (let seed = 1; seed <= 160; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('mossclaw', 'def', 'DL1', seed, { t8, mastery: seed % 4 }); if (!r) continue;
    const ev = ab(r, 'NAT-02-F'); assert.ok(ev.length <= 1, 'one attempt a play');
    if (!ev.length) { assert.equal(t8.ability.X.cd, 0, 'no attempt: readiness kept'); continue; }
    assert.equal(PLAYS[r.offensePlay].type, 'pass'); assert.equal(t8.ability.X.cd, [5, 4, 3, 2][seed % 4]);
    n++; pSum += ev[0].chance; if (ev[0].success) { wins++; assert.ok(ev[0].x < ev[0].blockerX, 'lands beyond the blocker toward the backfield'); assert.ok(r.events.some((e) => e.kind === 'vault_land' || e.kind === 'ability_end')); }
  }
  assert.ok(n >= 40, `attempts ${n}`); // frozen: seeds 1..160, tolerance 0.10
  assert.ok(Math.abs(wins / n - pSum / n) <= 0.10, `success ${wins}/${n} vs mean chance ${(pSum / n).toFixed(3)}`);
  for (let seed = 1; seed <= 20; seed++) {
    const r = play('mossclaw', 'def', 'DL1', seed, { off: RUN[seed % RUN.length], t8: { status: {}, ability: { X: { cd: 0 } } } }); if (r) assert.equal(ab(r, 'NAT-02-F').length, 0, 'not run defense');
    const r2 = play('mossclaw', 'def', 'DL1', seed, { t8: { status: {}, ability: { X: { cd: 1 } } } }); if (r2) assert.equal(ab(r2, 'NAT-02-F').length, 0, 'not while cooling down');
  }
});

test('Vine Vault exception: no clear legal landing beyond the blocker means no attempt and no readiness spent', () => {
  const vv = contractOf('mossclaw'); const st = { cd: 0, fresh: false };
  const self = { team: 'def', slot: 'DL1', name: 'M', mastery: 0, x: 1, y: 0, attrs: { agility: 60 }, assignment: { a: 'rush' }, stun: 0, noEngage: 0 };
  const blocker = { team: 'off', slot: 'LG', name: 'B', x: 0, y: 0, attrs: { blocking: 60 } }; self.engaged = blocker; blocker.engaged = self;
  const crowd = []; for (let x = -3; x <= 0.5; x += 0.5) for (let y = -3; y <= 3; y += 0.5) if (Math.hypot(x, y) > 0.3 && Math.hypot(x - 1, y) > 0.3) crowd.push({ x, y });
  const ctx = { kickoff: false, twoPoint: false, offensePlay: { type: 'pass' }, t: 0.5, bounds: { left: -26, right: 26, ownEndLine: -40, endLine: 80 }, actors: [self, blocker, ...crowd], state: () => st, statusOf: () => null, canStartSignature: () => true, log: () => {}, executed: () => { throw new Error('no execution'); }, rng: { chance: () => true }, scale: () => 1 };
  vv.hooks.playStart(ctx, self); vv.hooks.engage(ctx, self, blocker); vv.hooks.tick(ctx, self);
  assert.equal(st.cd, 0); assert.equal(self.engaged, blocker, 'still engaged');
});

test('Deep Roots: rooted from his first engagement while ready (no translation to the whistle), the first ordinary shed against him prevented once; cooldown from activation', () => {
  let rooted = 0, prevented = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('rootram', 'off', 'LG', seed, { t8, mastery: 1, off: seed % 2 ? RUN[seed % RUN.length] : PASS[seed % PASS.length] }); if (!r) continue;
    const ev = ab(r, 'NAT-03-F'); if (!ev.length) { assert.equal(t8.ability.X.cd, 0); continue; }
    rooted++; assert.equal(t8.ability.X.cd, 4);
    const after = r.frames.filter((f) => f.t > ev[0].t + 0.05).map((f) => f.off.find((p) => p[0] === 'LG'));
    for (const p of after) assert.ok(Math.abs(p[1] - ev[0].x) < 0.011 && Math.abs(p[2] - ev[0].y) < 0.011, `seed ${seed}: moved to ${p[1]},${p[2]}`);
    const pr = r.events.filter((e) => e.kind === 'shed_prevented'); assert.ok(pr.length <= 1, 'only the first ordinary shed'); prevented += pr.length;
    const sheds = r.events.filter((e) => e.kind === 'shed' && e.blocker === 'LG' && e.side === 'def');
    if (sheds.length) assert.ok(pr.length === 1 && pr[0].t <= sheds[0].t, 'an ordinary shed against him comes only after the prevented one');
  }
  assert.ok(rooted >= 20 && prevented >= 5, `rooted ${rooted}, prevented ${prevented}`);
  for (let seed = 1; seed <= 10; seed++) { const t8 = { status: {}, ability: { X: { cd: 2 } } }; const r = play('rootram', 'off', 'LG', seed, { t8 }); if (r) { assert.equal(ab(r, 'NAT-03-F').length, 0); assert.equal(t8.ability.X.cd, 1); } }
});

test('Deep Roots vs Vine Vault: a vault can pass a rooted blocker and does not consume the first-ordinary-shed protection', () => {
  let vaults = 0;
  for (let seed = 1; seed <= 120 && vaults < 3; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 }, M: { cd: 0 } } };
    const r = play('rootram', 'off', 'LG', seed, { t8, mutate: (L, D) => { D.defense.DL1 = { ...D.defense.DL1, id: 'M', species: 'mossclaw', form: 'mossclaw:1', mastery: 0, type: 'Nature', name: 'moss', attrs: { ...D.defense.DL1.attrs, agility: 99 } }; } });
    if (!r) continue;
    const root = ab(r, 'NAT-03-F')[0], vault = r.events.find((e) => e.ability === 'NAT-02-F' && e.success && e.victim === 'LG');
    if (!root || !vault || vault.t < root.t) continue;
    vaults++; assert.ok(!r.events.some((e) => e.kind === 'shed_prevented' && e.t <= vault.t + 1e-9), 'the vault is not an ordinary shed');
  }
  assert.ok(vaults >= 1, `vaults over a rooted blocker: ${vaults}`);
});

test('Surefoot Canopy: before each defensive scrimmage snap one other non-Florant defender is chosen and recorded (no reroll); every Stumbled on him is refused that play; others are unprotected', () => {
  const { g, teams, other } = game(5, (T, s, o) => Object.assign(T[o].defense.FS, { species: 'leafhorn', form: 'leafhorn:0', type: 'Nature' }));
  const fl = teams[other].defense.FS; R.runScrimmagePlay(g, teams, OFFENSE_IDS[0], 'cover_3');
  const pick = g.t8.ability[fl.id].pick; assert.ok(pick && pick.mid && pick.mid !== fl.id); assert.ok(Object.values(teams[other].defense).some((p) => p.id === pick.mid));
  const c = contractOf('leafhorn'); const before = { ...pick };
  c.hooks.preSnap({ state: () => g.t8.ability[fl.id], playIndex: pick.play, defensePlay: PLAYS.cover_3, slots: { def: teams[other].defense }, rng: { int: () => 0 } }, { team: 'def', mid: fl.id });
  assert.deepEqual(g.t8.ability[fl.id].pick, before, 'recorded: the same play cannot reroll');
  // the protection on the real engine: a Water field everywhere at 100% slip (man coverage: the corners plant on breaks); the
  // protected defender never accepts Stumbled, every attempt refused; the other defenders slip
  const water = [{ id: 'W', type: 'Water', createdAt: 0, strength: 100, owner: 'zz', ability: 'TEST', yard: [-20, 60], lat: [-30, 30] }];
  let blocked = 0, others = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const t8 = { status: {}, ability: { X: { pick: { play: 0, mid: 'P' } } } };
    const r = play('leafhorn', 'def', 'FS', seed, { t8, fields: water, def: seed % 2 ? 'cover_1' : 'cover_2_man', mutate: (L, D) => { D.defense.CB1 = { ...D.defense.CB1, id: 'P', type: 'Fire' }; } }); if (!r) continue;
    assert.ok(ab(r, 'NAT-04-F').length === 1 && ab(r, 'NAT-04-F')[0].target === 'CB1');
    assert.ok(!r.events.some((e) => e.kind === 'field_slip' && e.by === 'CB1' && e.side === 'def'), 'protected');
    blocked += r.events.filter((e) => e.kind === 'field_status_blocked' && e.by === 'CB1' && e.side === 'def').length;
    others += r.events.filter((e) => e.kind === 'field_slip' && e.side === 'def').length;
  }
  assert.ok(blocked >= 1 && others >= 1, `blocked ${blocked}, others slipped ${others}`);
});

test('Bramble Trap: a broken tackle after his own reception while ready earns one activation (never on a rushing carry); spawn centred on a non-Nature defender, 8x6, mastery strength; all-Nature defense keeps it pending; cooldown 3', () => {
  let earned = 0;
  for (let seed = 1; seed <= 200 && earned < 4; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('thornback', 'off', 'TE', seed, { t8, mutate: (L) => { L.offense.TE.attrs = { ...L.offense.TE.attrs, strength: 99, agility: 95 }; } }); if (!r) continue;
    const ev = ab(r, 'NAT-05-F'); const broke = r.events.some((e) => e.kind === 'broken_tackle' && e.by === 'TE' && e.side === 'off');
    if (ev.length) { earned++; assert.equal(r.stats.receiver, 'TE'); assert.ok(broke); assert.equal(t8.ability.X.token, true); }
    else if (r.stats.receiver === 'TE' && broke) assert.fail('a broken tackle after his reception must earn');
  }
  assert.ok(earned >= 1, `earned ${earned}`);
  for (let seed = 1; seed <= 20; seed++) { const t8 = { status: {}, ability: { X: { cd: 0 } } }; const r = play('thornback', 'off', 'TE', seed, { t8, off: RUN[seed % RUN.length] }); if (r && !r.stats.receiver) assert.equal(t8.ability.X.token ?? false, false, 'no rushing carries'); }
  for (const mastery of [0, 3]) {
    const { g, teams, side, other } = game(7, (T, s) => Object.assign(T[s].offense.TE, { species: 'thornback', form: 'thornback:0', mastery, type: 'Nature' }));
    const id = teams[side].offense.TE.id; g.t8 = { status: {}, ability: { [id]: { cd: 0, token: true } } };
    const { sim } = R.runScrimmagePlay(g, teams, 'slant_flat', 'cover_3');
    const f = sim.fields.find((x) => x.ability === 'NAT-05-F'); assert.ok(f, 'spawned');
    assert.equal(f.strength, [25, 30, 35, 40][mastery]); assert.ok(Math.abs(f.lat[1] - f.lat[0] - 8) < 1e-6 && Math.abs(f.yard[1] - f.yard[0] - 6) < 1e-6);
    const centres = PLAYS.cover_3.onField.map((s) => PLAYS.cover_3.align[s]); assert.ok(centres.some(([x, y]) => Math.abs((f.yard[0] + f.yard[1]) / 2 - x) < 1e-6 && Math.abs((f.lat[0] + f.lat[1]) / 2 - y) < 1e-6), 'centred on a defender\'s initial position');
    assert.equal(g.t8.ability[id].cd, 3); assert.equal(g.t8.ability[id].token, false); void other;
  }
  const { g, teams, side, other } = game(8, (T, s, o) => { Object.assign(T[s].offense.TE, { species: 'thornback', form: 'thornback:0', type: 'Nature' }); for (const p of Object.values(T[o].defense)) p.type = 'Nature'; });
  const id = teams[side].offense.TE.id; g.t8 = { status: {}, ability: { [id]: { cd: 0, token: true } } };
  const { sim } = R.runScrimmagePlay(g, teams, 'slant_flat', 'cover_3'); void other;
  assert.ok(!(sim.fields || []).some((x) => x.ability === 'NAT-05-F')); assert.equal(g.t8.ability[id].token, true, 'held pending');
});

test('Grove Guardian: a clone at every ready defensive scrimmage snap beside Elderoot, ratings 60-75% by mastery, statistics credited to Elderoot, gone at the whistle; cooldown 5', () => {
  let seen = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const mastery = seed % 4; const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('elderoot', 'def', 'LB1', seed, { t8, mastery, off: seed % 2 ? RUN[seed % RUN.length] : undefined }); if (!r) continue;
    const ev = ab(r, 'NAT-06-F'); assert.equal(ev.length, 1); seen++;
    const L = lineup(12, 64).defense.LB1.attrs; for (const k of ['speed', 'tackling', 'coverage']) assert.equal(ev[0].ratings[k], Math.max(1, Math.round(L[k] * [0.6, 0.65, 0.7, 0.75][mastery])));
    assert.ok(r.frames[0].def.some((p) => p[0] === 'LB1+'), 'the clone is on the field');
    const lb = r.frames[0].def.find((p) => p[0] === 'LB1'), cl = r.frames[0].def.find((p) => p[0] === 'LB1+'); assert.ok(Math.hypot(lb[1] - cl[1], lb[2] - cl[2]) <= 3.2 && cl[1] >= 0.5);
    assert.ok(!('LB1+' in r.names.def), 'no roster slot');
    for (const v of Object.values(r.stats)) assert.notEqual(v, 'LB1+', 'credited to Elderoot');
    assert.ok(!r.events.some((e) => e.by === 'LB1+' || e.victim === 'LB1+'));
    assert.ok(!Object.keys(t8.status).some((k) => k.includes('~grove')), 'clone statuses cleared');
    assert.equal(t8.ability.X.cd, 5);
  }
  assert.ok(seen >= 20);
  for (const [opts, why] of [[{ twoPoint: true }, 'two-point'], [{ t8: { status: {}, ability: { X: { cd: 1 } } } }, 'cooldown']]) {
    const r = play('elderoot', 'def', 'LB1', 3, { t8: opts.t8 || { status: {}, ability: { X: { cd: 0 } } }, ...opts }); assert.equal(ab(r, 'NAT-06-F').length, 0, why);
  }
});

test('Grove Guardian exception: a clone possession ends the play at once (no return), credited to Elderoot', () => {
  let ended = 0;
  for (const [seed, def, off] of [[91, 'cover_2_man', 'bubble_screen'], [355, 'cover_2_man', 'bubble_screen']]) {
    const L = lineup(11, 60), D = lineup(12, 64);
    D.defense.LB1 = { ...D.defense.LB1, id: 'X', species: 'elderoot', form: 'elderoot:0', mastery: 3, type: 'Nature', attrs: { ...D.defense.LB1.attrs, catching: 99, coverage: 99, awareness: 99, speed: 99, agility: 99 } };
    const r = simulatePlay({ offensePlay: PLAYS[off], defensePlay: PLAYS[def], offense: L.offense, defense: D.defense, ballOn: 30, seed, options: { t8: { status: {}, ability: { X: { cd: 0 } } } } });
    const tp = r.events.find((e) => e.kind === 'temp_possession'); if (!tp) continue;
    ended++; const pick = r.events.find((e) => e.kind === 'interception');
    assert.equal(r.result, 'interception'); assert.equal(r.stats.interceptor, 'LB1', 'credited to Elderoot'); assert.equal(pick.by, 'LB1');
    assert.ok(Math.abs(r.elapsed - tp.t) < 0.051, 'the play ends at the possession'); assert.ok(!r.events.some((e) => e.t > tp.t && ['tackle', 'juke', 'broken_tackle'].includes(e.kind)), 'no return');
  }
  assert.ok(ended >= 1, 'a clone interception observed');
});

// ------------------------------------------------------------------ Electric
test('Crossed Wires: at a ready route snap with an allied WR/TE route runner within 5 yards, the remaining routes are exchanged; collected defenders roll Confused (rate within 0.10 over the frozen sample); spent only on an exchange', () => {
  // a zone call with three defenders walked up over the bunch side, so defenders are inside the three yards at the snap
  const tight = { ...PLAYS.cover_3, id: 'cover_3_tight', align: { ...PLAYS.cover_3.align, LB1: [1.2, 3.6], CB2: [1.2, 6.2], SS: [1.4, 8.6] } };
  let ex = 0, rolls = 0, hits = 0, expect = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const form = seed % 2 ? 'flicker:0' : 'flicker:1'; const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('flicker', 'off', 'WR1', seed, { t8, form, off: BUNCH[seed % BUNCH.length], def: tight }); if (!r) continue;
    const ev = ab(r, 'ELE-01-F'); if (!ev.length) { assert.equal(t8.ability.X.cd, 0); continue; }
    ex++; const e = ev[0]; const op = PLAYS[r.offensePlay];
    assert.deepEqual(e.routes.WR1.slice(1), op.assignments[e.partner].points.slice(1), 'his new path is the partner\'s remaining route');
    assert.deepEqual(e.routes[e.partner].slice(1), op.assignments.WR1.points.slice(1));
    assert.equal(t8.ability.X.cd, 5);
    const conf = r.events.filter((x) => x.kind === 'status' && x.status === 'confused' && x.by === 'WR1');
    for (const c of conf) assert.ok(e.collected.includes(c.victim));
    rolls += e.collected.length; hits += conf.length; expect += e.collected.length * (form === 'flicker:0' ? 0.35 : 0.45); // all accepted (empty slots at the snap)
  }
  assert.ok(ex >= 10, `exchanges ${ex}`);
  // frozen: seeds 1..80 alternating forms (Zippit 35%, Zaptera 45%), tolerance 0.10 on the rate, at least 60 rolls
  assert.ok(rolls >= 60, `rolls ${rolls}`); assert.ok(Math.abs(hits / rolls - expect / rolls) <= 0.10, `confused ${hits}/${rolls}, expected ${(expect / rolls).toFixed(3)}`);
  for (let seed = 1; seed <= 10; seed++) { const t8 = { status: {}, ability: { X: { cd: 0 } } }; const r = play('flicker', 'off', 'WR1', seed, { t8, off: 'slant_flat' }); assert.equal(ab(r, 'ELE-01-F').length, 0, 'no partner within 5 yards'); assert.equal(t8.ability.X.cd, 0); }
  // Confused: -20% Awareness for the play and one subsequent participating play
  const t8 = { status: {} }; for (let seed = 1; seed <= 40; seed++) { t8.ability = { X: { cd: 0 } }; t8.status = {}; play('flicker', 'off', 'WR1', seed, { t8, off: BUNCH[0], def: tight }); if (Object.values(t8.status).some((s) => s.id === 'confused')) break; }
  const s = Object.values(t8.status).find((x) => x.id === 'confused'); assert.ok(s, 'a Confused was applied'); assert.equal(s.strength, 20); assert.equal(s.remaining, 1);
});

test('Charge Strip: a rushing first down while ready earns one token (not a reception, a touchdown, a two-point try, or the spawn play); spawn LOS to 5 yards, 8 wide on his alignment, 20/30% by form; cooldown from spawn', () => {
  let earned = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('voltfin', 'off', 'RB', seed, { t8, off: RUN[seed % RUN.length], toGo: 2 }); if (!r) continue;
    const qual = r.stats.carrier === 'RB' && !r.stats.receiver && r.yards >= 2 && !['touchdown', 'fumble', 'interception'].includes(r.result);
    assert.equal(!!t8.ability.X.token, qual, `seed ${seed}: ${r.result} ${r.yards}`); if (qual) earned++;
  }
  assert.ok(earned >= 5);
  for (let seed = 1; seed <= 10; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 } } }; play('voltfin', 'off', 'RB', seed, { t8, off: RUN[seed % RUN.length], toGo: 1, twoPoint: true }); assert.ok(!t8.ability.X.token, 'two-point');
    const t8b = { status: {}, ability: { X: { cd: 0, fresh: true } } }; play('voltfin', 'off', 'RB', seed, { t8: t8b, off: RUN[seed % RUN.length], toGo: 1 }); assert.ok(!t8b.ability.X.token, 'spawn play');
  }
  for (const [form, mastery] of [['voltfin:0', 0], ['voltfin:1', 3]]) {
    const { g, teams, side } = game(9, (T, s) => Object.assign(T[s].offense.RB, { species: 'voltfin', form, mastery, type: 'Electric' }));
    const id = teams[side].offense.RB.id; g.t8 = { status: {}, ability: { [id]: { cd: 0, token: true } } };
    const { sim } = R.runScrimmagePlay(g, teams, 'inside_zone', 'cover_3');
    const f = sim.fields.find((x) => x.ability === 'ELE-02-F'); assert.ok(f);
    assert.equal(f.strength, form === 'voltfin:0' ? 20 : 30); assert.equal(f.type, 'Electric');
    assert.ok(Math.abs(f.yard[0]) < 1e-6 && Math.abs(f.yard[1] - 5) < 1e-6, `${f.yard}`); assert.ok(Math.abs((f.lat[0] + f.lat[1]) / 2 - PLAYS.inside_zone.align.RB[1]) < 1e-6 && Math.abs(f.lat[1] - f.lat[0] - 8) < 1e-6);
    assert.equal(fieldsOf(g, 'ELE-02-F').length, 0); assert.equal(g.t8.ability[id].cd, [5, 4, 3, 2][mastery]); assert.equal(g.t8.ability[id].token, false);
    assert.ok(!sim.events.some((e) => e.kind === 'field_stun' && e.by === 'RB' && e.side === 'off'), 'Electric immune');
  }
});

test('Phase Release: phased from a ready route snap (spends even without contact) until his first designated cut or the pass release; no opposing collisions while phased; cooldown 5/4/3/2', () => {
  let n = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('voltfang', 'off', 'WR2', seed, { t8, mastery: seed % 4 }); if (!r || PLAYS[r.offensePlay].assignments.WR2?.a !== 'route') continue;
    n++; const on = ab(r, 'ELE-03-F'); assert.equal(on.length, 1); assert.equal(t8.ability.X.cd, [5, 4, 3, 2][seed % 4]);
    const end = r.events.find((e) => e.kind === 'ability_end' && e.ability === 'ELE-03-F');
    const thr = r.events.find((e) => e.kind === 'throw');
    if (end) { assert.ok(['cut', 'release', 'disabled'].includes(end.reason)); if (thr) assert.ok(end.t <= thr.t + 0.051, 'solid by the ball flight'); }
    else assert.ok(!thr, 'a thrown ball always ends the phase');
  }
  assert.ok(n >= 15);
  const r = play('voltfang', 'off', 'WR2', 2, { t8: { status: {}, ability: { X: { cd: 1 } } } }); assert.equal(ab(r, 'ELE-03-F').length, 0, 'cooling down');
  const r2 = play('voltfang', 'off', 'WR2', 2, { t8: { status: { X: { id: 'stunned', strength: 1, remaining: 1, applications: 1 } }, ability: { X: { cd: 0 } } } }); assert.equal(ab(r2, 'ELE-03-F').length, 0, 'Stunned prevents activation');
});

test('Static Field: created before every ready defensive scrimmage play including the first, 12 wide from 5 to 12 yards on his alignment, 15% entry stun, one play; cooldown 5/4/3/2 on his defensive plays', () => {
  const { g, teams, other } = game(11, (T, s, o) => Object.assign(T[o].defense.FS, { species: 'stormlynx', form: 'stormlynx:0', mastery: 2, type: 'Electric' }));
  const id = teams[other].defense.FS.id;
  const { sim } = R.runScrimmagePlay(g, teams, 'slant_flat', 'cover_3');
  const f = sim.fields.find((x) => x.ability === 'ELE-04-F'); assert.ok(f, 'created on his first defensive play');
  assert.equal(f.strength, 15); assert.ok(Math.abs(f.yard[0] - 5) < 1e-6 && Math.abs(f.yard[1] - 12) < 1e-6); assert.ok(Math.abs(f.lat[1] - f.lat[0] - 12) < 1e-6 && Math.abs((f.lat[0] + f.lat[1]) / 2 - PLAYS.cover_3.align.FS[1]) < 1e-6);
  assert.equal(fieldsOf(g, 'ELE-04-F').length, 0, 'one completed play');
  assert.equal(g.t8.ability[id].cd, 3, 'mastery 2: 3 subsequent defensive plays');
  // stun rate on the engine (frozen: 30 plays with a field over the whole box; at least 80 first entries; tolerance 0.08 of 15%)
  let entries = 0, stuns = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const fl = [{ id: 'S', type: 'Electric', createdAt: 0, strength: 15, owner: 'X', ability: 'ELE-04-F', yard: [-8, 14], lat: [-27, 27] }];
    const r = play('stormlynx', 'def', 'FS', seed, { fields: fl, def: 'cover_3', t8: { status: {}, ability: { X: { cd: 3 } } } });
    entries += r.events.filter((e) => e.kind === 'field_enter' && !(e.side === 'def' && e.by === 'FS')).length; stuns += r.events.filter((e) => e.kind === 'field_stun').length;
    assert.ok(!r.events.some((e) => e.kind === 'field_enter' && e.side === 'def' && e.by === 'FS'), 'Electric unaffected');
  }
  assert.ok(entries >= 80); assert.ok(Math.abs(stuns / entries - 0.15) <= 0.08, `${stuns}/${entries}`);
});

test('Chain Break: his successful ordinary shed arcs Stumbled to the nearest other engaged blocker within 3 yards (whose block continues); none: readiness kept; spent even when the status is blocked', () => {
  let arcs = 0, kept = 0;
  for (let seed = 1; seed <= 240 && arcs < 6; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('joltrex', 'def', 'DL1', seed, { t8, mastery: 1, mutate: (L, D) => { D.defense.DL1.attrs = { ...D.defense.DL1.attrs, agility: 95, strength: 95, tackling: 90 }; } }); if (!r) continue;
    const sheds = r.events.filter((e) => e.kind === 'shed' && e.by === 'DL1' && e.side === 'def'); const ev = ab(r, 'ELE-05-F');
    if (!ev.length) { if (sheds.length) kept++; assert.equal(t8.ability.X.cd, 0); continue; }
    arcs++; assert.equal(ev.length, 1); assert.equal(t8.ability.X.cd, 4);
    assert.notEqual(ev[0].victim, sheds.filter((s) => s.t <= ev[0].t + 1e-9).pop()?.blocker, 'not the escaped blocker');
    const st = r.events.find((e) => e.kind === 'status' && e.status === 'stumbled' && e.by === 'DL1');
    if (st?.accepted) { const fr = r.frames.find((f) => f.t >= ev[0].t); const row = fr?.off.find((p) => p[0] === ev[0].victim); if (row && fr.t - ev[0].t < 0.11) assert.equal(row[3], 1, 'the target\'s block continues'); }
  }
  assert.ok(arcs >= 1, `arcs ${arcs} (sheds without a target ${kept})`);
  // blocked application still spends: the target's slot already holds another status
  for (let seed = 1; seed <= 240; seed++) {
    const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('joltrex', 'def', 'DL1', seed, { t8, mutate: (L, D) => { D.defense.DL1.attrs = { ...D.defense.DL1.attrs, agility: 95, strength: 95, tackling: 90 }; for (const s of ['LG', 'RG']) L.offense[s] = { ...L.offense[s], id: `o${s}` }; } }); if (!r) continue;
    if (!ab(r, 'ELE-05-F').length) continue;
    const t8b = { status: { oLG: { id: 'slowed', strength: 10, remaining: 3, applications: 1 }, oRG: { id: 'slowed', strength: 10, remaining: 3, applications: 1 } }, ability: { X: { cd: 0 } } };
    const r2 = play('joltrex', 'def', 'DL1', seed, { t8: t8b, mutate: (L, D) => { D.defense.DL1.attrs = { ...D.defense.DL1.attrs, agility: 95, strength: 95, tackling: 90 }; for (const s of ['LG', 'RG']) L.offense[s] = { ...L.offense[s], id: `o${s}` }; } });
    const ev = ab(r2, 'ELE-05-F'); if (!ev.length) continue;
    const st = r2.events.find((e) => e.kind === 'status' && e.status === 'stumbled' && e.by === 'DL1'); if (!st || st.accepted) continue;
    assert.equal(t8b.ability.X.cd, 5, 'a blocked arc still spends'); return;
  }
  assert.fail('no blocked arc observed');
});

test('Stormguard: on a ready passing play two status- and field-immune guards outside the line ends pass protect for the play; no guard statistics; no ball handling; never on runs; cooldown 5', () => {
  const field = [{ id: 'E', type: 'Electric', createdAt: 0, strength: 100, owner: 'zz', ability: 'TEST', yard: [-8, 0.5], lat: [-27, 27] }];
  let n = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const mastery = seed % 4; const t8 = { status: {}, ability: { X: { cd: 0 } } };
    const r = play('stormcrown', 'off', 'QB', seed, { t8, mastery, fields: seed % 3 === 0 ? field : undefined }); if (!r) continue; n++;
    const ev = ab(r, 'ELE-06-F'); assert.equal(ev.length, 1); assert.equal(t8.ability.X.cd, 5);
    const f0 = r.frames[0].off; const gl = f0.find((p) => p[0] === 'GDL'), gr = f0.find((p) => p[0] === 'GDR'); assert.ok(gl && gr);
    const ol = f0.filter((p) => ['LG', 'RG', 'C'].includes(p[0])); assert.ok(gl[2] < Math.min(...ol.map((p) => p[2])) && gr[2] > Math.max(...ol.map((p) => p[2])), 'outside each end'); assert.ok(gl[1] < 0 && gr[1] < 0, 'behind the LOS');
    assert.ok(!('GDL' in r.names.off) && !('GDR' in r.names.off)); assert.ok(!('GDL' in r.stats.blockers) && !('GDR' in r.stats.blockers));
    for (const v of Object.values(r.stats)) assert.ok(v !== 'GDL' && v !== 'GDR', 'no guard statistics');
    assert.ok(!r.events.some((e) => [e.by, e.victim, e.blocker].some((v) => v === 'GDL' || v === 'GDR')), 'guard references are removed from the play record');
    assert.ok(!r.events.some((e) => e.kind === 'status' && e.accepted && e.victim == null), 'immune to statuses (a guard victim would read null)');
    assert.ok(!r.events.some((e) => String(e.kind).startsWith('field_') && e.side === 'off' && e.by == null), 'immune to fields');
    if (seed % 3 === 0) assert.ok(r.events.some((e) => e.kind === 'field_stun' && e.side === 'off'), 'the field stuns other offensive monsters');
  }
  assert.ok(n >= 20);
  for (let seed = 1; seed <= 8; seed++) { const t8 = { status: {}, ability: { X: { cd: 0 } } }; const r = play('stormcrown', 'off', 'QB', seed, { t8, off: RUN[seed % RUN.length] }); assert.equal(ab(r, 'ELE-06-F').length, 0, 'runs'); assert.equal(t8.ability.X.cd, 0); }
  const t8 = { status: {}, ability: { X: { cd: 2 } } }; const r = play('stormcrown', 'off', 'QB', 1, { t8 }); assert.equal(ab(r, 'ELE-06-F').length, 0); assert.equal(t8.ability.X.cd, 1);
});

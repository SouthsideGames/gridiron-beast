// Owner 2026-11-24: zones pick sides. A buff (Wind, Light, Earth) helps every monster of the club that placed it; a debuff hits the
// other club, its own type still immune. A combination from one club's two zones hits only that club's opponents; one formed across
// clubs hits everyone. The parent types are always immune. Effects are sure, once a play for the one-offs, and carry on after leaving.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFieldPlay, ZONE_LINGER, STEAM, ELECTRIC_STUN } from '../src/sim/t8/field-effects.js';
import { effectsAt, reaches, BUFF_TYPES } from '../src/sim/t8/fields.js';

const DT = 0.05;
const Z = (id, type, team, extra = {}) => ({ id, type, strength: 20, createdAt: 1, owner: `src_${id}`, ability: 'TEST', team, yard: [-10, 10], lat: [-10, 10], ...extra });
const M = (slot, type, team, extra = {}) => ({ team, slot, mid: `m_${slot}`, name: slot, type, x: 0, y: 0, vx: 0, vy: 0, maxSpeed: 8, attrs: { awareness: 60, catching: 60, blocking: 60 }, stun: 0, noEngage: 0, engaged: null, ...extra });
// The offense is the home club in every case below: 'off' monsters are home, 'def' monsters away.
const play = (fields, actors) => { const events = []; const fx = createFieldPlay({ fields, actors, offenseSide: 'home', seed: 3, t8: { status: {} }, log: (text, d) => events.push({ text, ...d }), dt: DT, bounds: { left: -26, right: 26 } }); return { fx, events }; };

test('the buff and debuff types', () => { assert.deepEqual([...BUFF_TYPES].sort(), ['Earth', 'Light', 'Wind']); });

test('a Wind zone speeds up the placing club only, the Wind monster too; the defender beside him is not', () => {
  const wr = M('wr', 'Wind', 'off'), te = M('te', 'Fire', 'off'), cb = M('cb', 'Fire', 'def');
  const { fx, events } = play([Z('w', 'Wind', 'home')], [wr, te, cb]); fx.tick(DT);
  assert.equal(wr.maxSpeedMods.field, 30, 'his own Wind zone helps him (20 + 10)'); assert.equal(te.maxSpeedMods.field, 30);
  assert.equal(cb.maxSpeedMods?.field, undefined, 'the opponent gains nothing');
  assert.ok(events.some((e) => e.kind === 'field_enter' && e.by === 'wr' && e.element === 'Wind'));
});

test('a debuff hits only the other club, and never its own type', () => {
  const rb = M('rb', 'Nature', 'off'), lb = M('lb', 'Nature', 'def'), fireLb = M('flb', 'Fire', 'def');
  const { fx } = play([Z('f', 'Fire', 'home')], [rb, lb, fireLb]); fx.tick(DT);
  assert.equal(rb.maxSpeedMods?.field, undefined, 'his own club is untouched'); assert.equal(lb.maxSpeedMods.field, -30, 'the opponent is slowed');
  assert.equal(fireLb.maxSpeedMods?.field, undefined, 'a Fire opponent is immune to a Fire zone');
  assert.equal(reaches(Z('x', 'Dark', 'away'), 'Fire', 'home'), true); assert.equal(reaches(Z('x', 'Dark', 'away'), 'Fire', 'away'), false);
  assert.equal(reaches(Z('x', 'Earth', 'away'), 'Earth', 'away'), true, 'a buff helps its own type'); assert.equal(reaches(Z('x', 'Earth', 'away'), 'Fire', 'home'), false);
});

test('both clubs\' zones of one type: each monster feels only the one aimed at him', () => {
  const a = M('a', 'Water', 'off'), d = M('d', 'Water', 'def');
  const { fx } = play([Z('h', 'Fire', 'home', { strength: 5 }), Z('w', 'Fire', 'away', { strength: 25, createdAt: 2 })], [a, d]); fx.tick(DT);
  assert.equal(a.maxSpeedMods.field, -35, 'the away Fire slows the home runner'); assert.equal(d.maxSpeedMods.field, -15, 'the home Fire slows the away defender');
});

test('a combination from one club hits only its opponents; across clubs it hits everyone; parents always immune', () => {
  const same = [Z('f', 'Fire', 'home'), Z('w', 'Water', 'home', { createdAt: 2 })];
  assert.deepEqual(effectsAt(same, 0, 0, 'Nature', 'home').hybrid, { name: 'Steam', parents: ['Fire', 'Water'], side: 'home', applies: false });
  assert.equal(effectsAt(same, 0, 0, 'Nature', 'away').hybrid.applies, true); assert.equal(effectsAt(same, 0, 0, 'Fire', 'away').hybrid.applies, false, 'parent type');
  const cross = [Z('f', 'Fire', 'home'), Z('w', 'Water', 'away', { createdAt: 2 })];
  for (const side of ['home', 'away']) assert.equal(effectsAt(cross, 0, 0, 'Nature', side).hybrid.applies, true, `cross-club: ${side} too`);
  const mine = M('mine', 'Nature', 'off'), theirs = M('theirs', 'Nature', 'def');
  const { fx } = play(same, [mine, theirs]); fx.tick(DT);
  assert.equal(mine.attrs.catching, 60); assert.equal(+theirs.attrs.catching.toFixed(6), 60 * (1 - STEAM.catching));
});

test('Steam carries on after leaving, then wears off', () => {
  const d = M('d', 'Nature', 'def'); const { fx } = play([Z('f', 'Fire', 'home'), Z('w', 'Water', 'home', { createdAt: 2 })], [d]); fx.tick(DT);
  d.x = 40; fx.tick(2 * DT); assert.ok(d.attrs.catching < 60, 'just after leaving');
  fx.tick(2 * DT + ZONE_LINGER + DT); assert.equal(+d.attrs.catching.toFixed(6), 60);
});

test('Electric and Water hit the other club for sure, once a play; the placing club runs through untouched', () => {
  const own = M('own', 'Fire', 'off', { vx: 6 }), opp = M('opp', 'Fire', 'def', { vx: 6 });
  const e = play([Z('e', 'Electric', 'home')], [own, opp]); e.fx.tick(DT);
  assert.equal(own.stun, 0); assert.equal(opp.stun, ELECTRIC_STUN);
  const own2 = M('own2', 'Fire', 'off', { vx: 6 }), opp2 = M('opp2', 'Fire', 'def', { vx: 6 });
  const w = play([Z('w', 'Water', 'home')], [own2, opp2]); w.fx.tick(DT);
  assert.equal(own2.vx, 6); assert.equal(+opp2.vx.toFixed(6), 3.6);
});

test('Mindstorm: the placing club\'s runner leaves the echo; his opponents chase it', () => {
  const runner = M('r', 'Fire', 'off', { vx: 5 }), chaser = M('c', 'Fire', 'def');
  const { fx } = play([Z('p', 'Psychic', 'home'), Z('e', 'Electric', 'home', { createdAt: 2 })], [runner, chaser]); fx.tick(DT);
  assert.ok(runner.fx.echo?.live, 'the echo trails his club\'s runner'); assert.equal(chaser.fx.echo, undefined, 'none for the opponent');
  assert.ok(fx.lure(chaser, runner, 1), 'the opponent chases the echo');
});

// ---- in a real game: zones are stamped with the club that placed them, and the effects follow it
import * as R from './helpers/zone-rules.js';
import { lineup } from './tools/lineup.js';
function game(seed, setup = () => {}) {
  const mk = (name, s) => { const x = lineup(s, 60); for (const side of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[side])) { p.id = `${name}_${slot}`; p.type = 'Fire'; } return { id: name, name, offense: x.offense, defense: x.defense, kicker: x.kicker, bench: [] }; };
  const teams = { home: mk('H', 11), away: mk('A', 12) };
  const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 900, coinWinner: 'home', choice: 'receive' }); R.doKickoff(g, teams); setup(g, teams);
  return { g, teams };
}
test('in a game: a zone records the club that placed it, and only that club enters a Wind zone', () => {
  const { g, teams } = game(4, (g, t) => Object.assign(t[g.possession].offense.WR1, { species: 'gustling', form: 'gustling:2', mastery: 2, type: 'Wind' }));
  const side = g.possession; const { sim } = R.runScrimmagePlay(g, teams, 'slant_flat', 'cover_3');
  const f = (g.t8.fields?.list || []).find((x) => x.ability === 'WIN-01-F') || sim.fields.find((x) => x.ability === 'WIN-01-F'); assert.ok(f, 'Runway made');
  assert.equal(f.team, side, 'stamped with the placing club');
  const entered = (sim.events || []).filter((e) => e.kind === 'field_enter' && e.element === 'Wind');
  assert.ok(entered.length > 0, 'someone ran through it'); assert.ok(entered.every((e) => e.side === 'off'), 'only the placing club (the offense) feels a Wind zone');
});
test('in a game: a Light zone recharges the placing club\'s monsters who pass through it, not their opponents', () => {
  const { g, teams } = game(6); const side = g.possession;
  const home = side === 'home'; const abs = (x) => (home ? g.ballOn + x : 100 - g.ballOn - x);
  g.t8 ||= { status: {} }; g.t8.fields = { list: [{ id: 'LZ', type: 'Light', strength: 20, createdAt: 0, owner: 'nobody', ability: 'LIG-01-F', ownerTeam: side, team: side, remaining: 3, clock: 'teamOffense', yard: [Math.min(abs(-12), abs(25)), Math.max(abs(-12), abs(25))], lat: [-27, 27] }], pending: [], seq: 1 };
  const { sim } = R.runScrimmagePlay(g, teams, 'slant_flat', 'cover_3');
  const lit = (sim.events || []).filter((e) => e.kind === 'field_enter' && e.element === 'Light');
  assert.ok(lit.length >= 5, 'the offense passes through'); assert.ok(lit.every((e) => e.side === 'off'), 'only the placing club is reached');
});
test('Froststorm blows against an opponent\'s sideways run (a fixed side gave pursuers heading that way a free push)', () => {
  const left = M('l', 'Fire', 'def', { vy: -4, x: -4 }), right = M('r', 'Fire', 'def', { vy: 4, x: 4 });
  const { fx } = play([Z('i', 'Ice', 'home'), Z('w', 'Wind', 'home', { createdAt: 2 })], [left, right]);
  for (let k = 1; k <= 5; k++) { fx.tick(k * DT); fx.displace(left); fx.displace(right); }
  assert.ok(left.y > 0 && right.y < 0, `pushed back against the run: ${left.y}, ${right.y}`);
});
test('strengthened zones (owner 2026-11-24): Steam, Earth, Ice and Dark move the numbers that matter', () => {
  const at = (extra) => M('m', 'Nature', 'def', { attrs: { awareness: 60, catching: 60, blocking: 60, tackling: 60, coverage: 60, agility: 60 }, ...extra });
  const s = at(); play([Z('f', 'Fire', 'home'), Z('w', 'Water', 'home', { createdAt: 2 })], [s]).fx.tick(DT);
  for (const k of ['catching', 'blocking', 'tackling']) assert.equal(+s.attrs[k].toFixed(6), 39, `Steam: ${k} -35%`);
  const e = M('e', 'Nature', 'off', { attrs: { awareness: 60, catching: 60, blocking: 60, tackling: 60 } }); const ep = play([Z('g', 'Earth', 'home')], [e]); ep.fx.tick(DT);
  assert.equal(+e.attrs.blocking.toFixed(6), 78, 'Earth: his club blocks 30% harder'); assert.equal(+e.attrs.tackling.toFixed(6), 78); assert.equal(+ep.fx.resist(e).toFixed(6), 0.5, 'and resists half a knockback (20 + 30)');
  const i = at(); play([Z('i', 'Ice', 'home')], [i]).fx.tick(DT); assert.equal(+i.attrs.agility.toFixed(6), 48, 'Ice: Agility -20%');
  const d = at(); play([Z('d', 'Dark', 'home')], [d]).fx.tick(DT); assert.equal(+d.attrs.awareness.toFixed(6), 24, 'Dark: Awareness -60% (20 + 40)'); assert.equal(+d.attrs.coverage.toFixed(6), 42, 'and Coverage -30%');
});

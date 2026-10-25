// Captain Partnerships (GDD §27.4B), phases 2 and 3: which plays earn chemistry (read only from what the engine recorded), the
// per-game tally rules (one credit per play, garbage time, the cap), and the bonus layer (only the two captains, only the listed
// attributes, never above +4%, the very same objects at level 0). Real games prove that a game with no chemistry — or with
// partnerships at level 0 — is the game as it was, random numbers included.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualifyingEvent, boostSlots, playSucceeded, BONUS_ATTRS } from '../src/sim/partnership-play.js';
import { playGame } from '../src/sim/game-runner.js';
import { creditPartnerships } from '../src/sim/rules.js';
import { runFranchise } from '../tools/franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';

const M = (id, position) => ({ id, name: id, position, attrs: { accuracy: 70, awareness: 60, agility: 65, catching: 62, blocking: 66, strength: 64, tackling: 63, coverage: 61, speed: 70, arm: 68 } });
const OFF = { QB: M('qb', 'QB'), RB: M('rb', 'RB'), WR1: M('wr', 'WR'), WR2: M('wr2', 'WR'), TE: M('te', 'TE'), LG: M('lg', 'OL'), RG: M('rg', 'OL') };
const DEF = { DL1: M('d1', 'DL'), DL2: M('d2', 'DL'), LB1: M('l1', 'LB'), LB2: M('l2', 'LB'), CB1: M('c1', 'CB'), CB2: M('c2', 'CB'), FS: M('fs', 'S') };
const slots = { offense: OFF, defense: DEF };
const sim = (result, yards, stats = {}, events = []) => ({ result, yards, turnover: ['interception', 'fumble'].includes(result), stats: { passer: null, receiver: null, carrier: null, tackler: null, assistBy: null, pressureBy: null, blockers: {}, ...stats }, events });
const pre1 = { down: 1, toGo: 10 };
const q = (side, type, a, b, s, pre = pre1) => qualifyingEvent(side, { type, a, b }, slots, s, pre);

test('success criteria: 40% / 60% / the first down by down, a TD always; turnovers, sacks, incompletions and throwaways never', () => {
  assert.equal(playSucceeded(sim('run', 4), 1, 10), true); assert.equal(playSucceeded(sim('run', 3), 1, 10), false);
  assert.equal(playSucceeded(sim('run', 6), 2, 10), true); assert.equal(playSucceeded(sim('run', 5), 2, 10), false);
  assert.equal(playSucceeded(sim('run', 3), 3, 3), true); assert.equal(playSucceeded(sim('run', 2), 4, 3), false);
  assert.equal(playSucceeded(sim('touchdown', 1), 3, 9), true);
  for (const r of ['interception', 'fumble', 'sack', 'incomplete', 'throwaway', 'safety']) assert.equal(playSucceeded(sim(r, 20), 1, 10), false, r);
});

test('QB–RB: a successful handoff or a successful completion between the two captains; a handoff alone is not enough', () => {
  assert.equal(q('offense', 'QB-RB', 'qb', 'rb', sim('run', 5, { carrier: 'RB' }, [{ kind: 'handoff', to: 'RB' }])), 'handoff');
  assert.equal(q('offense', 'QB-RB', 'qb', 'rb', sim('run', 2, { carrier: 'RB' }, [{ kind: 'handoff', to: 'RB' }])), null, 'handoff, but the run failed');
  assert.equal(q('offense', 'QB-RB', 'qb', 'rb', sim('complete', 7, { passer: 'QB', receiver: 'RB', carrier: 'RB' })), 'completion');
  assert.equal(q('offense', 'QB-RB', 'qb', 'rb', sim('complete', 7, { passer: 'QB', receiver: 'WR1' })), null, 'a completion to someone else');
  assert.equal(q('offense', 'QB-RB', 'qb', 'rb', sim('fumble', 8, { carrier: 'RB' }, [{ kind: 'handoff', to: 'RB' }])), null);
});

test('QB–WR and QB–TE: completed, successful passes from the captain QB to the captain receiver only', () => {
  assert.equal(q('offense', 'QB-WR', 'qb', 'wr', sim('complete', 12, { passer: 'QB', receiver: 'WR1' })), 'completion');
  assert.equal(q('offense', 'QB-WR', 'qb', 'wr', sim('incomplete', 0, { passer: 'QB', target: 'WR1' })), null);
  assert.equal(q('offense', 'QB-WR', 'qb', 'wr2', sim('complete', 12, { passer: 'QB', receiver: 'WR1' })), null, 'the other WR');
  assert.equal(q('offense', 'QB-TE', 'qb', 'te', sim('complete', 5, { passer: 'QB', receiver: 'TE' })), 'completion');
  assert.equal(q('offense', 'QB-TE', 'qb', 'te', sim('complete', 2, { passer: 'QB', receiver: 'TE' })), null, 'completed but short of 40% on first down');
});

test('RB–OL: a successful handoff run to the captain RB with the captain lineman\'s run block engaged and held', () => {
  const run = (bk) => sim('run', 6, { carrier: 'RB', blockers: { LG: bk } }, [{ kind: 'handoff', to: 'RB' }]);
  assert.equal(q('offense', 'RB-OL', 'rb', 'lg', run({ pass: 0, run: 1, lost: 0 })), 'run-block');
  assert.equal(q('offense', 'RB-OL', 'rb', 'lg', run({ pass: 0, run: 1, lost: 1 })), null, 'the block was lost');
  assert.equal(q('offense', 'RB-OL', 'rb', 'lg', run(undefined)), null, 'never engaged');
  assert.equal(q('offense', 'RB-OL', 'rb', 'lg', sim('complete', 9, { passer: 'QB', receiver: 'RB', blockers: { LG: { pass: 1, run: 0, lost: 0 } } })), null, 'a pass, not a handoff');
});

test('OL–OL: both linemen engaged, neither lost his block nor allowed the pressure or sack, on a successful play', () => {
  const ok = { pass: 1, run: 0, lost: 0 };
  assert.equal(q('offense', 'OL-OL', 'lg', 'rg', sim('complete', 9, { passer: 'QB', receiver: 'WR1', blockers: { LG: ok, RG: ok } })), 'blocks');
  assert.equal(q('offense', 'OL-OL', 'lg', 'rg', sim('complete', 9, { passer: 'QB', receiver: 'WR1', blockers: { LG: ok } })), null, 'one never engaged');
  assert.equal(q('offense', 'OL-OL', 'lg', 'rg', sim('complete', 9, { passer: 'QB', receiver: 'WR1', blockers: { LG: ok, RG: ok }, pressureAllowedBy: 'RG' })), null);
  assert.equal(q('offense', 'OL-OL', 'lg', 'rg', sim('complete', 1, { passer: 'QB', receiver: 'WR1', blockers: { LG: ok, RG: ok } })), null, 'the play failed');
});

test('DL–DL: joint tackles, sacks and pressures, or one lineman\'s shed with the other\'s stop; both shedding alone never counts', () => {
  assert.equal(q('defense', 'DL-DL', 'd1', 'd2', sim('run', 1, { tackler: 'DL1', assistBy: 'DL2' })), 'tackle-assist');
  assert.equal(q('defense', 'DL-DL', 'd1', 'd2', sim('sack', -6, { tackler: 'DL2', pressureBy: 'DL1' })), 'pressure-sack');
  assert.equal(q('defense', 'DL-DL', 'd1', 'd2', sim('run', 0, { tackler: 'DL2' }, [{ kind: 'shed', by: 'DL1' }])), 'shed-tackle');
  assert.equal(q('defense', 'DL-DL', 'd1', 'd2', sim('run', 0, { tackler: 'LB1' }, [{ kind: 'shed', by: 'DL1' }, { kind: 'shed', by: 'DL2' }])), null, 'both shed, somebody else made the stop');
  assert.equal(q('defense', 'DL-DL', 'd1', 'd2', sim('run', 0, { tackler: 'DL1' }, [{ kind: 'shed', by: 'DL1' }])), null, 'one lineman alone');
  assert.equal(q('defense', 'DL-DL', 'd1', 'd2', sim('run', 7, { tackler: 'DL1', assistBy: 'DL2' })), null, 'the offense succeeded');
});

test('DL–LB and DL–CB: only recorded contributions from both captains, on a failed offensive play', () => {
  assert.equal(q('defense', 'DL-LB', 'd1', 'l1', sim('run', 1, { tackler: 'LB1' }, [{ kind: 'shed', by: 'DL1' }])), 'shed-tackle');
  assert.equal(q('defense', 'DL-LB', 'd1', 'l1', sim('run', 1, { tackler: 'DL1' }, [{ kind: 'shed', by: 'LB1' }])), null, 'the shed must be the lineman\'s');
  assert.equal(q('defense', 'DL-LB', 'd1', 'l1', sim('run', 1, { tackler: 'LB1', assistBy: 'DL1' })), 'tackle-assist');
  assert.equal(q('defense', 'DL-CB', 'd1', 'c1', sim('incomplete', 0, { pressureBy: 'DL1', coverBy: 'CB1' })), 'pressure-coverage');
  assert.equal(q('defense', 'DL-CB', 'd1', 'c1', sim('incomplete', 0, { pressureBy: 'DL1', pbuBy: 'CB1', coverBy: 'CB2' })), 'pressure-breakup');
  assert.equal(q('defense', 'DL-CB', 'd1', 'c1', sim('interception', 0, { pressureBy: 'DL1', interceptor: 'CB1' })), 'pressure-interception');
  assert.equal(q('defense', 'DL-CB', 'd1', 'c1', sim('incomplete', 0, { coverBy: 'CB1' })), null, 'no recorded pressure: coverage alone');
  assert.equal(q('defense', 'DL-CB', 'd1', 'c1', sim('incomplete', 0, { pressureBy: 'DL1', coverBy: 'CB2' })), null, 'no invented coverage helper');
});

test('a captain off the field (package, injury, bench) earns nothing and boosts nothing', () => {
  const noTE = { ...OFF }; delete noTE.TE;
  assert.equal(qualifyingEvent('offense', { type: 'QB-TE', a: 'qb', b: 'te' }, { offense: noTE, defense: DEF }, sim('complete', 9, { passer: 'QB', receiver: 'TE' }), pre1), null);
  assert.equal(boostSlots(noTE, { type: 'QB-TE', a: 'qb', b: 'te', level: 4 }), noTE);
});

test('bonus: only the two captains, only the listed attributes, at most +4%, never written back; level 0 is the same object', () => {
  assert.equal(boostSlots(OFF, { type: 'QB-WR', a: 'qb', b: 'wr', level: 0 }), OFF);
  assert.equal(boostSlots(OFF, null), OFF);
  for (const level of [1, 2, 3, 4, 9]) {
    const out = boostSlots(OFF, { type: 'QB-WR', a: 'qb', b: 'wr', level });
    const L = Math.min(level, 4);
    for (const [slot, p] of Object.entries(out)) for (const [k, v] of Object.entries(p.attrs)) {
      const base = OFF[slot].attrs[k]; const listed = (slot === 'QB' && BONUS_ATTRS['QB-WR'].a.includes(k)) || (slot === 'WR1' && BONUS_ATTRS['QB-WR'].b.includes(k));
      if (listed) assert.equal(v, Math.max(1, Math.min(99, Math.round(base * (1 + L / 100)))), `${slot} ${k} L${level}`); else assert.equal(v, base, `${slot} ${k} unchanged`);
      assert.ok(v <= Math.round(base * 1.04), 'never above +4%');
    }
    for (const s of ['RB', 'WR2', 'TE', 'LG', 'RG']) assert.equal(out[s], OFF[s], 'everyone else is the same object');
  }
  assert.equal(OFF.QB.attrs.accuracy, 70, 'the lineup entry itself is never changed');
});

// ---------------------------------------------------------------- real games
const teamsOf = (() => { let t = null; return () => (t ||= (() => { const { f } = runFranchise(5, { seasons: 1, difficulty: 'pro' }); const cs = Object.keys(f.season.records).filter((c) => c !== f.club); return { f, home: F.aiTeam(f, cs[0]), away: F.aiTeam(f, cs[1]) }; })()); })();
const withP = (team, level) => { const o = team.offense, d = team.defense; return { ...team, partnership: { offense: { type: 'QB-WR', a: o.QB.id, b: o.WR1.id, level, cap: 8 }, defense: { type: 'DL-DL', a: d.DL1.id, b: d.DL2.id, level, cap: 3 } } }; };
const strip = (s) => { const c = JSON.parse(JSON.stringify(s)); delete c.partners; delete c.partnerCredits; return c; };

test('level 0 partnerships: byte-identical football (score, log, stats, random state); credits are tallied without changing anything', () => {
  const { home, away } = teamsOf();
  for (const seed of [11, 12, 13]) {
    const plain = playGame({ home, away, seed, quarterLength: 180 });
    const zero = playGame({ home: withP(home, 0), away: withP(away, 0), seed, quarterLength: 180 });
    assert.equal(plain.partners, undefined, 'no partnership: no new field at all');
    assert.deepEqual(strip(zero), strip(plain), `seed ${seed}: identical game`);
    assert.equal(zero.rngState, plain.rngState);
    const t = zero.partnerCredits; assert.ok(t.home.offense || t.away.offense || t.home.defense || t.away.defense, 'credits were tallied');
    for (const s of ['home', 'away']) for (const side of ['offense', 'defense']) { const x = t[s][side]; if (x) assert.ok(x.n <= zero.partners[s][side].cap, 'never past the per-game cap'); }
  }
});

test('the level is fixed at kickoff: changing the team mid-game changes nothing; +4% changes results but only through the bonus', () => {
  const { home, away } = teamsOf();
  const h = withP(home, 2), a = withP(away, 2);
  const steady = playGame({ home: h, away: a, seed: 21, quarterLength: 180 });
  const h2 = withP(home, 2), a2 = withP(away, 2);
  const moved = playGame({ home: h2, away: a2, seed: 21, quarterLength: 180, onStep: () => { h2.partnership.offense.level = 4; a2.partnership.defense.level = 0; } });
  assert.deepEqual(strip(moved), strip(steady), 'the kickoff snapshot is what plays');
  assert.equal(moved.partners.home.offense.level, 2);
  let differs = 0; for (const seed of [31, 32, 33, 34]) { const p = playGame({ home, away, seed, quarterLength: 180 }); const b = playGame({ home: withP(home, 4), away: withP(away, 4), seed, quarterLength: 180 }); if (JSON.stringify(p.score) !== JSON.stringify(b.score) || p.log.length !== b.log.length) differs++; }
  assert.ok(differs >= 1, 'an active +4% partnership does reach the football');
});

test('one credit per pair per play, garbage time excluded for the side ahead by 21+, the per-game cap enforced', () => {
  const pass = sim('complete', 12, { passer: 'QB', receiver: 'WR1', tackler: 'CB1', assistBy: 'FS' });
  const state = (score, quarter = 4) => ({ possession: 'home', partners: { home: { offense: { type: 'QB-WR', a: 'qb', b: 'wr', level: 0, cap: 2 }, defense: null }, away: { offense: null, defense: { type: 'DL-DL', a: 'd1', b: 'd2', level: 0, cap: 3 } } }, partnerCredits: { home: {}, away: {} }, score });
  const s1 = state({ home: 7, away: 0 }, 2);
  creditPartnerships(s1, slots, pass, { down: 1, toGo: 10, quarter: 2, score: s1.score });
  assert.equal(s1.partnerCredits.home.offense.n, 1, 'one credit for one play');
  creditPartnerships(s1, slots, pass, { down: 1, toGo: 10, quarter: 2, score: s1.score }); creditPartnerships(s1, slots, pass, { down: 1, toGo: 10, quarter: 2, score: s1.score });
  assert.deepEqual([s1.partnerCredits.home.offense.n, s1.partnerCredits.home.offense.capped], [2, 1], 'the cap of 2 holds');
  const g = state({ home: 30, away: 8 });
  creditPartnerships(g, slots, pass, { down: 1, toGo: 10, quarter: 4, score: g.score });
  assert.deepEqual([g.partnerCredits.home.offense.n, g.partnerCredits.home.offense.garbage], [0, 1], 'leading by 22 in the 4th: no chemistry');
  const e = state({ home: 29, away: 8 });
  creditPartnerships(e, slots, pass, { down: 1, toGo: 10, quarter: 4, score: e.score });
  assert.equal(e.partnerCredits.home.offense.n, 1, 'a 21-point lead still counts');
  const o = state({ home: 30, away: 8 });
  creditPartnerships(o, slots, pass, { down: 1, toGo: 10, quarter: 5, score: o.score });
  assert.equal(o.partnerCredits.home.offense.n, 1, 'overtime is not the fourth quarter');
  const stop = sim('run', 1, { carrier: 'RB', tackler: 'DL1', assistBy: 'DL2' }, [{ kind: 'handoff', to: 'RB' }]);
  const d = state({ home: 0, away: 28 }); creditPartnerships(d, slots, stop, { down: 1, toGo: 10, quarter: 4, score: d.score });
  assert.equal(d.partnerCredits.away.defense.garbage, 1, 'the rule applies to the defense too: the defending side is the one ahead');
  const d2 = state({ home: 28, away: 0 }); creditPartnerships(d2, slots, stop, { down: 1, toGo: 10, quarter: 4, score: d2.score });
  assert.equal(d2.partnerCredits.away.defense.n, 1, 'a trailing defense still earns');
});

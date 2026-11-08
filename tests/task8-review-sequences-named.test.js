// Task 8 Reviewer v2 (spec §25): the two named examples, every step, at every mastery tier; the labelled blocked / failure /
// interaction variants; determinism; and the reviewer's isolation (no progression, save, reward or mastery writes).
//  - Ball Clamp (MET-04-F): the token is earned by his own sack on an earlier play; on his next successful normal tackle whose first
//    fumble check did not fumble the one extra ordinary check is rolled (fumble or held) and the token is spent; his next tackle has
//    no extra check. The interaction variant shows the extra check jarring the ball loose on a fixed seed (a natural roll).
//  - Sovereign Arm (DRA-06-F): the charge is prepared; on the charged throw a controlled would-be interception (reviewer-only engine
//    option) meets the protection: the dragon intervention, the incomplete pass, the defender's absence on the next offensive play
//    and his return on the play after, in that order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reviewSequence, sequenceVariants } from '../src/sim/abilities/review-sequence.js';
import { VARIANTS } from '../src/sim/abilities/review-texts.js';
import { BALL_CLAMP } from '../src/sim/abilities/ironjaw.js';
import { assertComplete, digestOf } from './helpers/review-v2.js';

const TIERS = [0, 1, 2, 3];
const clampEv = (p) => p.allEvents.find((e) => e.ability === 'MET-04-F' && e.kind === 'ability');

test('Ball Clamp: token earned by his own sack, the qualifying tackle, the extra check, what changed, the token spent, his next tackle ordinary', () => {
  for (const mastery of TIERS) {
    const tag = `ironjaw m${mastery}`; const r = assertComplete(reviewSequence({ family: 'ironjaw', mastery }), tag); const slot = r.explain.source.slot; const act = r.activation;
    // the qualifying prerequisite, played (not primed): his own sack earns the token on an earlier play
    const earn = r.plays.findIndex((p) => p.allEvents.some((e) => e.kind === 'ability_charge' && e.ability === 'MET-04-F' && e.by === slot));
    assert.ok(earn >= 0 && earn < act, `${tag}: the token is earned before the activation play`);
    assert.equal(r.plays[earn].sim.result, 'sack', `${tag}: earned on a sack`); assert.ok(r.plays[earn].allEvents.some((e) => e.kind === 'sack' && e.by === slot), `${tag}: his own sack`);
    assert.equal(r.plays[earn].before.token, false, tag); assert.equal(r.plays[earn].after.token, true, tag);
    // the qualifying contact: his successful normal tackle whose first fumble check did not fumble
    const A = r.plays[act]; const e = clampEv(A); assert.ok(e, `${tag}: the Ball Clamp event`);
    assert.ok(A.allEvents.some((x) => (x.kind === 'tackle' || x.kind === 'fumble') && x.by === slot && !x.offBlock && x.t === e.t), `${tag}: a normal tackle by him at the same moment`);
    assert.equal(A.before.token, true, tag); assert.equal(A.after.token, false, `${tag}: what changed: the token is spent`);
    // the extra ordinary check at the mastery factor of the normal probability (no guaranteed turnover)
    assert.ok(e.p > 0 && e.p < 0.1, `${tag}: a small probability (${e.p})`); assert.equal(typeof e.fumble, 'boolean', tag);
    const base = e.p / BALL_CLAMP.factor[mastery]; assert.ok(base > 0 && base < 0.1, `${tag}: p = normal fumble probability x ${BALL_CLAMP.factor[mastery]}`);
    const res = r.phases[2].evidence; assert.match(res, e.fumble ? /jarred loose/ : /held, no fumble/, tag); assert.match(res, /token true -> false/, tag);
    if (!e.fumble) assert.ok(!A.allEvents.some((x) => x.kind === 'fumble'), `${tag}: held: no fumble on the play`);
    // cleanup: his next tackle has no extra check; no second activation
    const next = r.plays.findIndex((p, j) => j > act && p.allEvents.some((x) => x.kind === 'tackle' && x.by === slot));
    assert.ok(next > act, `${tag}: a later tackle by him`); assert.ok(!clampEv(r.plays[next]), `${tag}: no extra check on it`); assert.ok(r.plays.slice(act + 1).every((p) => !p.executed), tag);
    assert.equal(r.controlled, false, `${tag}: no controlled outcome needed (participants prepared: weak opposing line)`);
  }
});

test('Ball Clamp interaction: the extra check jars the ball loose (a natural roll on a fixed seed), at every tier', () => {
  for (const mastery of TIERS) {
    const tag = `ironjaw jarred-loose m${mastery}`; const r = assertComplete(reviewSequence({ family: 'ironjaw', mastery, variant: 'interaction-jarred-loose' }), tag); const A = r.plays[r.activation];
    const e = clampEv(A); assert.equal(e.fumble, true, tag); assert.ok(A.allEvents.some((x) => x.kind === 'fumble' && x.by === r.explain.source.slot && x.t === e.t), `${tag}: the fumble at the check`);
    assert.equal(r.controlled, false, `${tag}: not forced`); assert.equal(r.kind, 'interaction', tag);
  }
});

test('Sovereign Arm: the dragon intervention, the incomplete pass, the defender\'s absence on the next offensive play and his return, in order', () => {
  for (const mastery of TIERS) {
    const tag = `aurodrax m${mastery}`; const r = assertComplete(reviewSequence({ family: 'aurodrax', mastery }), tag); const act = r.activation; const A = r.plays[act];
    assert.equal(A.before.charged, true, `${tag}: charge prepared`); assert.equal(A.before.used, false, tag);
    assert.deepEqual(A.controls, ['wouldBeInterception'], `${tag}: the controlled prerequisite on the charged throw`); assert.ok(r.plays.slice(act + 1).every((p) => !p.controls), `${tag}: no control after it`);
    assert.ok(r.controls.some((c) => c.id === 'wouldBeInterception' && /would-be interception/.test(c.label)), `${tag}: labelled`);
    const ev = A.allEvents; const guard = ev.find((e) => e.ability === 'DRA-06-F' && e.kind === 'ability'); const deny = ev.find((e) => e.contract === true && /cannot hold it/.test(e.text));
    const inc = ev.find((e) => e.kind === 'incomplete' && e.denied); const swallow = ev.find((e) => e.kind === 'dragon_swallow');
    assert.ok(guard && deny && inc && swallow, `${tag}: guard, denial, incompletion and swallow events`);
    assert.ok(ev.indexOf(guard) < ev.indexOf(deny) && ev.indexOf(deny) < ev.indexOf(inc) && ev.indexOf(inc) < ev.indexOf(swallow), `${tag}: 1 dragon intervention, 2 incomplete pass, then the swallow`);
    assert.equal(deny.victim, inc.denied); assert.equal(swallow.victim, deny.victim, `${tag}: the would-be interceptor is swallowed`);
    assert.ok(!ev.some((e) => e.kind === 'interception'), `${tag}: no interception`); assert.equal(A.sim.result, 'incomplete', tag);
    assert.equal(A.after.used, true, tag); assert.equal(A.after.charged, false, tag);
    const victim = deny.victim; const queued = A.absencesAfter[0]; assert.ok(queued && queued.serveOn === 'home', `${tag}: the absence queued for his offense's next play`);
    const B = r.plays[act + 1]; assert.equal(B.kind, 'play', tag); assert.equal(B.offSide, 'home', `${tag}: the next qualifying offensive play`);
    assert.equal(B.served[0]?.mid, queued.mid, `${tag}: served on that play`); assert.ok(!B.presence.def.includes(victim), `${tag}: ${victim} absent (slot vacant)`);
    const C = r.plays[act + 2]; assert.ok(C && C.presence.def.includes(victim), `${tag}: ${victim} back on the play after`); assert.equal(C.absencesAfter.length, 0, tag);
    assert.ok(r.plays.slice(act + 1).every((p) => !p.executed), `${tag}: once per game`);
  }
});

test('labelled variants: every blocked / failure / interaction scenario shows its own expected outcome (unmet condition or gate) at every tier', () => {
  const ids = Object.entries(VARIANTS).flatMap(([family, vs]) => vs.map((v) => [family, v]));
  assert.ok(ids.length >= 7);
  for (const [family, v] of ids) for (const mastery of TIERS) {
    const tag = `${family} ${v.id} m${mastery}`; const r = reviewSequence({ family, mastery, variant: v.id });
    assert.equal(r.error, null, tag); assert.ok(r.ok, `${tag}: ${r.failure?.condition} ${r.failure?.detail}`); assert.equal(r.kind, v.kind, tag); assert.ok(r.label.length > 5, tag);
    assert.deepEqual(r.phases.map((p) => p.ok), [true, true, true, true], tag);
    if (v.kind === 'blocked') assert.match(r.phases[1].evidence, /Eclipse|Cold Snap/, `${tag}: the gate named`);
    if (v.kind === 'failure') assert.match(r.phases[1].evidence, /not charged|no token/, `${tag}: the unmet condition named`);
    if (v.kind !== 'interaction' || family === 'mossclaw') { const p = r.plays[r.phases[1].play]; assert.equal(p.executed, false, `${tag}: no execution recorded`); }
  }
  assert.deepEqual(sequenceVariants('aurodrax').map((v) => v.kind), ['main', 'failure', 'blocked']);
});

test('failure panel data: an unmet trigger and an implementation error are reported, never a silent ordinary play', () => {
  const none = reviewSequence({ family: 'nonexistent' }); assert.equal(none.ok, false); assert.match(none.failure.condition, /no football ability/);
  const bad = reviewSequence({ family: 'aurodrax', variant: 'no-such-variant' }); assert.equal(bad.ok, false); assert.match(bad.failure.condition, /no variant/);
  // an unmet trigger: Ball Clamp with one seed and one snap (no sack, so no token): the trigger and the readiness at each snap are named
  const r = reviewSequence({ family: 'ironjaw', override: { seeds: 1, snaps: 1 } });
  assert.equal(r.ok, false); assert.equal(r.activation, null); assert.match(r.failure.condition, /^The trigger was not met: The token/); assert.equal(r.failure.snaps.length, 1); assert.match(r.failure.snaps[0], /^play 1: /);
  assert.deepEqual(r.phases.map((p) => p.ok), [false, false, false, false]); assert.equal(r.plays.length, 1, 'the ordinary play is still shown, labelled by the failure');
  // an implementation error is caught and reported with its message and stack, never as an ordinary play
  const e = reviewSequence({ family: 'emberfox', override: { setup: () => { throw new Error('staging exploded'); } } });
  assert.equal(e.ok, false); assert.equal(e.error.message, 'staging exploded'); assert.match(e.failure.condition, /implementation error/); assert.ok(e.error.stack.length > 0);
  // a missing phase names what it waited for: Sovereign Arm with no follow-up plays allowed cannot show the absence and return
  const c = reviewSequence({ family: 'aurodrax', maxFollowUps: 1 }); assert.equal(c.ok, false); assert.match(c.failure.condition, /^Cleanup not observed/); assert.match(c.failure.detail, /back in his formation slot|absence served/);
});

test('determinism: the same scenario twice gives identical events (Ball Clamp, Sovereign Arm, every variant)', () => {
  for (const [family, variant, mastery] of [['ironjaw', 'main', 1], ['ironjaw', 'interaction-jarred-loose', 3], ['aurodrax', 'main', 2], ['aurodrax', 'blocked-eclipse', 0], ['ironjaw', 'failure-no-token', 0], ['firestorm', 'blocked-eclipse', 3], ['mossclaw', 'interaction-cold-snap', 2]]) {
    assert.equal(digestOf(reviewSequence({ family, variant, mastery })), digestOf(reviewSequence({ family, variant, mastery })), `${family} ${variant} m${mastery}`);
  }
});

test('isolation: the reviewer writes no progression, save, reward, mastery or browser storage', () => {
  const files = ['review.js', 'review-sequence.js', 'review-phases.js', 'review-texts.js', 'review-blocked.js', 'review-scenarios.js'].map((f) => `../src/sim/abilities/${f}`).concat(['../src/ui/screens/ability-reviewer.js']);
  for (const file of files) {
    const src = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const bad of ['save', 'storage', 'franchise.js', 'progression', 'reward', 'collection', 'mastery-award', 'awards']) assert.ok(!new RegExp(`from '[^']*${bad}`).test(src), `${file}: imports ${bad}`);
    assert.ok(!/localStorage|indexedDB|sessionStorage/.test(src), `${file}: no browser storage`);
  }
  // runtime: a storage stub records any write while sequences run; the only franchise modules reached are the generated-club path
  const writes = []; const prev = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null, setItem: (k) => writes.push(k), removeItem: (k) => writes.push(k), clear: () => writes.push('*') };
  try { for (const [family, variant] of [['ironjaw', 'main'], ['aurodrax', 'main'], ['snowmoth', 'main'], ['sablewing', 'main']]) assert.ok(reviewSequence({ family, variant }).ok, family); } finally { if (prev === undefined) delete globalThis.localStorage; else globalThis.localStorage = prev; }
  assert.deepEqual(writes, [], 'no storage writes');
  // the run's own game is local: the subject's executions stay in the result's play records, nothing is returned that references a roster
  const r = reviewSequence({ family: 'glimmer' }); assert.ok(r.plays.every((p) => !('teams' in p)), 'no club objects leak out of the run');
});

// Task 8 Reviewer v2 (spec §25): the shared assertion for one complete-interaction run (src/sim/abilities/review-sequence.js).
// Every phase must carry evidence from the engine records of the run itself: the play index and time it was observed at, an
// execution recorded on the activation play, its event among that play's events (or, for a formula kick / pre-snap game hook, the
// game's own result line), the resolution on or after the activation, and the cleanup after it with at least one follow-up play.
import assert from 'node:assert/strict';

export const PHASE_IDS = ['trigger', 'activation', 'resolution', 'cleanup'];

export function assertComplete(r, tag) {
  assert.equal(r.error, null, `${tag}: implementation error ${r.error?.message}`);
  assert.ok(r.ok, `${tag}: ${r.failure?.condition} | ${r.failure?.detail}`);
  assert.deepEqual(r.phases.map((p) => p.id), PHASE_IDS, `${tag}: the four phases in order`);
  for (const p of r.phases) { assert.equal(p.ok, true, `${tag}: ${p.id}`); assert.ok(Number.isInteger(p.play) && p.play >= 0 && p.play < r.plays.length, `${tag}: ${p.id} names its play`); assert.ok(typeof p.evidence === 'string' && p.evidence.length > 5, `${tag}: ${p.id} evidence`); }
  const [T, A, Rz, C] = r.phases; const act = r.activation;
  assert.equal(A.play, act, `${tag}: activation on the activation play`);
  const AP = r.plays[act]; assert.equal(AP.executed, true, `${tag}: an execution recorded for the subject on the activation play`);
  assert.equal(r.plays.filter((p, i) => i < act && p.executed).length, 0, `${tag}: no earlier execution`);
  const evTexts = [...AP.allEvents.map((e) => e.text), ...AP.gameLog.map((e) => e.text), AP.text];
  assert.ok(evTexts.some((t) => t && A.evidence.includes(t)), `${tag}: the activation evidence is an engine event of that play`);
  assert.equal(T.play, act, `${tag}: the trigger is evaluated at the activation snap`);
  assert.ok(Rz.play >= act, `${tag}: the resolution is on or after the activation`);
  assert.ok(C.play >= Rz.play, `${tag}: the cleanup follows the resolution`);
  assert.ok(r.plays.length > Rz.play + 1, `${tag}: at least one follow-up play after the resolution (multi-play continuation)`);
  assert.ok(r.plays.slice(act + 1).every((p) => p.followUp), `${tag}: plays after the activation are follow-ups`);
  assert.ok(r.explain && r.explain.source && r.explain.targets && r.explain.expect, `${tag}: source, targets and expected result explained before playback`);
  assert.equal(r.explain.source.slot, r.plays[act].subjectEvents[0]?.by ?? r.explain.source.slot, `${tag}: the source is the subject`);
  return r;
}

/** A digest for determinism: every play's engine events, state, fields, statuses and absences, and the phases. */
export const digestOf = (r) => JSON.stringify({ ok: r.ok, seed: r.seed, act: r.activation, phases: r.phases, plays: r.plays.map((p) => [p.kind, p.text, p.executed, p.before, p.after, p.allEvents, p.gameLog, p.fieldsAfter, p.statuses, p.absencesAfter, p.served, p.presence, p.sim ? [p.sim.result, p.sim.yards, p.sim.frames.length, p.sim.frames.at(-1)] : null]) });

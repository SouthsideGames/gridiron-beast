// Task 10 (owner 2026-11-13): a Watch Beast Clash in Franchise Mode is one continuous battle. The franchise keeps a live session
// (recordSession); the player's switches are recorded as they happen; the battle settles once from that record, with the same result as
// the session, and rewards are applied exactly once. A reload mid-battle resumes at the exchange the player reached.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { recordSessionStep, policiesOf, upgradeUnresolvedRecord } from '../src/franchise/clash-link.js';
import * as Save from '../src/franchise/save.js';

function tuesday(seed) {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed });
  F.hireDefaultStaff(f); let g = 0; while (F.creationDraftPending(f) && g++ < 400) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  F.scoutRegion(f, 'Coral Coast'); return f;
}
/** Play the session as the screen does: tap the first reserve whenever a switch is legal (up to `max` switches). */
function playWatch(f, s, max = 3) {
  const e = f.week.encounter; let switches = 0, guard = 0;
  while (!s.done && guard++ < 500) {
    const r = s.view.rotation; if (switches < max && r.exchangesLeft === 0 && r.reserves.length && s.request(r.reserves[0].id).ok) switches++;
    const asked = s.queued; const v = s.advance(); recordSessionStep(e, { ex: r.ex, asked, view: v });
  }
  return switches;
}

test('a Watch encounter is a continuous session: no prompt, switches recorded, settled once with the session\'s own result, rewards once', () => {
  for (const seed of [31, 32, 33]) {
    const f = tuesday(seed); const st = F.startEncounter(f, 0, { mode: 'watch' }); assert.equal(st.ok, true, st.reason);
    const e = f.week.encounter; assert.equal(policiesOf(e).a, 'player', 'Watch plays as the continuous player policy');
    const s = F.encounterSession(f); assert.ok(s, 'a live session');
    const switches = playWatch(f, s);
    assert.ok(!s.result.log.some((x) => x.kind === 'rotation_prompt'), 'never a prompt');
    assert.equal(Object.values(e.decisions.a).filter((d) => d !== 'auto').length, switches, 'every switch that happened is recorded, nothing else');
    const before = JSON.stringify(f.roster.map((m) => [m.id, m.xp, m.level, m.dev?.mastery?.clash || 0]));
    const r = F.resolveEncounter(f); assert.equal(r.ok, true, r.reason);
    assert.equal(r.result.stateHash, s.result.stateHash, `seed ${seed}: the settled battle is the session's battle`);
    assert.equal(r.result.winner, s.result.winner);
    const after = JSON.stringify(f.roster.map((m) => [m.id, m.xp, m.level, m.dev?.mastery?.clash || 0]));
    assert.notEqual(after, before, 'the battle\'s rewards were applied');
    const again = F.resolveEncounter(f); assert.equal(again.already, true, 'a second settle does nothing');
    assert.equal(JSON.stringify(f.roster.map((m) => [m.id, m.xp, m.level, m.dev?.mastery?.clash || 0])), after, 'rewards are applied exactly once');
  }
});

test('a reload mid-battle resumes at the exchange the player reached, with the switches already made, and finishes identically', () => {
  const f = tuesday(41); F.startEncounter(f, 0, { mode: 'watch' }); const e = f.week.encounter;
  const s = F.encounterSession(f); let k = 0;
  while (!s.done && k++ < 7) { const r = s.view.rotation; if (r.exchangesLeft === 0 && r.reserves.length) s.request(r.reserves[0].id); const asked = s.queued; const v = s.advance(); recordSessionStep(e, { ex: r.ex, asked, view: v }); }
  const mid = s.view;
  const g = Save.importJson(Save.exportJson(f)); const s2 = F.encounterSession(g);
  assert.equal(s2.view.exchanges, mid.exchanges, 'the reloaded battle is at the same exchange');
  assert.deepEqual(s2.view.log, mid.log, 'with exactly the same events so far');
  playWatch(g, s2, 0); playWatch(f, s, 0);
  assert.equal(s2.result.stateHash, s.result.stateHash, 'and it finishes the same way');
});

test('an unresolved Watch battle saved under the old prompt model continues as one continuous battle', () => {
  const f = tuesday(51); F.startEncounter(f, 0, { mode: 'watch' }); const e = f.week.encounter;
  e.policies = { a: 'manual', b: 'ai' }; // as a save from before Task 10 would have it
  upgradeUnresolvedRecord(e); assert.equal(e.policies.a, 'player');
  const r = F.resolveEncounter(f); assert.equal(r.ok, true, r.reason); assert.ok(!r.result.pending, 'it settles without a prompt');
});

test('Skip stays the AI-run battle; Watch with Auto rotations from the start is the same battle', () => {
  const a = tuesday(61); F.startEncounter(a, 0, { mode: 'skip' }); const ra = F.resolveEncounter(a);
  const b = tuesday(61); F.startEncounter(b, 0, { mode: 'watch' }); const e = b.week.encounter; const s = F.encounterSession(b); s.auto();
  while (!s.done) { const r = s.view.rotation; const asked = s.queued; const v = s.advance(); recordSessionStep(e, { ex: r?.ex, asked, view: v }); }
  const rb = F.resolveEncounter(b);
  assert.equal(rb.result.winner, ra.result.winner); assert.equal(rb.result.exchanges, ra.result.exchanges);
});

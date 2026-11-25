// Owner 2026-11-24: the crowd cheers a score until the next play, and fans say things in speech bubbles; every line is in en.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { crowdTalk, moodLines, BIG_PLAY_YARDS } from '../src/ui/stadium-crowd.js';
import { stadiumReaction } from '../src/ui/stadium-fx.js';
import { englishText } from '../src/text/index.js';

test('every mood has several lines, all from en.js (crowd.*, separated by |)', () => {
  const en = englishText(); const keys = Object.keys(en).filter((k) => k.startsWith('crowd.'));
  assert.ok(keys.length >= 12);
  for (const k of keys) { const mood = k.slice(6); assert.ok(moodLines(mood).length >= 3, mood); assert.deepEqual(moodLines(mood), en[k].split('|').map((x) => x.trim())); }
});
test('a touchdown: the scoring club\'s fans celebrate, and the other side may groan; visitors speak only when they came', () => {
  const ev = { sim: { result: 'touchdown', yards: 30 }, offenseSide: 'home', text: 'TD' };
  const both = Array.from({ length: 40 }, (_, i) => crowdTalk(ev, { away: 0.3, seed: i }));
  assert.ok(both.every((t) => t[0]?.side === 'home' && t[0].mood === 'td_ours'), 'the home fans celebrate a home touchdown');
  assert.ok(both.some((t) => t[1]?.side === 'away' && t[1].mood === 'td_theirs'), 'visiting fans sometimes groan');
  assert.ok(Array.from({ length: 40 }, (_, i) => crowdTalk(ev, { away: 0, seed: i })).every((t) => t.length === 1), 'no visitors, no visitor bubble');
  const awayTd = crowdTalk({ ...ev, offenseSide: 'away' }, { away: 0.3, seed: 1 }); assert.equal(awayTd[0].side, 'away', 'the visitors celebrate their own score');
  for (const t of both.flat()) assert.ok(moodLines(t.mood).includes(t.text));
});
test('big plays, takeaways, sacks and some first downs; an ordinary play says nothing', () => {
  assert.equal(crowdTalk({ sim: { result: 'complete', yards: BIG_PLAY_YARDS }, offenseSide: 'away', text: 'x' }, { away: 0.3 })[0].mood, 'big_ours');
  assert.equal(crowdTalk({ sim: { result: 'interception', yards: 0 }, offenseSide: 'away', text: 'x' }, { away: 0.3 })[0].side, 'home', 'the defense\'s fans celebrate a takeaway');
  assert.deepEqual(crowdTalk({ sim: { result: 'complete', yards: 4 }, offenseSide: 'home', text: 'x' }), []);
  const fd = Array.from({ length: 60 }, (_, i) => crowdTalk({ sim: { result: 'run', yards: 6 }, offenseSide: 'home', firstDown: true, text: 'x' }, { seed: i }));
  assert.ok(fd.some((t) => t.length) && fd.some((t) => !t.length), 'a first down only sometimes');
});
test('scores are cheered until the next play: touchdowns, field goals and good extra points hold', () => {
  assert.equal(stadiumReaction({ sim: { result: 'touchdown' }, offenseSide: 'home' }).hold, true);
  assert.equal(stadiumReaction({ kind: 'field_goal', scored: true, kicking: 'away' }).hold, true);
  const xp = stadiumReaction({ kind: 'try', good: true, tryTeam: 'away' }); assert.equal(xp.hold, true); assert.equal(xp.side, 'away', 'the visitors\' fans cheer their extra point');
  assert.equal(stadiumReaction({ kind: 'try', good: false, tryTeam: 'home' }), null, 'a missed try is not cheered');
  assert.equal(stadiumReaction({ sim: { result: 'sack' }, offenseSide: 'home' }).hold, undefined, 'a sack is a short reaction');
});
test('the bowl: seats all round in their own unclipped layer under the field; fans behind the near end zone; scrimmage lines stop inside the sideline paint', async () => {
  const { setStadiumScene, bowlDefs } = await import('../src/ui/stadium-fx.js'); const { fieldSvg } = await import('../src/ui/field-view.js'); const { venueFor } = await import('../src/data/stadiums.js');
  const venue = venueFor('Thunder Mesa Blitz', 'k');
  try {
    setStadiumScene(venue, null); const plain = fieldSvg({ venue, ballOn: 40 });
    assert.doesNotMatch(plain, /fv-bowl/, 'no crowd pictures (no canvas here): no bowl');
    const ln = [...plain.matchAll(/<line x1="(-?[\d.]+)" y1="[\d.]+" x2="(-?[\d.]+)" y2="[\d.]+" stroke="#4aa3ff"/g)][0]; assert.ok(ln, 'the line of scrimmage is drawn');
    assert.ok(Math.abs(+ln[1]) < 26.67 + 0.33 - 0.29 && Math.abs(+ln[2]) < 26.67 + 0.33 - 0.29, 'it ends inside the white sideline stripe');
    assert.deepEqual(bowlDefs(), [], 'without a crowd there is nothing to repeat');
  } finally { setStadiumScene(null); }
});

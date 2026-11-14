// Task 10 (owner 2026-11-13): a player-friendly play-by-play. Every snap keeps the situation it started from (down, distance,
// spot, the two calls) as numbers and ids, never as a saved sentence; a loss reads as a loss; a touchdown names both clubs in the
// score. The technical detail (result code, repro) is still on every entry for the technical view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playGame } from '../src/sim/game-runner.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { situationText } from '../src/sim/rules.js';
import { lineText } from '../src/text/index.js';

test('play-by-play: each snap carries its situation; losses, no gain and touchdowns read naturally; repro kept', () => {
  let snaps = 0, losses = 0, tds = 0;
  for (let i = 0; i < 4; i++) {
    const r = playGame({ home: generatedTeam(41 + i, { id: 'h', name: 'Home' }), away: generatedTeam(61 + i, { id: 'a', name: 'Away' }), seed: 71 + i });
    const s = r.state || r;
    for (const e of s.log.filter((x) => x.kind === 'play' && x.repro && x.result)) {
      snaps++; const text = lineText(e);
      assert.ok(e.down >= 1 && e.down <= 4 && e.toGo >= 1 && e.ballOn >= 1 && e.ballOn <= 99, `situation kept: ${JSON.stringify(e)}`);
      assert.ok(typeof e.off === 'string' && typeof e.def === 'string', 'both calls kept as ids');
      assert.match(situationText({ phase: 'scrimmage', down: e.down, toGo: e.toGo, ballOn: e.ballOn }), /^(1st|2nd|3rd|4th) & /);
      assert.ok(!/for -\d/.test(text), `no negative yardage in words: ${text}`);
      assert.ok(!/ it in\. TOUCHDOWN/.test(text), text);
      if (/loss of \d/.test(text)) losses++;
      if (/TOUCHDOWN/.test(text) && e.result === 'touchdown' && !/returns it/.test(text)) { tds++; assert.match(text, /[A-Z]{2,4} \d+-\d+ [A-Z]{2,4}\./, `a touchdown names both clubs: ${text}`); }
    }
  }
  assert.ok(snaps > 150 && losses > 0 && tds > 0, JSON.stringify({ snaps, losses, tds }));
});

test('a saved line whose key has been retired still shows the English it was saved with', () => {
  assert.equal(lineText({ text: 'Ouroborn catches it in. TOUCHDOWN!', tk: 'sim.it_in_touchdown', tv: { player: 'Ouroborn', receiver: 'catches' } }), 'Ouroborn catches it in. TOUCHDOWN!');
});

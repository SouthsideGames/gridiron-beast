// Stadium Polish v1: the shared stadium effects (src/ui/stadium-fx.js). Football stays separate from presentation: a reaction is
// read from a finished play and never changes it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { kickoffRevealHtml, REVEAL_MS, stadiumReaction, stadiumFxLevel, STADIUM_FX_LEVELS, REACTION_MS, LOOKS, lookFor, surroundHtml, introPlateHtml, playStadiumReaction, stopStadiumReaction, resumeStadiumReaction, introReaction } from '../src/ui/stadium-fx.js';
import { ENVIRONMENTS, STADIUMS, venueFor } from '../src/data/stadiums.js';
import { fieldSvg } from '../src/ui/field-view.js';
import { DEVICE_SETTING_KEYS } from '../src/ui/device-settings.js';

const play = (result, offenseSide, { sim = {}, ...rest } = {}) => ({ ...rest, sim: { result, stats: {}, ...sim }, offenseSide });

test('touchdowns, interceptions, sacks and made field goals each get their own reaction, sized by the approved durations', () => {
  assert.deepEqual(stadiumReaction(play('touchdown', 'home')), { kind: 'td', level: 'major', side: 'home', ms: 2600 });
  assert.deepEqual(stadiumReaction(play('interception', 'away')), { kind: 'int', level: 'major', side: 'home', ms: 1300 });
  assert.deepEqual(stadiumReaction(play('sack', 'away')), { kind: 'sack', level: 'minor', side: 'home', ms: 600 });
  assert.deepEqual(stadiumReaction({ kind: 'field_goal', scored: true, kicking: 'home', offenseSide: 'home' }), { kind: 'fg', level: 'major', side: 'home', ms: 1300 });
  assert.ok(REACTION_MS.td >= 2000 && REACTION_MS.td <= 3000 && REACTION_MS.int >= 1000 && REACTION_MS.int <= 1500 && REACTION_MS.fumble >= 800 && REACTION_MS.fumble <= 1200 && REACTION_MS.sack >= 400 && REACTION_MS.sack <= 700 && REACTION_MS.fg >= 1000 && REACTION_MS.fg <= 1500);
  assert.ok(REACTION_MS.sack < REACTION_MS.int && REACTION_MS.int < REACTION_MS.td, 'a sack is smaller than a turnover, a turnover smaller than a touchdown');
});
test('a missed field goal, a routine play and a play with no event get no reaction', () => {
  assert.equal(stadiumReaction({ kind: 'field_goal', scored: false, kicking: 'home', offenseSide: 'home' }), null);
  assert.equal(stadiumReaction(play('tackle', 'home')), null); assert.equal(stadiumReaction(play('incomplete', 'away')), null);
  assert.equal(stadiumReaction(null), null); assert.equal(stadiumReaction({}), null);
});
test('a fumble the offense keeps is the impact only; a lost fumble adds the stronger recovery pulse for the team that took it', () => {
  const kept = stadiumReaction(play('tackle', 'home', { sim: { stats: { fumbledBy: 'RB', recoveredTeam: 'off' } } }));
  assert.equal(kept.kind, 'fumble'); assert.equal(kept.level, 'minor'); assert.equal(kept.side, 'away');
  const lost = stadiumReaction(play('fumble', 'home', { sim: { stats: { fumbledBy: 'RB', recoveredTeam: 'def' } } }));
  assert.equal(lost.kind, 'fumble-lost'); assert.equal(lost.level, 'major'); assert.equal(lost.side, 'away', 'the visitors recovered it');
  assert.ok(lost.ms > kept.ms);
});
test('the home club gets the full celebration; the visitors get a smaller, shorter one', () => {
  const home = stadiumReaction(play('touchdown', 'home')), away = stadiumReaction(play('touchdown', 'away'));
  assert.equal(home.side, 'home'); assert.equal(away.side, 'away'); assert.ok(away.ms < home.ms);
  assert.equal(stadiumReaction(play('interception', 'home')).side, 'away', 'an interception belongs to the defense');
  assert.equal(stadiumReaction({ kind: 'kickoff', scored: { team: 'away' }, offenseSide: 'home', sim: {} }).side, 'away', 'a kick-return touchdown belongs to the team that scored');
});
test('a reaction never touches the play it reads', () => {
  const ev = play('touchdown', 'home'); const before = JSON.stringify(ev); stadiumReaction(ev); assert.equal(JSON.stringify(ev), before);
});
test('Stadium Effects: Full by default, Reduced and Off as chosen, and Reduce Motion turns the movement off', () => {
  assert.deepEqual([...STADIUM_FX_LEVELS], ['full', 'reduced', 'off']);
  assert.equal(stadiumFxLevel(null), 'full'); assert.equal(stadiumFxLevel({}), 'full'); assert.equal(stadiumFxLevel({ stadiumEffects: 'nonsense' }), 'full');
  assert.equal(stadiumFxLevel({ stadiumEffects: 'reduced' }), 'reduced'); assert.equal(stadiumFxLevel({ stadiumEffects: 'off' }), 'off');
  assert.equal(stadiumFxLevel({ stadiumEffects: 'full', reducedMotion: true }), 'off');
  assert.ok(DEVICE_SETTING_KEYS.includes('stadiumEffects'), 'the choice belongs to the device, like the other display settings');
});
test('reactions play one at a time, replace each other, follow the level, survive a rebuilt screen and clean up', async () => {
  const box = () => ({ dataset: {}, get offsetWidth() { return 1; } }); const a = box();
  assert.equal(playStadiumReaction(a, stadiumReaction(play('sack', 'away')), 'off'), false); assert.equal(a.dataset.sfx, undefined);
  assert.equal(playStadiumReaction(a, stadiumReaction(play('sack', 'away')), 'reduced'), false, 'Reduced keeps the major reactions only');
  assert.equal(playStadiumReaction(a, stadiumReaction(play('touchdown', 'home')), 'reduced'), true); assert.equal(a.dataset.sfx, 'td'); assert.equal(a.dataset.sfxSide, 'home');
  assert.equal(playStadiumReaction(a, stadiumReaction(play('interception', 'home')), 'full'), true); assert.equal(a.dataset.sfx, 'int'); assert.equal(a.dataset.sfxSide, 'away');
  const b = box(); assert.equal(resumeStadiumReaction(b), true); assert.equal(b.dataset.sfx, 'int', 'a rebuilt screen carries the reaction on');
  stopStadiumReaction(); assert.equal(b.dataset.sfx, undefined); assert.equal(resumeStadiumReaction(box()), false);
  const c = box(); playStadiumReaction(c, { ...introReaction(), ms: 20 }, 'full'); assert.equal(c.dataset.sfx, 'intro');
  await new Promise((r) => setTimeout(r, 160)); assert.equal(c.dataset.sfx, undefined, 'a reaction ends by itself');
});
test('every look names a real field, and a stadium without a look is left exactly as it was', () => {
  for (const [env, look] of Object.entries(LOOKS)) { assert.ok(ENVIRONMENTS[env], env); assert.equal(look.colors.length, 3); assert.ok(look.intro && look.label); }
  assert.equal(lookFor('toString'), null); assert.equal(surroundHtml({ env: 'grass' }), ''); assert.equal(surroundHtml(null), '');
  const plain = fieldSvg({ venue: { env: 'grass', weather: 'clear' }, ballOn: 95 }); assert.doesNotMatch(plain, /sfx-/);
  for (const club of Object.keys(STADIUMS)) assert.ok(ENVIRONMENTS[venueFor(club, 'k').env], `${club} still has its stadium`);
});
test('Electric (Storm Stadium): crowd stands, current cycling between the sideline markers, and current between the goal post uprights', () => {
  const venue = venueFor('Stormport Bolts', 'k'); assert.equal(venue.env, 'storm'); assert.equal(venue.type, 'Electric', 'the field keeps its type');
  const s = surroundHtml(venue); for (const part of ['sfx-far', 'sfx-crowd', 'sfx-cheer-home', 'sfx-cheer-away', 'sfx-rail', 'sfx-channel', 'sfx-flash', 'sfx-edge', 'sfx-lap']) assert.ok(s.includes(part), part);
  assert.ok((s.match(/sfx-anim/g) || []).length < 120, 'a bounded number of moving pieces');
  assert.doesNotMatch(s, /sfx-near/, 'one stand, above the field');
  assert.match(introPlateHtml(venue), /The Bolt Yard/); assert.equal(introPlateHtml({ env: 'grass' }), '');
  const mid = fieldSvg({ venue, ballOn: 50 }); assert.match(mid, /sfx-chain/, 'current jumps between the sideline markers'); assert.match(mid, /sfx-node/); assert.doesNotMatch(mid, /sfx-post/);
  const delays = new Set([...mid.matchAll(/sfx-chain sfx-anim" style="animation-delay:-([\d.]+)s/g)].map((m) => m[1])); assert.ok(delays.size >= 4, 'the jumps take turns, so the electricity cycles along the sideline');
  const goal = fieldSvg({ venue, ballOn: 92 }); assert.match(goal, /class="sfx-post"/); assert.equal((goal.match(/sfx-post-arc/g) || []).length, 3);
});
test('the stylesheet drives the three levels and the reactions, and stops ambient movement when the app is inactive', () => {
  const css = fs.readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8');
  for (const need of ['html[data-stadium-fx="reduced"]', 'html[data-stadium-fx="off"]', '[data-sfx="td"]', '[data-sfx="int"]', '[data-sfx="sack"]', '[data-sfx="fg"]', '[data-sfx="fumble-lost"]', '[data-sfx-side="away"]', 'html[data-app-inactive="1"]']) assert.ok(css.includes(need), need);
  const block = css.slice(css.indexOf('Stadium Polish v1')); assert.doesNotMatch(block, /blur\(|backdrop-filter/, 'no full-screen blur or backdrop filter');
});

// Owner review, 22 November: the stands hold a generated crowd whose colours follow how the two clubs are doing.
test('the crowd: mostly home colours, more visitors and empty seats when the home club is losing, a full house for big games', async () => {
  const { crowdMix, crowdSeats, winShare, crowdFor, crowdImages, CROWD_COLS, CROWD_ROWS } = await import('../src/ui/stadium-crowd.js');
  assert.equal(winShare(null), 0.5); assert.equal(winShare({ w: 1, l: 0 }), 0.5, 'one game is not a season'); assert.equal(winShare({ w: 6, l: 2 }), 0.75);
  const even = crowdMix({ home: { w: 4, l: 4 }, away: { w: 4, l: 4 } }); assert.ok(even.home > even.away * 3, 'an ordinary game is a home crowd with a sprinkle of visitors');
  const bad = crowdMix({ home: { w: 1, l: 7 }, away: { w: 7, l: 1 } }); assert.ok(bad.away > bad.home, 'a 1-7 club hosting a 7-1 club is outnumbered'); assert.ok(bad.fill < even.fill, 'and has empty seats');
  const good = crowdMix({ home: { w: 7, l: 1 }, away: { w: 1, l: 7 } }); assert.ok(good.home > even.home && good.fill > even.fill);
  for (const m of [even, bad, good]) { assert.ok(m.home + m.away <= 1 && m.home > 0 && m.away > 0 && m.fill >= 0.55 && m.fill <= 1); }
  assert.equal(crowdMix({ home: { w: 1, l: 7 }, away: { w: 7, l: 1 }, event: 'playoff' }).fill, 1); assert.equal(crowdMix({ event: 'rival' }).fill, 1);
  const count = (seats) => { const n = { h: 0, a: 0, n: 0, '': 0 }; for (const row of seats) for (const s of row) n[s]++; return n; };
  const a = crowdSeats(77, bad, 'far'), b = crowdSeats(77, bad, 'far'); assert.deepEqual(a, b, 'the same game always shows the same crowd');
  assert.equal(a.length, CROWD_ROWS); assert.equal(a[0].length, CROWD_COLS); assert.notDeepEqual(a, crowdSeats(78, bad, 'far'));
  const nb = count(a), ng = count(crowdSeats(77, good, 'far')); assert.ok(nb.a > nb.h); assert.ok(ng.h > ng.a * 3); assert.ok(nb[''] > ng['']);
  const c = crowdFor({ seed: 1, homeColor: '#111111', awayColor: '#222222', homeRecord: { w: 1, l: 7 }, awayRecord: { w: 7, l: 1 } }); assert.deepEqual(c.mix, bad);
  assert.equal(crowdImages({ ...c, stand: 'far' }), null, 'without a canvas the stand is simply not drawn');
});

test('the kickoff reveal: a strike and the football for Electric, simpler at Reduced, nothing at Off or in a stadium without one', () => {
  const venue = venueFor('Stormport Bolts', 'k'); const full = kickoffRevealHtml(venue, 'full');
  assert.match(full, /sfx-strike/); assert.match(full, /sfx-ball/); assert.match(full, /Tap to skip/);
  const reduced = kickoffRevealHtml(venue, 'reduced'); assert.match(reduced, /sfx-ball/); assert.doesNotMatch(reduced, /sfx-strike|sfx-whiteout/);
  assert.equal(kickoffRevealHtml(venue, 'off'), ''); assert.equal(kickoffRevealHtml({ env: 'grass' }, 'full'), '');
  assert.ok(REVEAL_MS.full <= 2000 && REVEAL_MS.reduced < REVEAL_MS.full, 'short, and shorter when reduced');
});

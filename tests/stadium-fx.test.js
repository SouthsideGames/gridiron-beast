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
test('Electric (Storm Stadium): current cycling between the sideline markers and between the goal post uprights', () => {
  const venue = venueFor('Stormport Bolts', 'k'); assert.equal(venue.env, 'storm'); assert.equal(venue.type, 'Electric', 'the field keeps its type');
  const s = surroundHtml(venue); for (const part of ['sfx-edge', 'sfx-lap']) assert.ok(s.includes(part), part);
  assert.doesNotMatch(s, /sfx-band|sfx-crowd/, 'no screen-fixed stands: the crowd belongs to the field');
  assert.match(introPlateHtml(venue), /The Bolt Yard/); assert.equal(introPlateHtml({ env: 'grass' }), '');
  const mid = fieldSvg({ venue, ballOn: 50 }); assert.match(mid, /sfx-chain/, 'current jumps between the sideline markers'); assert.match(mid, /sfx-node/); assert.doesNotMatch(mid, /sfx-post/);
  const delays = new Set([...mid.matchAll(/sfx-chain sfx-anim" style="animation-delay:-([\d.]+)s/g)].map((m) => m[1])); assert.ok(delays.size >= 4, 'the jumps take turns, so the electricity cycles along the sideline');
  const goal = fieldSvg({ venue, ballOn: 92 }); assert.match(goal, /class="sfx-post"/); assert.equal((goal.match(/sfx-post-arc/g) || []).length, 3);
});
test('the stand: behind the far end zone only, in view only near it, and the field ends at the end line without a stadium scene', async () => {
  const { setStadiumScene, standsDepth, STANDS_DEPTH, STANDS_GAP, STANDS_ROWS, FOOTBALL } = await import('../src/ui/stadium-fx.js'); const { cameraFor } = await import('../src/ui/field-view.js');
  const venue = venueFor('Stormport Bolts', 'k');
  try {
    assert.equal(standsDepth(), 0); assert.deepEqual(cameraFor(95), { bottom: 64, top: 110 }); assert.deepEqual(cameraFor(2), { bottom: -10, top: 36 });
    assert.equal(setStadiumScene({ env: 'grass' }), null, 'a plain stadium has no scene'); assert.equal(standsDepth(), 0);
    setStadiumScene(venue, null); assert.equal(standsDepth(), STANDS_DEPTH); assert.equal(STANDS_ROWS, 6, 'three rows of two yards'); assert.equal(STANDS_GAP, 5, 'white paint, grass and the barrier between the end line and the stands'); assert.equal(STANDS_DEPTH, 11);
    assert.deepEqual(cameraFor(50), { bottom: 35, top: 81 }, 'midfield is unchanged: no crowd in sight');
    assert.deepEqual(cameraFor(79), { bottom: 64, top: 110 }, 'the end line is just reached');
    assert.equal(cameraFor(82).top, 113, 'first the white and the grass behind the end line'); assert.equal(cameraFor(85).top, 116, 'then the stand comes into view'); assert.equal(cameraFor(99).top, 121, 'and never more than its three rows');
    assert.doesNotMatch(fieldSvg({ venue, ballOn: 50 }), /sfx-stand|sfx-wall/); assert.doesNotMatch(fieldSvg({ venue, ballOn: 79 }), /sfx-stand/);
    const near = fieldSvg({ venue, ballOn: 92 }); assert.match(near, /sfx-stand/); assert.ok(near.indexOf('sfx-border') < near.indexOf('sfx-apron') && near.indexOf('sfx-apron') < near.indexOf('sfx-barrier') && near.indexOf('sfx-barrier') < near.indexOf('sfx-stand') && near.indexOf('sfx-stand') < near.indexOf('class="sfx-post"'), 'white paint, grass, the barrier, then the crowd, with the goal posts in front');
    assert.match(fieldSvg({ venue, ballOn: 82 }), /sfx-apron/); assert.doesNotMatch(fieldSvg({ venue, ballOn: 82 }), /sfx-crowd-img|class="sfx-stand"><rect[^>]*y="0"/);
    const own = fieldSvg({ venue, ballOn: 2 }); assert.match(own, /sfx-wall/); assert.doesNotMatch(own, /sfx-stand/, 'no crowd behind the near end zone');
    const full = kickoffRevealHtml(venue, 'full'); assert.ok(full.includes(`rx="${FOOTBALL.rx}" ry="${FOOTBALL.ry}" fill="${FOOTBALL.fill}"`), 'the reveal shows the game\'s own football');
    assert.match(fieldSvg({ venue, ballOn: 30, frame: { ball: [0, 0, 0], off: [], def: [] } }), new RegExp(`rx="${FOOTBALL.rx}" ry="${FOOTBALL.ry}" fill="${FOOTBALL.fill}"`));
  } finally { setStadiumScene(null); }
  assert.deepEqual(cameraFor(95), { bottom: 64, top: 110 }, 'leaving the game restores the plain camera');
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

// Checkpoint B: Fire, Water and Grass use the same frame as Electric; only the data differs.
test('Fire, Water and Grass: each look sits on its existing field, keeps the field type, and has its own edge, posts and kickoff reveal', async () => {
  const { edgeSvg, postsSvg } = await import('../src/ui/stadium-fx.js');
  const expect = { storm: ['Electric', 'Stormport Bolts', 'Electric', /sfx-chain/, /sfx-post-arc/, /sfx-strike/], volcanic: ['Fire', 'Ember City Beasts', 'Fire', /sfx-flame/, /sfx-flame/, /sfx-rise/], tidal: ['Water', 'Harbor Sentinels', 'Water', /sfx-shot/, /sfx-post-arc/, /sfx-drop/], forest: ['Grass', 'Bayou Stalkers', 'Nature', /sfx-vine/, /sfx-vine/, /sfx-swirl/] };
  assert.deepEqual(Object.keys(LOOKS).sort(), Object.keys(expect).sort());
  for (const [env, [label, club, type, edge, posts, reveal]] of Object.entries(expect)) {
    const venue = venueFor(club, 'k'); assert.equal(venue.env, env, `${club} plays in ${env}`); assert.equal(venue.type, type, 'the field type and its bonus are untouched'); assert.equal(LOOKS[env].label, label);
    const cam = { bottom: 35, top: 81 }; const e = edgeSvg(env, cam, 27, (y) => cam.top - y, 46); assert.match(e, edge, `${env} edge`);
    assert.ok((e.match(/sfx-anim/g) || []).length <= 80, `${env}: a bounded number of moving pieces along the sidelines`);
    assert.match(postsSvg(env, 0.6, 1), posts, `${env} posts`); assert.match(kickoffRevealHtml(venue, 'full'), reveal, `${env} reveal`);
    assert.match(kickoffRevealHtml(venue, 'full'), /sfx-ball/); assert.match(introPlateHtml(venue), new RegExp(LOOKS[env].intro));
    assert.doesNotMatch(fieldSvg({ venue, ballOn: 50 }), /venue-detail|venue-bolt/, 'the older sideline decor is replaced, not doubled');
  }
  assert.equal(edgeSvg('grass', { bottom: 35, top: 81 }, 27, (y) => 81 - y, 46), ''); assert.equal(postsSvg('frozen', 0.6, 1), '');
});

// Revision 5: the white paint around the field, the barrier in front of the fans, markers on the white, Water's drop.
test('the white border: all round the field in a stadium scene, the sideline markers stand on it, and the picture is wider by it; nothing changes without a scene', async () => {
  const { setStadiumScene, fieldBorder, FIELD_BORDER, borderSvg, barrierSvg, edgeSvg, postsSvg } = await import('../src/ui/stadium-fx.js'); const { fieldViewBox, FIELD_VIEWBOX } = await import('../src/ui/field-view.js'); const { MatchCamera } = await import('../src/ui/match-camera.js');
  const venue = venueFor('Harbor Sentinels', 'k'); const cam = { bottom: 35, top: 81 }; const Y = (y) => cam.top - y;
  assert.equal(fieldBorder(), 0); assert.equal(fieldViewBox(), FIELD_VIEWBOX); assert.equal(borderSvg(cam, 27, Y), ''); assert.equal(barrierSvg(venue, -27, 0, 54), '');
  assert.doesNotMatch(fieldSvg({ venue, ballOn: 50 }), /sfx-border/); const xOld = Number(/cx="(-?[\d.]+)"/.exec(edgeSvg('tidal', cam, 27, Y, 46))[1]); assert.ok(Math.abs(xOld) < 27, 'without a scene the markers are where they were');
  try {
    setStadiumScene(venue, { homeColor: '#123456', awayColor: '#654321', seed: 1, mix: { home: .7, away: .2, fill: 1 } });
    assert.equal(fieldBorder(), FIELD_BORDER); const vb = fieldViewBox().split(' ').map(Number), plain = FIELD_VIEWBOX.split(' ').map(Number);
    assert.ok(Math.abs(vb[2] - (plain[2] + FIELD_BORDER * 2)) < 1e-9, 'the picture is wider by the white on both sides'); assert.equal(vb[3], plain[3]);
    const mid = fieldSvg({ venue, ballOn: 50 }); assert.match(mid, /sfx-border/); assert.ok(mid.indexOf('sfx-border') < mid.indexOf('sfx-shot'), 'the markers are drawn on the white');
    const hw = -plain[0]; for (const m of edgeSvg('tidal', cam, hw, Y, 46).matchAll(/<circle class="sfx-shot[^>]* cx="(-?[\d.]+)"/g)) assert.ok(Math.abs(Number(m[1])) > hw && Math.abs(Number(m[1])) < hw + FIELD_BORDER, 'each spout stands on the white, outside the sideline');
    assert.match(barrierSvg(venue, -29, 0, 58), /fill="#123456"/, 'the barrier wears the home colour');
    const own = fieldSvg({ venue, ballOn: 2 }); assert.match(own, /sfx-barrier/); assert.match(own, /sfx-wall/);
    const c = new MatchCamera(); const z = c.sample({ bottom: 35, top: 81 }, { key: 1, auto: true, reducedMotion: true, pad: 3.5 }); assert.deepEqual(z, { bottom: -13.5, top: 113.5 }, 'zoomed out, the white behind both end lines is in view');
    assert.deepEqual(new MatchCamera().sample({ bottom: 35, top: 81 }, { key: 1, auto: true, reducedMotion: true }), { bottom: -10, top: 110 }, 'and without a scene the zoomed-out view is the field as before');
  } finally { setStadiumScene(null); }
  assert.match(kickoffRevealHtml(venue, 'full'), /sfx-drop/, 'Water: a giant drop from the sky'); assert.doesNotMatch(kickoffRevealHtml(venue, 'reduced'), /sfx-drop/);
  const css = fs.readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8'); for (const k of ['sfx-shot', 'sfx-drop', 'sfx-splash']) assert.match(css, new RegExp(`@keyframes ${k}\\b`));
});

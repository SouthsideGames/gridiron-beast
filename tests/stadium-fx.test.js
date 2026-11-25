// Stadium Polish v1: the shared stadium effects (src/ui/stadium-fx.js). Football stays separate from presentation: a reaction is
// read from a finished play and never changes it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DESIGN_FIELDS as DESIGNS } from '../src/data/stadium-designs.js';
import { kickoffRevealHtml, REVEAL_MS, stadiumReaction, stadiumFxLevel, STADIUM_FX_LEVELS, REACTION_MS, LOOKS, lookFor, surroundHtml, introPlateHtml, playStadiumReaction, stopStadiumReaction, resumeStadiumReaction, introReaction } from '../src/ui/stadium-fx.js';
import { ENVIRONMENTS, STADIUMS, venueFor } from '../src/data/stadiums.js';
import { fieldSvg } from '../src/ui/field-view.js';
import { DEVICE_SETTING_KEYS } from '../src/ui/device-settings.js';

const play = (result, offenseSide, { sim = {}, ...rest } = {}) => ({ ...rest, sim: { result, stats: {}, ...sim }, offenseSide });

test('touchdowns, interceptions, sacks and made field goals each get their own reaction, sized by the approved durations', () => {
  assert.deepEqual(stadiumReaction(play('touchdown', 'home')), { kind: 'td', level: 'major', side: 'home', ms: 2600, hold: true }, 'a score is cheered until the next play (owner 2026-11-24)');
  assert.deepEqual(stadiumReaction(play('interception', 'away')), { kind: 'int', level: 'major', side: 'home', ms: 1300 });
  assert.deepEqual(stadiumReaction(play('sack', 'away')), { kind: 'sack', level: 'minor', side: 'home', ms: 600 });
  assert.deepEqual(stadiumReaction({ kind: 'field_goal', scored: true, kicking: 'home', offenseSide: 'home' }), { kind: 'fg', level: 'major', side: 'home', ms: 1300, hold: true });
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
// 2026-11-22 (owner): every home field has the white paint, barrier, crowd and reactions, so plain grass has a look of its own
// ('Home'): the surround and the stands, and none of a Gym Leader's markers, posts or kickoff reveal.
test('every look names a real field; plain grass has the plain look, and without a stadium scene a field is drawn exactly as it was', () => {
  for (const [env, look] of Object.entries(LOOKS)) { assert.ok(ENVIRONMENTS[env] || DESIGNS[env], env); assert.equal(look.colors.length, 3); assert.ok(look.intro && look.label); }
  assert.equal(lookFor('toString'), null); assert.match(surroundHtml({ env: 'grass' }), /stadium-surround sfx-grass/); assert.equal(surroundHtml(null), '');
  assert.equal(LOOKS.grass.plain, true); assert.equal(LOOKS.grass.edge, null); assert.equal(LOOKS.grass.posts, null); assert.equal(LOOKS.grass.reveal, null); assert.equal(Object.values(LOOKS).filter((l) => l.plain).length, 1);
  const plain = fieldSvg({ venue: { env: 'grass', weather: 'clear' }, ballOn: 95 }); assert.doesNotMatch(plain, /sfx-/);
  for (const club of Object.keys(STADIUMS)) assert.ok(ENVIRONMENTS[venueFor(club, 'k').env], `${club} still has its stadium`);
});
test('Electric (Storm Stadium): current cycling between the sideline markers and between the goal post uprights', () => {
  const venue = venueFor('Thunder Mesa Blitz', 'k'); assert.equal(venue.env, 'storm'); assert.equal(venue.type, 'Electric', 'the field keeps its type');
  const s = surroundHtml(venue); for (const part of ['sfx-edge', 'sfx-lap']) assert.ok(s.includes(part), part);
  assert.doesNotMatch(s, /sfx-band|sfx-crowd/, 'no screen-fixed stands: the crowd belongs to the field');
  assert.match(introPlateHtml(venue), /Thunderhead Stadium/); assert.match(introPlateHtml(venueFor('Goldhaven Royals', 'k')), /Crownfield Stadium/, 'a grass stadium is announced by name too'); assert.doesNotMatch(introPlateHtml(venueFor('Goldhaven Royals', 'k')), /current|mountain|tide/i);
  const mid = fieldSvg({ venue, ballOn: 50 }); assert.match(mid, /sfx-chain/, 'current jumps between the sideline markers'); assert.match(mid, /sfx-node/); assert.doesNotMatch(mid, /sfx-post/);
  const delays = new Set([...mid.matchAll(/sfx-chain sfx-anim" style="animation-delay:-([\d.]+)s/g)].map((m) => m[1])); assert.ok(delays.size >= 4, 'the jumps take turns, so the electricity cycles along the sideline');
  const goal = fieldSvg({ venue, ballOn: 92 }); assert.match(goal, /class="sfx-post"/); assert.equal((goal.match(/sfx-post-arc/g) || []).length, 3);
});
test('the stand: behind the far end zone only, in view only near it, and the field ends at the end line without a stadium scene', async () => {
  const { setStadiumScene, standsDepth, STANDS_DEPTH, STANDS_GAP, STANDS_ROWS, FOOTBALL } = await import('../src/ui/stadium-fx.js'); const { cameraFor } = await import('../src/ui/field-view.js');
  const venue = venueFor('Thunder Mesa Blitz', 'k');
  try {
    assert.equal(standsDepth(), 0); assert.deepEqual(cameraFor(95), { bottom: 64, top: 110 }); assert.deepEqual(cameraFor(2), { bottom: -10, top: 36 });
    assert.equal(setStadiumScene({ env: 'nowhere' }), null, 'an unknown field has no scene'); assert.equal(standsDepth(), 0);
    { setStadiumScene({ env: 'grass' }, null); assert.equal(standsDepth(), STANDS_DEPTH, 'a grass stadium has the same stands'); const g = fieldSvg({ venue: { env: 'grass', weather: 'clear' }, ballOn: 92 }); for (const part of ['sfx-border', 'sfx-apron', 'sfx-barrier', 'sfx-stand']) assert.match(g, new RegExp(part), `grass: ${part}`); assert.doesNotMatch(g, /class="sfx-post"|sfx-chain|sfx-node/, 'and none of a Gym Leader\'s posts or markers'); setStadiumScene(null); assert.equal(standsDepth(), 0); }
    setStadiumScene(venue, null); assert.equal(standsDepth(), STANDS_DEPTH); assert.equal(STANDS_ROWS, 6, 'three rows of two yards'); assert.equal(STANDS_GAP, 8, 'white paint, five yards of green and the barrier between the end line and the stands'); assert.equal(STANDS_DEPTH, 14);
    assert.deepEqual(cameraFor(50), { bottom: 35, top: 81 }, 'midfield is unchanged: no crowd in sight');
    assert.deepEqual(cameraFor(79), { bottom: 64, top: 110 }, 'the end line is just reached');
    assert.equal(cameraFor(82).top, 113, 'first the white and the grass behind the end line'); assert.equal(cameraFor(88).top, 119, 'then the stand comes into view'); assert.equal(cameraFor(99).top, 124, 'and never more than its three rows');
    assert.doesNotMatch(fieldSvg({ venue, ballOn: 50 }), /sfx-stand|sfx-wall/); assert.doesNotMatch(fieldSvg({ venue, ballOn: 79 }), /sfx-stand/);
    const near = fieldSvg({ venue, ballOn: 92 }); assert.match(near, /sfx-stand/); assert.ok(near.indexOf('sfx-border') < near.indexOf('sfx-apron') && near.indexOf('sfx-apron') < near.indexOf('sfx-barrier') && near.indexOf('sfx-barrier') < near.indexOf('sfx-stand') && near.indexOf('sfx-stand') < near.indexOf('class="sfx-post"'), 'white paint, grass, the barrier, then the crowd, with the goal posts in front');
    assert.match(fieldSvg({ venue, ballOn: 82 }), /sfx-apron/); assert.doesNotMatch(fieldSvg({ venue, ballOn: 82 }), /sfx-crowd-img|class="sfx-stand"><rect[^>]*y="0"/);
    const own = fieldSvg({ venue, ballOn: 2 }); assert.match(own, /sfx-barrier/, 'the barrier closes the picture behind the near end zone'); assert.doesNotMatch(own, /sfx-stand|sfx-wall/, 'no crowd there, and the stand behind the barrier is drawn only when it is in view');
    assert.match(fieldSvg({ venue, ballOn: 2, camera: { bottom: -21, top: 25 } }), /sfx-stand sfx-stand-near/, 'fans (seen from behind) behind the near end zone, not a bare wall (owner 2026-11-24)');
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
  const venue = venueFor('Thunder Mesa Blitz', 'k'); const full = kickoffRevealHtml(venue, 'full');
  assert.match(full, /sfx-strike/); assert.match(full, /sfx-ball/); assert.match(full, /Tap to skip/);
  const reduced = kickoffRevealHtml(venue, 'reduced'); assert.match(reduced, /sfx-ball/); assert.doesNotMatch(reduced, /sfx-strike|sfx-whiteout/);
  assert.equal(kickoffRevealHtml(venue, 'off'), ''); assert.equal(kickoffRevealHtml({ env: 'grass' }, 'full'), '');
  assert.ok(REVEAL_MS.full <= 2000 && REVEAL_MS.reduced < REVEAL_MS.full, 'short, and shorter when reduced');
});

// Checkpoint B: Fire, Water and Grass use the same frame as Electric; only the data differs.
test('Fire, Water and Grass: each look sits on its existing field, keeps the field type, and has its own edge, posts and kickoff reveal', async () => {
  const { edgeSvg, postsSvg } = await import('../src/ui/stadium-fx.js');
  const expect = { storm: ['Electric', 'Thunder Mesa Blitz', 'Electric', /sfx-chain/, /sfx-post-arc/, /sfx-strike/], volcanic: ['Fire', 'Emberfall Infernos', 'Fire', /sfx-flame/, /sfx-flame/, /sfx-rise/], tidal: ['Water', 'Harbor Anchors', 'Water', /sfx-shot/, /sfx-post-arc/, /sfx-drop/], forest: ['Grass', 'Westhaven Pirates', 'Nature', /sfx-vine/, /sfx-vine/, /sfx-swirl/],
    frozen: ['Ice', 'Frostpeak Howlers', 'Ice', /sfx-snowman/, /sfx-node/, /sfx-cube-l/], desert: ['Ground', 'Canyon Crushers', 'Earth', /sfx-cactus/, /sfx-drift/, /sfx-pit/], dome: ['Alloy', 'Ironpeak Colossi', 'Metal', /sfx-chain/, /sfx-chain/, /sfx-hatch/],
    dragon: ['Wyrm', 'Palmetto Wyrms', null, /sfx-rock/, /sfx-flame/, /sfx-breath/], shadow: ['Umbral', 'Eastport Phantoms', 'Dark', /sfx-dim/, /sfx-node/, /sfx-moonbeam/], radiant: ['Radiant', 'Sunfire Solars', 'Light', /sfx-dial/, /sfx-turn/, /sfx-dawn/],
    sky: ['Sky', 'Cliffhaven Chargers', null, /sfx-wave/, /sfx-post-arc/, /sfx-shadow/], oracle: ['Oracle', 'Aetheria Seers', null, /sfx-orbit/, /sfx-post-arc/, /sfx-ufo/] }; // the Wind and Psychic gyms (32-club league)
  const designs = { rock: ['Rock', /sfx-tumble/, /sfx-drift/, /sfx-cube-l/, 'Earth'], bug: ['Bug', /sfx-orbit/, /sfx-node/, /sfx-silk/, 'Nature'], specter: ['Specter', /sfx-wisp/, /sfx-post-arc/, /sfx-mist/, 'Dark'], clash: ['Clash', /sfx-twang/, /sfx-node/, /sfx-belt-l/, 'Earth'], corrupt: ['Corrupt', /sfx-shot/, /sfx-drift/, /sfx-pit/, 'Dark'] };
  assert.deepEqual(Object.keys(LOOKS).sort(), [...Object.keys(expect), ...Object.keys(designs), 'grass'].sort());
  for (const [env, [label, club, type, edge, posts, reveal]] of Object.entries(expect)) {
    const venue = venueFor(club, 'k'); assert.equal(venue.env, env, `${club} plays in ${env}`); assert.equal(venue.type, type, 'the field type and its bonus are untouched'); assert.equal(LOOKS[env].label, label);
    const cam = { bottom: 35, top: 81 }; const e = edgeSvg(env, cam, 27, (y) => cam.top - y, 46); assert.match(e, edge, `${env} edge`);
    assert.ok((e.match(/sfx-anim/g) || []).length <= 80, `${env}: a bounded number of moving pieces along the sidelines`);
    assert.match(postsSvg(env, 0.6, 1), posts, `${env} posts`); assert.match(kickoffRevealHtml(venue, 'full'), reveal, `${env} reveal`);
    assert.match(kickoffRevealHtml(venue, 'full'), /sfx-ball/); assert.match(introPlateHtml(venue), new RegExp(club === 'Westhaven Pirates' ? 'The grove meets the tide' : LOOKS[env].intro));
    assert.doesNotMatch(fieldSvg({ venue, ballOn: 50 }), /venue-detail|venue-bolt/, 'the older sideline decor is replaced, not doubled');
  }
  assert.equal(edgeSvg('grass', { bottom: 35, top: 81 }, 27, (y) => 81 - y, 46), ''); assert.equal(postsSvg('grass', 0.6, 1), '');
});

// Revision 5: the white paint around the field, the barrier in front of the fans, markers on the white, Water's drop.
test('the white border: all round the field in a stadium scene, the sideline markers stand on it, and the picture is wider by it; nothing changes without a scene', async () => {
  const { setStadiumScene, fieldBorder, FIELD_BORDER, borderSvg, barrierSvg, edgeSvg, postsSvg } = await import('../src/ui/stadium-fx.js'); const { fieldViewBox, FIELD_VIEWBOX } = await import('../src/ui/field-view.js'); const { MatchCamera } = await import('../src/ui/match-camera.js');
  const venue = venueFor('Harbor Anchors', 'k'); const cam = { bottom: 35, top: 81 }; const Y = (y) => cam.top - y;
  assert.equal(fieldBorder(), 0); assert.equal(fieldViewBox(), FIELD_VIEWBOX); assert.equal(borderSvg(cam, 27, Y), ''); assert.equal(barrierSvg(venue, -27, 0, 54), '');
  assert.doesNotMatch(fieldSvg({ venue, ballOn: 50 }), /sfx-border/); const xOld = Number(/cx="(-?[\d.]+)"/.exec(edgeSvg('tidal', cam, 27, Y, 46))[1]); assert.ok(Math.abs(xOld) < 27, 'without a scene the markers are where they were');
  try {
    setStadiumScene(venue, { homeColor: '#123456', awayColor: '#654321', seed: 1, mix: { home: .7, away: .2, fill: 1 } });
    assert.equal(fieldBorder(), FIELD_BORDER); const vb = fieldViewBox().split(' ').map(Number), plain = FIELD_VIEWBOX.split(' ').map(Number);
    assert.ok(Math.abs(vb[2] - (plain[2] + FIELD_BORDER * 2)) < 1e-9, 'the picture is wider by the white on both sides'); assert.equal(vb[3], plain[3]);
    const mid = fieldSvg({ venue, ballOn: 50 }); assert.match(mid, /sfx-border/); assert.ok(mid.indexOf('sfx-border') < mid.indexOf('sfx-shot'), 'the markers are drawn on the white');
    const hw = -plain[0]; for (const m of edgeSvg('tidal', cam, hw, Y, 46).matchAll(/<circle class="sfx-shot[^>]* cx="(-?[\d.]+)"/g)) assert.ok(Math.abs(Number(m[1])) > hw && Math.abs(Number(m[1])) < hw + FIELD_BORDER, 'each spout stands on the white, outside the sideline');
    assert.match(barrierSvg(venue, -29, 0, 58), /fill="#123456"/, 'the barrier wears the home colour');
    const own = fieldSvg({ venue, ballOn: 2 }); assert.match(own, /sfx-barrier/);
    const c = new MatchCamera(); const z = c.sample({ bottom: 35, top: 81 }, { key: 1, auto: true, reducedMotion: true, pad: 3.5 }); assert.deepEqual(z, { bottom: -13.5, top: 113.5 }, 'zoomed out, the white behind both end lines is in view');
    assert.deepEqual(new MatchCamera().sample({ bottom: 35, top: 81 }, { key: 1, auto: true, reducedMotion: true }), { bottom: -10, top: 110 }, 'and without a scene the zoomed-out view is the field as before');
  } finally { setStadiumScene(null); }
  assert.match(kickoffRevealHtml(venue, 'full'), /sfx-drop/, 'Water: a giant drop from the sky'); assert.doesNotMatch(kickoffRevealHtml(venue, 'reduced'), /sfx-drop/);
  const css = fs.readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8'); for (const k of ['sfx-shot', 'sfx-drop', 'sfx-splash']) assert.match(css, new RegExp(`@keyframes ${k}\\b`));
});

// Monsters in the stands.
test('monsters in the stands: more in some games and fewer in others, deterministic from the seed, leaning to the stadium\'s own type; the seats themselves are unchanged', async () => {
  const { crowdMonsters, crowdSeats, crowdFor, MONSTER_SHARE, monsterShare, TYPE_FUR, CROWD_COLS, CROWD_ROWS } = await import('../src/ui/stadium-crowd.js');
  const a = crowdMonsters(77, 'far', 'Electric'), b = crowdMonsters(77, 'far', 'Electric'); assert.deepEqual(a, b); assert.notDeepEqual(a, crowdMonsters(78, 'far', 'Electric'));
  assert.equal(a.length, CROWD_ROWS); assert.equal(a[0].length, CROWD_COLS);
  let n = 0, own = 0, total = 0; for (let seed = 0; seed < 40; seed++) for (const row of crowdMonsters(seed, 'far', 'Fire')) for (const m of row) { total++; if (m) { n++; if (m.fur === TYPE_FUR.Fire) own++; assert.ok(['ears', 'horns', 'wings', 'antenna', 'crest'].includes(m.shape)); } }
  const shares = Array.from({ length: 200 }, (_, i) => monsterShare(i)); assert.ok(shares.every((v) => v >= MONSTER_SHARE.min && v <= MONSTER_SHARE.max)); assert.ok(Math.min(...shares) < 0.12 && Math.max(...shares) > 0.42, 'some games have few monsters, some have many'); assert.equal(monsterShare(77), monsterShare(77));
  for (const seed of [3, 11, 29]) { const seats = crowdMonsters(seed, 'far', 'Fire').flat(); const got = seats.filter(Boolean).length / seats.length; assert.ok(Math.abs(got - monsterShare(seed)) < 0.14, `seed ${seed}: ${got} against ${monsterShare(seed)}`); } assert.ok(own / n > 0.55 && own / n < 0.75, `home type share ${own / n}`);
  const mix = { home: 0.7, away: 0.18, fill: 0.9 }; assert.deepEqual(crowdSeats(77, mix), crowdSeats(77, mix), 'who sits where does not depend on the monsters');
  assert.equal(crowdFor({ seed: 1, type: 'Water' }).type, 'Water'); assert.equal(crowdFor({ seed: 1 }).type, null);
});

// Checkpoint C: two designs no club plays on yet.
test('Rock, Bug, Specter, Clash and Corrupt are designs only (Sky and Oracle became the Wind and Psychic gyms\' fields): drawn when a venue names them, never a club\'s field, never picked by the game, no type bonus', async () => {
  const { DESIGN_FIELDS, designField } = await import('../src/data/stadium-designs.js'); const { ENVIRONMENTS, STADIUMS } = await import('../src/data/stadiums.js'); const { edgeSvg, postsSvg, setStadiumScene } = await import('../src/ui/stadium-fx.js'); const { TYPE_FUR } = await import('../src/ui/stadium-crowd.js');
  const designs = { rock: ['Rock', /sfx-tumble/, /sfx-drift/, /sfx-cube-l/, 'Earth'], bug: ['Bug', /sfx-orbit/, /sfx-node/, /sfx-silk/, 'Nature'], specter: ['Specter', /sfx-wisp/, /sfx-post-arc/, /sfx-mist/, 'Dark'], clash: ['Clash', /sfx-twang/, /sfx-node/, /sfx-belt-l/, 'Earth'], corrupt: ['Corrupt', /sfx-shot/, /sfx-drift/, /sfx-pit/, 'Dark'] };
  assert.deepEqual(Object.keys(DESIGN_FIELDS).sort(), Object.keys(designs).sort());
  for (const [id, [label, edge, posts, reveal, crowd]] of Object.entries(designs)) {
    const d = designField(id); assert.ok(d); assert.equal(d.type, null, 'no type, so no field bonus'); assert.equal(ENVIRONMENTS[id], undefined, 'not one of the game\'s fields');
    assert.ok(!Object.values(STADIUMS).some((s) => s.env === id), 'no club plays there'); assert.equal(LOOKS[id].label, label); assert.ok(TYPE_FUR[LOOKS[id].crowd] && LOOKS[id].crowd === crowd);
    const venue = { env: id, name: d.name, type: null, weather: 'clear' }; const cam = { bottom: 35, top: 81 };
    assert.match(edgeSvg(id, cam, 27, (y) => 81 - y, 46), edge); assert.match(postsSvg(id, 0.6, 1), posts); assert.match(kickoffRevealHtml(venue, 'full'), reveal); assert.match(introPlateHtml(venue), new RegExp(d.name));
    try { setStadiumScene(venue, null); const svg = fieldSvg({ venue, ballOn: 92 }); assert.ok(svg.includes(d.palette.a), 'its own turf'); assert.match(svg, /sfx-apron/); assert.match(svg, /sfx-stand/); assert.ok(svg.includes('stroke="#eaf3e6"'), 'white yard lines'); assert.doesNotMatch(svg, /NaN|undefined/); } finally { setStadiumScene(null); }
  }
  assert.equal(designField('grass'), null); assert.equal(venueFor('Ashford Cinders', 'k').env, 'grass', 'every club keeps the field it had');
  const css = fs.readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8'); for (const k of ['sfx-wave', 'sfx-tumble', 'sfx-wisp', 'sfx-web', 'sfx-silk', 'sfx-mist', 'sfx-ball-fade', 'sfx-orb-drift', 'sfx-orb-fade', 'sfx-twang', 'sfx-rock', 'sfx-dim', 'sfx-dial', 'sfx-turn', 'sfx-dawn', 'sfx-warm', 'sfx-bell', 'sfx-breath', 'sfx-ball-hot', 'sfx-dark', 'sfx-moonbeam', 'sfx-hatch', 'sfx-door-l', 'sfx-door-r', 'sfx-ball-set', 'sfx-orbit', 'sfx-cube-l', 'sfx-cube-r', 'sfx-crack', 'sfx-pit', 'sfx-ball-pit', 'sfx-ball-float', 'sfx-ufo', 'sfx-beam', 'sfx-ball-late']) assert.match(css, new RegExp(`@keyframes ${k}\\b`));
});

test('Ice has still snowmen on its sidelines: nothing there moves', async () => {
  const { edgeSvg } = await import('../src/ui/stadium-fx.js'); const e = edgeSvg('frozen', { bottom: 35, top: 81 }, 27, (y) => 81 - y, 46);
  assert.equal((e.match(/sfx-snowman/g) || []).length, 10, 'one on each sideline at the 35, 45, 55, 65 and 75 (markers on the 5s, owner 2026-11-24)'); assert.doesNotMatch(e, /sfx-anim/);
});

// Checkpoint D revision.
test('nothing frightening at kickoff: the Bug reveal shows a web and silk, the Specter reveal shows only the football fading in', () => {
  const bug = kickoffRevealHtml({ env: 'bug' }, 'full'), specter = kickoffRevealHtml({ env: 'specter' }, 'full');
  assert.match(bug, /sfx-web/); assert.match(bug, /sfx-silk/); assert.doesNotMatch(bug, /spider/i); assert.doesNotMatch(specter, /ghost/i); assert.match(specter, /sfx-ball/);
  const css = fs.readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8');
  assert.match(css, /sfx-revealing:has\(\.sfx-reveal:is\(\.sfx-reveal-cube, \.sfx-reveal-boulder, \.sfx-reveal-pit, \.sfx-reveal-hatch, \.sfx-reveal-belt, \.sfx-reveal-goo, \.sfx-reveal-firebreath\)\) \.kickoff-captains \{ gap:/, 'the captains step apart before anything opens or lands between them');
});
test('Specter orbs: a few small, half-faded orbs in a layer that takes no taps; none elsewhere or at Off', async () => {
  const { hauntHtml, HAUNT_ORBS } = await import('../src/ui/stadium-haunt.js');
  let n = 0; const rand = () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
  const h = hauntHtml({ env: 'specter' }, 'full', rand); assert.equal((h.match(/class="sfx-orb"/g) || []).length, HAUNT_ORBS); assert.match(h, /aria-hidden="true"/); assert.doesNotMatch(h, /<svg/, 'no monster shapes');
  for (const m of h.matchAll(/width:(\d+)px/g)) assert.ok(Number(m[1]) <= 14, 'small');
  assert.notEqual(hauntHtml({ env: 'specter' }, 'full', rand), h); assert.equal(hauntHtml({ env: 'specter' }, 'off'), ''); assert.equal(hauntHtml({ env: 'storm' }), ''); assert.equal(hauntHtml(null), '');
  const css = fs.readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8'); assert.match(css, /\.sfx-haunt \{[^}]*pointer-events: none/); assert.match(css, /html\[data-stadium-fx="reduced"\] \.sfx-haunt[^{]*\{ display: none/);
  const peak = Math.max(...[...css.match(/@keyframes sfx-orb-fade \{[^@]*/)[0].matchAll(/opacity: ([.\d]+)/g)].map((m) => Number(m[1]))); assert.ok(peak <= 0.4, 'never more than half faded in');
});
test('zoomed out, stands with the crowd run along both sidelines; the close view is unchanged', async () => {
  const { setStadiumScene, SIDE_REACH, FIELD_BORDER } = await import('../src/ui/stadium-fx.js'); const { fieldViewBox, FIELD_VIEWBOX } = await import('../src/ui/field-view.js');
  const venue = venueFor('Thunder Mesa Blitz', 'k'); const plain = FIELD_VIEWBOX.split(' ').map(Number);
  assert.equal(fieldViewBox(142), `${plain[0]} 0 ${plain[2]} 142`, 'no scene: no side stands');
  try {
    setStadiumScene(venue, null); const close = fieldViewBox().split(' ').map(Number), wide = fieldViewBox(142).split(' ').map(Number);
    assert.ok(Math.abs(close[2] - (plain[2] + FIELD_BORDER * 2)) < 1e-9); assert.ok(Math.abs(wide[2] - (close[2] + SIDE_REACH * 2)) < 1e-9); assert.equal(SIDE_REACH, 13); // a 6-yard green sideline, the barrier, the stand (owner 2026-11-25)
    assert.doesNotMatch(fieldSvg({ venue, ballOn: 50 }), /sfx-stand-side/); const z = fieldSvg({ venue, ballOn: 50, viewCamera: { bottom: -21, top: 121 } });
    assert.match(z, /sfx-stand-side/); assert.doesNotMatch(z, /NaN|undefined/);
    { const env = ENVIRONMENTS[venue.env]; const side = z.slice(z.indexOf('sfx-stand-side')); assert.ok(side.includes(`width="6" height="`) && side.includes(`fill="${env.palette.b || env.palette.a}"`), 'green sideline between the white and the stand'); } assert.doesNotMatch(z, /rotate\(-?90\)/, 'the side fans stand upright');
    const auto = fieldSvg({ venue, ballOn: 50, viewCamera: { bottom: -13.5, top: 113.5 } }); assert.match(auto, /sfx-stand-side/); assert.doesNotMatch(auto, /class="sfx-stand"><rect|sfx-wall/, 'zoomed out, only the two side stands are in view');
  } finally { setStadiumScene(null); }
});

test('a side stand\'s crowd is seated for a sideline: 43 seats long, the same people-and-monsters mix, deterministic', async () => {
  const { crowdSeats, crowdMonsters, SIDE_SEATS, CROWD_ROWS } = await import('../src/ui/stadium-crowd.js'); const mix = { home: 0.7, away: 0.18, fill: 0.9 };
  const seats = crowdSeats(5, mix, 'left0', SIDE_SEATS); assert.equal(seats.length, CROWD_ROWS); assert.equal(seats[0].length, SIDE_SEATS); assert.deepEqual(seats, crowdSeats(5, mix, 'left0', SIDE_SEATS));
  assert.notDeepEqual(seats, crowdSeats(5, mix, 'right0', SIDE_SEATS)); assert.equal(crowdMonsters(5, 'left0', 'Fire', SIDE_SEATS)[0].length, SIDE_SEATS);
});

test('every stadium design has a look: twelve on the Gym Leaders\' fields (one per type), the plain home field, and five unassigned designs', async () => {
  const { DESIGN_FIELDS } = await import('../src/data/stadium-designs.js'); const { ENVIRONMENTS } = await import('../src/data/stadiums.js');
  const labels = Object.values(LOOKS).map((l) => l.label).sort();
  assert.deepEqual(labels, ['Alloy', 'Bug', 'Clash', 'Corrupt', 'Electric', 'Fire', 'Grass', 'Ground', 'Home', 'Ice', 'Oracle', 'Radiant', 'Rock', 'Sky', 'Specter', 'Umbral', 'Water', 'Wyrm']);
  assert.equal(Object.keys(LOOKS).filter((k) => ENVIRONMENTS[k] && k !== 'grass').length, 12); assert.equal(Object.keys(LOOKS).filter((k) => DESIGN_FIELDS[k]).length, 5);
  assert.equal(new Set(Object.values(LOOKS).filter((l) => !l.plain).map((l) => l.reveal)).size, 17, 'every stadium has its own kickoff');
  // The twelve monster types each have a design (the Gym Leader line-up): ten on typed fields plus Sky (Wind) and Oracle (Psychic).
  assert.deepEqual(['storm', 'volcanic', 'tidal', 'forest', 'frozen', 'desert', 'dome', 'dragon', 'shadow', 'radiant', 'sky', 'oracle'].filter((k) => !LOOKS[k]), []);
});

// 2026-11-23: no weather drawn over the field; the winners celebrate when the game is over.
test('the match screen draws no weather layer, and the final screen has the winners celebrating', () => {
  const match = fs.readFileSync(new URL('../src/ui/screens/match.js', import.meta.url), 'utf8'); const css = fs.readFileSync(new URL('../styles/app.css', import.meta.url), 'utf8');
  assert.doesNotMatch(match, /weatherLayer|weatherClass|class="weather /, 'no weather layer over the field');
  assert.doesNotMatch(fs.readFileSync(new URL('../src/ui/stadium-preview.js', import.meta.url), 'utf8'), /venue-weather/, 'and no weather label before the game');
  assert.match(match, /s\.finished && !anim \? finalCelebration\(f, s, teams\)/); assert.match(match, /const side = s\.winner; if \(level === 'off' \|\| !side/, 'the winning side, whoever it is; nothing for a tie or at Off');
  assert.match(css, /\.final-celebration \{[^}]*pointer-events: none/); assert.match(css, /@keyframes final-jump\b/); assert.match(css, /@keyframes final-fall\b/);
  assert.equal((match.match(/Array\.from\(\{ length: 18 \}/g) || []).length, 1, 'a fixed, small number of confetti pieces');
});

test('the close view always fills the field box: refitted camera, the field drawn after the screen around it, one draw at the snap (owner 2026-11-25)', () => {
  const match = fs.readFileSync(new URL('../src/ui/screens/match.js', import.meta.url), 'utf8');
  const refresh = match.slice(match.indexOf('function refresh(f)'), match.indexOf('// ------------------------------------------------------------ the end-of-play save'));
  assert.ok(refresh.indexOf('put(controls, P.controls)') < refresh.indexOf('drawMatchField(svg, P.field)'), 'the field is fitted after the result text and the buttons have their size');
  assert.match(match, /const d = \(close0\.top - close0\.bottom\) - fieldSpan\(\);/, 'a kept camera of another height is refitted to the box');
  const start = match.slice(match.indexOf('function startAnim('), match.indexOf('const cue = turnoverCue(ev);'));
  assert.match(start, /anim\.noDraw = true; refresh\(f\); anim\.noDraw = false;/); assert.match(start, /fitFieldSpan\(svg0\)/); assert.match(start, /anim\.t0 = performance\.now\(\)/);
  assert.match(match, /if \(anim\.t0 != null\) \{ if \(!RP_CLOCK && rafNow > anim\.t0\) anim\.start \+= rafNow - anim\.t0; anim\.t0 = null; \}/, 'the play clock starts at its first drawn frame');
});

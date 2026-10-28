// The observable run read (Phase A: run-defense intelligence, v42.14, GDD §53.5j). Defenders build a run/pass belief only from
// what they can see (the line, the quarterback, the backs, the ball seen with a back, a man defender's own man blocking), after a
// perception delay, at a pace set by Awareness; the defensive call sets where the belief starts. These tests check that the
// defense never reads hidden play information, that outcomes stay emergent (strategy moves probabilities, never guarantees a
// result), that play-action and misdirection still deceive, that Awareness and the read abilities act in aggregate, and that the
// developer trace changes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS, manKeyTargets } from '../src/data/playbook.js';
import { play, side } from '../src/lab/attr-trials.js';

const SRC = fs.readFileSync(new URL('../src/sim/engine.js', import.meta.url), 'utf8');
/** The source of one function (or arrow constant) inside simulatePlay, comments removed. */
function body(name) {
  const m = SRC.match(new RegExp(`\\n  (?:function ${name}\\(|const ${name} = )`)); assert.ok(m, `${name} exists`);
  let depth = 0, j = SRC.indexOf('{', m.index); const i = m.index;
  for (; j < SRC.length; j++) { if (SRC[j] === '{') depth++; else if (SRC[j] === '}' && !--depth) break; }
  return SRC.slice(i, j + 1).split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
}
const DEFENSE_FUNCS = ['defenderGoal', 'pursue', 'trailPosition', 'observedVelocity', 'readFit', 'readCues', 'visibleCarry', 'updateRead', 'zoneRead', 'defenseTick', 'seenFacing', 'readPrior', 'readDelay', 'lineOf', 'backsOf', 'seenOf', 'seenVel', 'passShown'];
const RUNS = OFFENSE_IDS.filter((k) => PLAYS[k].type === 'run');
const PA = OFFENSE_IDS.filter((k) => ['play_action', 'boot'].includes(PLAYS[k].assignments.QB?.a));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const all = (def) => [...PLAYS[def].onField];
const covSlots = (def) => PLAYS[def].onField.filter((s) => ['man', 'zone', 'spy'].includes(PLAYS[def].assignments[s]?.a));

// ---- hidden information
test('defensive code never reads the called play, its type or tags, a play-action designation, assignments or the QB read', () => {
  const FORBID = [
    [/\bisRun\b/, 'the play type (isRun)'], [/isPlayAction/, 'the play-action designation'], [/offensePlay\./, 'the offensive call'],
    [/phase [!=]== '(run|dropback)'/, 'the run/dropback phase (set from the play type)'], [/\bhandoffDone\b/, 'the instant handoff flag'],
    [/stats\.carrier/, 'the designated carrier'], [/\bqr\./, 'the quarterback\'s read progression'], [/optionRead/, 'the option read'],
    [/\bmisdirection\b/, 'a misdirection tag'],
  ];
  for (const n of DEFENSE_FUNCS) {
    const code = body(n);
    for (const [re, what] of FORBID) assert.ok(!re.test(code), `${n} reads ${what}`);
    // Offensive players' assignments (route, carry, fake, block...) are hidden; a defender reads only his own (d / asg) and his teammates'.
    for (const m of code.matchAll(/\b(\w+)\.assignment\b/g)) assert.ok(['d', 'x'].includes(m[1]), `${n} reads ${m[1]}.assignment`);
  }
  // The read module states what it may use; the ball is seen only a perception delay (and the mesh's concealment) after it changes hands.
  assert.match(body('readCues'), /handoffAt <= t - delay - READ\.conceal/);
  assert.match(body('passShown'), /d\.read \? d\.read\.b : readPrior\(d\)/);
  assert.match(body('defenderGoal'), /carrier\.team === 'off' && d\.recognised/);
});

test('offensive tags, names and descriptions change nothing: the defense cannot know the called play', () => {
  let n = 0;
  for (const off of ['inside_zone', 'counter', 'trap', 'pa_post', 'power_right', 'read_option']) for (const def of ['cover_3', 'run_wall', 'bear_front', 'goal_line']) for (const seed of [3, 4]) {
    const P = PLAYS[off]; const disguised = { ...P, id: 'x', name: 'Mystery', desc: '', tags: ['pass', 'deep', 'screen'] };
    const base = { defensePlay: PLAYS[def], offense: side(off), defense: side(def), ballOn: 30, ballLat: 0, seed, options: { frameEvery: 1 } };
    const a = simulatePlay({ ...base, offensePlay: P }), b = simulatePlay({ ...base, offensePlay: disguised });
    assert.equal(JSON.stringify(b.frames), JSON.stringify(a.frames), `${off} vs ${def} seed ${seed}`); n++;
  }
  assert.ok(n >= 40);
});

test('the ball is seen only after it changes hands: no ball cue before a handoff, none on a play-action fake, none before an option resolves', () => {
  let runs = 0, fakes = 0;
  for (const off of [...RUNS, ...PA]) for (const def of ['cover_3', 'run_wall', 'bear_front', 'tampa_2']) for (const seed of [21, 22, 23]) {
    const sim = play({ off, def, attr: 'speed', value: 65, seed, options: { trace: true } });
    const given = sim.events.find((e) => e.kind === 'handoff' || e.kind === 'keep' || e.kind === 'pitch');
    const thrown = sim.events.find((e) => e.kind === 'throw');
    for (const [k, f] of sim.frames.entries()) {
      if (!f.dbg || (thrown && f.t >= thrown.t) || !f.dbg.some((e) => e[8]?.ball)) continue;
      // The ball is seen with a back after it changes hands (plus the mesh), or in a ball carrier's hands once he is past the line.
      const past = !!sim.stats.carrier && sim.frames.slice(Math.max(0, k - 6), k + 1).some((g) => g.off.find((p) => p[0] === sim.stats.carrier)?.[1] > 0.5);
      if (given && f.t >= given.t + 0.08 - 1e-9) continue;
      assert.ok(past, `${off} vs ${def} seed ${seed}: ball seen at ${f.t} (${given ? `changed hands at ${given.t}` : 'nobody took it'}) with no carrier past the line`);
    }
    if (given) runs++; else fakes++;
  }
  assert.ok(runs > 100 && fakes > 20, `runs ${runs}, fakes ${fakes}`);
});

test('the developer trace leaves run plays identical, and the same seed replays the same play', () => {
  for (const off of ['inside_zone', 'power_left', 'counter', 'read_option', 'pa_boot']) for (const def of ['bear_front', 'run_wall', 'goal_line', 'goal_line_man', 'cover_3']) {
    const base = { offensePlay: PLAYS[off], defensePlay: PLAYS[def], offense: side(off), defense: side(def), ballOn: 30, ballLat: 0, seed: 31 };
    const a = simulatePlay({ ...base, options: { frameEvery: 1 } }), b = simulatePlay({ ...base, options: { frameEvery: 1, trace: true } }), c = simulatePlay({ ...base, options: { frameEvery: 1 } });
    const strip = (s) => JSON.stringify({ ...s, frames: s.frames.map(({ dbg, ...f }) => f) });
    assert.equal(strip(b), strip(a), `${off} vs ${def}: trace changes the play`);
    assert.equal(strip(c), strip(a), `${off} vs ${def}: the same seed differs`);
  }
});

// ---- emergent outcomes (GDD §53.0: strategy influences probability, never guarantees results)
const yardsOf = (off, def, n, base = 9000) => Array.from({ length: n }, (_, i) => play({ off, def, attr: 'speed', value: 65, seed: base + i }).yards);

test('different seeds vary; nothing is a fixed yardage', () => {
  for (const [off, def] of [['inside_zone', 'run_wall'], ['power_right', 'bear_front'], ['inside_zone', 'cover_3'], ['counter', 'bear_front'], ['toss_sweep', 'cover_2_zone'], ['dive', 'goal_line']]) {
    // (Inside Zone into Run Wall, the front built for it, is mostly stuffed at the line, as before Phase A: three outcomes is its floor)
    const ys = yardsOf(off, def, 120); const distinct = new Set(ys).size;
    assert.ok(distinct >= 3, `${off} vs ${def}: only ${distinct} different outcomes in 120 plays (${[...new Set(ys)]})`);
  }
});

test('a strong run defense still gives up long runs, and a favorable offense still gets stopped', () => {
  // Against each run front, across the base runs, a 20-yard run still happens; against the friendliest cells, a run still fails.
  for (const def of ['bear_front', 'run_wall', 'goal_line', 'edge_contain']) {
    const ys = RUNS.flatMap((off) => yardsOf(off, def, 30, 9500)); const long = ys.filter((y) => y >= 20).length;
    assert.ok(long > 0, `${def}: no 20-yard run in ${ys.length} carries`);
  }
  // The play a front is built to stop still breaks now and then (Inside Zone into Goal Line Stand never does, before or after
  // Phase A: four rushers in the interior gaps against three linemen; reported, not forced).
  for (const def of ['run_wall', 'bear_front']) { const ys = yardsOf('inside_zone', def, 400, 9700); assert.ok(Math.max(...ys) >= 10, `inside zone vs ${def}: never 10+ in 400 (max ${Math.max(...ys)})`); }
  for (const [off, def] of [['toss_sweep', 'cover_2_zone'], ['counter', 'bear_front'], ['inside_zone', 'cover_2_zone'], ['dive', 'tampa_2']]) {
    const ys = yardsOf(off, def, 200, 9900); const stopped = ys.filter((y) => y <= 2).length;
    assert.ok(stopped > 0, `${off} vs ${def} (avg ${mean(ys).toFixed(1)}): never stopped at 2 yards or less in 200`);
  }
});

test('Awareness is an aggregate advantage, not a guarantee', () => {
  let better = 0, worse = 0; const lo = [], hi = [];
  for (const off of ['inside_zone', 'power_right', 'counter', 'dive', 'outside_zone']) for (const def of ['cover_3', 'run_wall', 'bear_front']) for (let s = 0; s < 24; s++) {
    const a = play({ off, def, defSubjects: all(def), attr: 'awareness', value: 50, seed: 12000 + s }).yards, b = play({ off, def, defSubjects: all(def), attr: 'awareness', value: 95, seed: 12000 + s }).yards;
    lo.push(a); hi.push(b); if (b < a) better++; else if (b > a) worse++;
  }
  assert.ok(mean(hi) < mean(lo), `Awareness 95 allows fewer yards on average: ${mean(hi).toFixed(2)} vs ${mean(lo).toFixed(2)}`);
  assert.ok(worse > 0, 'the aware defense still loses some of the same-seed plays');
  assert.ok(better > worse, `same-seed plays: aware better ${better}, worse ${worse}`);
});

test('no matchup yardage floor or cap: the engine never clamps a run to a matchup', () => {
  // Gains come from the play (the tackle point, forward progress, abilities); nothing in the run read sets or limits yards.
  for (const n of ['readCues', 'updateRead', 'readFit', 'readPrior']) assert.ok(!/\b(yards|gain|endPlay)\b/.test(body(n)), `${n} touches the result`);
  const ys = yardsOf('dive', 'goal_line', 300, 13000); assert.ok(Math.max(...ys) >= 15 && Math.min(...ys) <= 0, `dive vs goal line spans ${Math.min(...ys)}..${Math.max(...ys)}`);
});

// ---- calls, play-action, misdirection
test('call priors: run fronts start toward run, deep and prevent defenders toward pass; the belief then follows what they see', () => {
  const firstRead = (def, slot, off = 'inside_zone') => { const sim = play({ off, def, attr: 'speed', value: 65, seed: 5, options: { trace: true } }); return sim.frames.map((f) => f.dbg?.find((e) => e[0] === slot)?.[8]).find(Boolean)?.b; };
  assert.equal(firstRead('goal_line', 'LB2'), 0.5); assert.equal(firstRead('run_wall', 'LB1'), 0.35); assert.equal(firstRead('cover_1', 'LB1'), 0);
  assert.equal(firstRead('cover_3', 'LB1'), 0); assert.equal(firstRead('cover_3', 'FS'), -0.25); // Cover 3 is a balanced call
  assert.equal(firstRead('cover_6', 'LB1'), -0.15); assert.equal(firstRead('tampa_2', 'LB1'), -0.4); assert.equal(firstRead('prevent', 'LB1'), -0.3);
  // whatever the prior, a real run is read as a run and a real dropback as a pass, by everyone, before the play is over
  for (const def of ['goal_line', 'run_wall', 'cover_3', 'prevent']) {
    const run = play({ off: 'dive', def, attr: 'speed', value: 65, seed: 6, options: { trace: true } }); const last = run.frames.filter((f) => f.dbg).at(-1);
    assert.ok(last.dbg.filter((e) => e[8]).every((e) => e[8].b > 0.4), `${def}: dive read as a run`);
    const pass = play({ off: 'four_verticals', def, attr: 'speed', value: 65, seed: 6, options: { trace: true, qb: { mode: 'hold' }, maxTime: 2 } });
    const f = pass.frames.filter((x) => x.dbg && x.t < 1.8).at(-1);
    assert.ok(f.dbg.filter((e) => e[8]).every((e) => e[8].b < 0), `${def}: four verticals read as a pass by 1.8 s`);
  }
});

function biteShare(sim, def) {
  const th = sim.events.find((e) => e.kind === 'throw'); if (!th) return null;
  const under = covSlots(def).filter((s) => !(PLAYS[def].assignments[s].a === 'zone' && PLAYS[def].assignments[s].role === 'deep'));
  const bit = new Set(); for (const f of sim.frames) if (f.dbg && f.t <= th.t) for (const e of f.dbg) if (under.includes(e[0]) && e[8]?.state === 'run') bit.add(e[0]);
  return bit.size / Math.max(1, under.length);
}
test('play-action: run fronts are more exposed, aware defenders bite less, and the fake never guarantees an open receiver', () => {
  const study = (defs, value) => { const ypa = [], comp = [], bite = []; for (const off of PA) for (const def of defs) for (let s = 0; s < 30; s++) {
    const sim = play({ off, def, defSubjects: covSlots(def), attr: 'awareness', value, seed: 14000 + s, options: { trace: true } }); if (!sim.events.some((e) => e.kind === 'throw')) continue;
    ypa.push(sim.yards); comp.push(sim.stats.receiver ? 1 : 0); bite.push(biteShare(sim, def)); }
    return { ypa: mean(ypa), comp: mean(comp), bite: mean(bite) }; };
  const fronts = study(['run_wall', 'bear_front', 'goal_line'], 65), zones = study(['cover_3', 'tampa_2', 'cover_4'], 65);
  assert.ok(fronts.ypa > zones.ypa, `PA against run fronts gains more: ${fronts.ypa.toFixed(1)} vs ${zones.ypa.toFixed(1)} yd per attempt`);
  assert.ok(fronts.comp < 0.9 && zones.comp < 0.9, `the fake never makes completion automatic (${fronts.comp.toFixed(2)}, ${zones.comp.toFixed(2)})`);
  const lo = study(['cover_3', 'tampa_2', 'cover_4'], 50), hi = study(['cover_3', 'tampa_2', 'cover_4'], 95);
  assert.ok(hi.bite < lo.bite, `aware underneath defenders bite less: ${hi.bite.toFixed(2)} vs ${lo.bite.toFixed(2)}`);
  assert.ok(lo.bite > 0, 'unaware defenders do bite');
});

test('misdirection: the counter still works against an over-committed front, and Awareness helps recover', () => {
  const y = (def, v) => mean(Array.from({ length: 60 }, (_, s) => play({ off: 'counter', def, defSubjects: all(def), attr: 'awareness', value: v, seed: 15000 + s }).yards));
  assert.ok(y('bear_front', 65) > y('cover_3', 65), 'the counter hurts the Bear Front more than a patient zone call');
  for (const def of ['bear_front', 'run_wall', 'cover_3']) assert.ok(y(def, 95) < y(def, 50), `${def}: aware defenders recover against the counter`);
});

test('Bear Front lines up B-left, head-up nose, B-right', () => {
  const src = fs.readFileSync(new URL('../src/data/playbook.js', import.meta.url), 'utf8');
  assert.match(src, /defense\('bear_front'[\s\S]*?DL1: RUSH\('B_L'\), DL3: RUSH\('A_M'\), DL2: RUSH\('B_R'\)[\s\S]*?align: \{ DL1: \[1, -2\.6\], DL3: \[1, 0\], DL2: \[1, 2\.6\]/);
});

// ---- abilities on the read
test('read abilities act on the read: Echo Read and Ancient Grove bite less, Cold Read reads runs sooner', () => {
  const pa = (species) => { const bites = []; for (const off of PA) for (const def of ['cover_3', 'tampa_2', 'run_wall']) for (let s = 0; s < 30; s++) {
    const sim = play({ off, def, attr: 'speed', value: 65, seed: 16000 + s, options: { trace: true }, extra: species ? (o, d) => { d.LB1.species = species; } : null });
    const th = sim.events.find((e) => e.kind === 'throw'); if (!th) continue; bites.push(sim.frames.some((f) => f.dbg && f.t <= th.t && f.dbg.find((e) => e[0] === 'LB1')?.[8]?.state === 'run') ? 1 : 0); }
    return mean(bites); };
  const none = pa(null), echo = pa('echolot'), grove = pa('elderoot');
  assert.ok(none > 0.05, `LB1 bites on some fakes (${none.toFixed(2)})`);
  assert.ok(echo < none, `Echo Read bites less: ${echo.toFixed(2)} vs ${none.toFixed(2)}`);
  assert.ok(grove < echo && grove < 0.05, `Ancient Grove (nearly) never bites: ${grove.toFixed(2)}`);
  const rec = (species) => { const ts = []; for (const off of ['inside_zone', 'dive', 'power_right', 'counter']) for (const def of ['cover_3', 'run_wall']) for (let s = 0; s < 30; s++) {
    const sim = play({ off, def, attr: 'speed', value: 65, seed: 17000 + s, options: { trace: true }, extra: species ? (o, d) => { d.LB1.species = species; } : null });
    const f = sim.frames.find((x) => x.dbg && x.dbg.find((e) => e[0] === 'LB1')?.[8]?.state === 'run'); if (f) ts.push(f.t); }
    return mean(ts); };
  assert.ok(rec('frostclaw') < rec(null) - 0.03, 'Cold Read commits to real runs sooner');
});

test('Permafrost and Crushing Rush still work against the run, and only on a ball handed off or kept', () => {
  const fire = (species, slot, offs, key) => { let n = 0, fired = 0; for (const off of offs) for (const def of ['run_wall', 'bear_front', 'cover_3']) for (let s = 0; s < 20; s++) {
    const sim = play({ off, def, attr: 'speed', value: 65, seed: 18000 + s, extra: (o, d) => { if (d[slot]) d[slot].species = species; } }); n++; if (sim.events.some((e) => e.kind === 'ability' && e.by === slot && (!key || e.key === key))) fired++; }
    return fired / n; };
  assert.ok(fire('icehorn', 'DL2', RUNS) > 0.02, 'Permafrost fires on runs');
  assert.equal(fire('icehorn', 'DL2', ['quick_slants', 'curl_flat', 'four_verticals', 'pa_post']), 0, 'Permafrost never fires on a pass play');
  assert.ok(fire('stoneguard', 'DL2', RUNS) > 0.1, 'Crushing Rush fires on runs');
  assert.match(SRC, /d\.ability\?\.permafrost && !c\.permafrosted && handoffDone && !stats\.receiver/, 'Permafrost: contact with a handed-off ball, not the play type');
});

// ---- Goal Line Man's free linebacker (owner-approved correction, PR #78). Against one-back sets with an attached tight end
// (Power Right/Left, Counter, Stretch Left, the play-action passes) the man keys leave LB2 nobody to cover. On a run front or
// goal-line call he is a run-support linebacker: he keeps his 2.5-yard alignment and stands between it and his run fit by his
// read, instead of drifting six yards into the short middle; defenders who have a man keep the 4.5-yard cushion.
const oneBackRuns = ['counter', 'power_left', 'power_right'];
const lb = (f, slot) => f.def.find((p) => p[0] === slot);
test('Goal Line Man: the free linebacker keeps his alignment and supports the run before the handoff; assigned men keep their cushion', () => {
  let n = 0; const atHandoff = [];
  for (const off of oneBackRuns) for (let s = 0; s < 30; s++) {
    const sim = play({ off, def: 'goal_line_man', attr: 'speed', value: 65, seed: 19000 + s, options: { trace: true } }); n++;
    const f0 = sim.frames.find((f) => f.dbg) || sim.frames[0];
    assert.ok(Math.abs(lb(f0, 'LB2')[1] - 2.5) < 0.6, `${off} ${s}: the free linebacker lines up at his 2.5-yard alignment (${lb(f0, 'LB2')[1]})`);
    assert.ok(lb(f0, 'LB1')[1] >= 4.5 - 1e-6, `${off} ${s}: the linebacker covering the back keeps the 4.5-yard cushion (${lb(f0, 'LB1')[1]})`);
    const h = sim.events.find((e) => e.kind === 'handoff');
    for (const f of sim.frames) if (f.dbg && f.t < h.t) {
      assert.ok(lb(f, 'LB2')[1] <= 3.1, `${off} ${s} t=${f.t}: he does not drop into the short middle before the handoff (${lb(f, 'LB2')[1]})`);
      const e = f.dbg.find((x) => x[0] === 'LB2'); if (e[1] === 'man') assert.match(e[2], /^none · run support/);
    }
    atHandoff.push(lb(sim.frames.find((f) => f.t >= h.t - 1e-6), 'LB2')[1]);
  }
  assert.ok(mean(atHandoff) < 2.5, `he is in the box when the ball is handed off: ${mean(atHandoff).toFixed(2)} yd deep on average`);
  // He commits only once he sees the run, like everyone else (no earlier than the handoff plus the mesh).
  for (let s = 0; s < 20; s++) { const sim = play({ off: 'counter', def: 'goal_line_man', attr: 'speed', value: 65, seed: 19500 + s, options: { trace: true } }); const h = sim.events.find((e) => e.kind === 'handoff');
    const c = sim.frames.find((f) => f.dbg?.find((x) => x[0] === 'LB2')?.[5]); if (c) assert.ok(c.t >= h.t + 0.08 - 1e-9, `seed ${19500 + s}: committed at ${c.t}, handoff ${h.t}`); }
});

test('Goal Line Man: the free linebacker makes plays on one-back runs, which still break sometimes; only Goal Line Man changes', () => {
  const ys = [], tacklers = {};
  for (const off of oneBackRuns) for (let s = 0; s < 60; s++) { const sim = play({ off, def: 'goal_line_man', attr: 'speed', value: 65, seed: 19800 + s }); ys.push(sim.yards); const k = sim.stats.tackler || '-'; tacklers[k] = (tacklers[k] || 0) + 1; }
  assert.ok((tacklers.LB2 || 0) / ys.length > 0.25, `the free linebacker is in on the stops: ${JSON.stringify(tacklers)}`);
  assert.ok(Math.max(...ys) >= 15 && ys.some((y) => y >= 10), `long runs still happen (max ${Math.max(...ys)})`);
  // The rule needs a run front or goal-line call AND a man defender with nobody to cover. Only a man key on 'back' can be empty
  // ('inside', 'wideL' and 'wideR' always resolve, manKeyTargets), so across the whole book (base, reserve and legendary calls)
  // that is Goal Line Man alone; the same-seed comparison in the PR shows every other call's plays identical.
  const callsWithFreeMen = Object.keys(PLAYS).filter((k) => PLAYS[k].side === 'defense' && (PLAYS[k].tags.includes('run') || PLAYS[k].tags.includes('goalline'))
    && PLAYS[k].onField.some((sl) => PLAYS[k].assignments[sl]?.a === 'man' && PLAYS[k].assignments[sl].key === 'back'));
  assert.deepEqual(callsWithFreeMen, ['goal_line_man']);
  for (const off of OFFENSE_IDS) for (const key of ['inside', 'wideL', 'wideR']) assert.ok(manKeyTargets(PLAYS[off])[key], `${off}: '${key}' always has a man`);
});

test('Goal Line Man: on a pass he covers again, it still stops screens and the quick game, and play-action still hurts it', () => {
  // Dropbacks from one-back sets: once the play shows pass he sits in the short middle as before.
  let shown = 0;
  for (const off of ['stick', 'y_cross', 'flood', 'te_seam']) for (let s = 0; s < 15; s++) {
    const sim = play({ off, def: 'goal_line_man', attr: 'speed', value: 65, seed: 20000 + s, options: { trace: true } }); const th = sim.events.find((e) => e.kind === 'throw'); if (!th) continue;
    const f = sim.frames.filter((x) => x.dbg && x.t <= th.t).at(-1); const e = f.dbg.find((x) => x[0] === 'LB2');
    if (e[8]?.state === 'pass') { shown++; assert.equal(e[2], 'none', `${off} ${s}: with pass shown he covers the short middle (${e[2]})`); }
  }
  assert.ok(shown >= 20, `pass shown before the throw on ${shown} dropbacks`);
  const ypp = (def, offs) => mean(offs.flatMap((off) => Array.from({ length: 40 }, (_, s) => play({ off, def, attr: 'speed', value: 65, seed: 20500 + s }).yards)));
  const screens = ['bubble_screen', 'rb_screen'], quick = ['quick_slants', 'stick', 'curl_flat'], pa = ['pa_post', 'pa_boot', 'pa_shot'];
  assert.ok(ypp('goal_line_man', screens) < ypp('goal_line', screens), 'it stops screens better than Goal Line Stand');
  assert.ok(ypp('goal_line_man', quick) < ypp('goal_line', quick), 'and the quick game');
  assert.ok(ypp('goal_line_man', pa) > ypp('goal_line', pa), 'play-action hurts it more than Goal Line Stand');
});

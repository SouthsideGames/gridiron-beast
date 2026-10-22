// Type effectiveness in football and the shared Type Chart (GDD §32).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEATS, CHART_TYPES, chartEdge, typeProfile } from '../src/data/type-chart.js';
import * as ClashTypes from '../src/clash/types.js';
import { CLASH_VALUES } from '../src/clash/values.js';
import { footballEdge, typeMod, typeScale, withTypeValues, FOOTBALL_TYPE_VALUES, expectedMatchups, matchupEdges, describeMatchup, matchupScore, edgeReason, USUAL_OPPONENT } from '../src/sim/type-matchups.js';
import { simulatePlay } from '../src/sim/engine.js';
import { weighOffense, weighDefense } from '../src/sim/coach-ai.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, manKeyTargets } from '../src/data/playbook.js';
import { presnapLook, fieldSvg } from '../src/ui/field-view.js';
import { lineup } from './tools/lineup.js';
import { TYPES } from '../src/data/monsters.js';

// The approved Beast Clash chart (values 1.1.0) as it stood before the chart moved to src/data: it must not change.
const CLASH_CHART_1_1_0 = {
  Water: ['Fire', 'Earth'], Fire: ['Nature', 'Ice'], Earth: ['Electric', 'Fire'], Electric: ['Water', 'Metal'],
  Ice: ['Dragon', 'Nature'], Light: ['Dark', 'Psychic'], Dark: ['Psychic', 'Electric'], Nature: ['Water', 'Light'],
  Metal: ['Ice', 'Light'], Wind: ['Dark', 'Earth'], Dragon: ['Metal', 'Wind'], Psychic: ['Dragon', 'Wind'],
};

test('one chart: Beast Clash and football read the same table, and the Clash chart and strengths are unchanged', () => {
  assert.equal(ClashTypes.BEATS, BEATS, 'the Clash re-exports the shared table');
  assert.deepEqual(JSON.parse(JSON.stringify(BEATS)), CLASH_CHART_1_1_0);
  assert.deepEqual([...CHART_TYPES].sort(), Object.keys(TYPES).sort(), 'the chart covers exactly the twelve monster types');
  for (const a of CHART_TYPES) for (const b of CHART_TYPES) {
    const old = CLASH_CHART_1_1_0[a].includes(b) ? 1.05 : CLASH_CHART_1_1_0[b].includes(a) ? 0.952 : 1;
    assert.equal(ClashTypes.typeFactor(a, b), old, `${a} vs ${b} in the Clash`);
  }
  assert.equal(CLASH_VALUES.version, '1.1.0');
  for (const t of CHART_TYPES) {
    const p = typeProfile(t);
    assert.equal(p.strong.length, 2); assert.equal(p.weak.length, 2); assert.equal(p.neutral.length, 8, `${t}: 12 − 2 − 2 (itself included)`);
    for (const x of p.strong) assert.equal(chartEdge(t, x), 'strong'); for (const x of p.weak) assert.equal(chartEdge(t, x), 'weak');
  }
});

test('football strengths: ±4% from the chart, Dragon +2% against neutral types, 0 otherwise; separate from the Clash', () => {
  assert.equal(typeMod('Fire', 'Nature'), 0.04); assert.equal(typeMod('Nature', 'Fire'), -0.04);
  assert.equal(typeMod('Fire', 'Water'), -0.04); assert.equal(typeMod('Fire', 'Psychic'), 0);
  assert.equal(typeMod('Dragon', 'Metal'), 0.04); assert.equal(typeMod('Dragon', 'Ice'), -0.04);
  assert.equal(typeMod('Dragon', 'Fire'), 0.02); assert.equal(footballEdge('Dragon', 'Fire'), 'wild');
  assert.equal(typeMod('Fire', 'Dragon'), 0, 'the wildcard edge is Dragon\'s own; the opponent loses nothing');
  assert.equal(typeMod('Dragon', 'Dragon'), 0); assert.equal(typeMod(null, 'Fire'), 0); assert.equal(typeMod('Fire', undefined), 0); assert.equal(typeMod('Dragon', null), 0);
  assert.equal(typeScale('Fire', 'Nature'), 1.04);
  assert.notEqual(FOOTBALL_TYPE_VALUES.strong + 1, CLASH_VALUES.types.strong, 'football and the Clash keep their own strengths');
  withTypeValues({ strong: 0, weak: 0, dragonNeutral: 0 }, () => { assert.equal(typeMod('Fire', 'Nature'), 0); assert.equal(typeMod('Dragon', 'Fire'), 0); });
  assert.equal(typeMod('Fire', 'Nature'), 0.04, 'values restored after a balance run');
  assert.match(edgeReason('Fire', 'Nature'), /Fire is strong against Nature/);
  // Every type: two +4%, two −4%; Dragon additionally +2% against its seven neutral opponents.
  for (const t of CHART_TYPES) { const mods = CHART_TYPES.map((b) => typeMod(t, b)); assert.equal(mods.filter((m) => m === 0.04).length, 2); assert.equal(mods.filter((m) => m === -0.04).length, 2); assert.equal(mods.filter((m) => m === 0.02).length, t === 'Dragon' ? 7 : 0); }
});

// Typed lineups for engine runs.
const typed = (lu, offT, defT) => ({
  offense: Object.fromEntries(Object.entries(lu.offense).map(([s, p], i) => [s, { ...p, type: typeof offT === 'function' ? offT(s, i) : offT }])),
  defense: Object.fromEntries(Object.entries(lu.defense).map(([s, p], i) => [s, { ...p, type: typeof defT === 'function' ? defT(s, i) : defT }])),
});
const PASS = OFFENSE_IDS.filter((id) => PLAYS[id].type === 'pass'), RUN = OFFENSE_IDS.filter((id) => PLAYS[id].type === 'run');

test('engine: neutral or missing types change nothing; with every modifier at zero a typed game is identical to an untyped one', () => {
  const lu = lineup(11, 62); const T = typed(lu, (s, i) => CHART_TYPES[i % 12], (s, i) => CHART_TYPES[(i + 5) % 12]);
  for (let k = 0; k < 40; k++) {
    const op = PLAYS[OFFENSE_IDS[k % OFFENSE_IDS.length]], dp = PLAYS[DEFENSE_IDS[(k * 7) % DEFENSE_IDS.length]];
    const plain = simulatePlay({ offensePlay: op, defensePlay: dp, offense: lu.offense, defense: lu.defense, seed: 900 + k, ballOn: 30 });
    const off = withTypeValues({ strong: 0, weak: 0, dragonNeutral: 0 }, () => simulatePlay({ offensePlay: op, defensePlay: dp, offense: T.offense, defense: T.defense, seed: 900 + k, ballOn: 30 }));
    assert.equal(off.result, plain.result); assert.equal(off.yards, plain.yards); assert.equal(off.events.length, plain.events.length);
    assert.equal(plain.typeContests.length, 0, 'no types, nothing recorded');
    const same = typed(lu, 'Psychic', 'Fire'); // neutral both ways
    const n = simulatePlay({ offensePlay: op, defensePlay: dp, offense: same.offense, defense: same.defense, seed: 900 + k, ballOn: 30 });
    assert.equal(n.yards, plain.yards); assert.equal(n.typeContests.length, 0);
  }
});

test('engine: every modifier is the edge between the two monsters actually in the contest, recorded at the moment of contact', () => {
  const lu = lineup(5, 64); const offT = (s, i) => CHART_TYPES[(i * 5) % 12], defT = (s, i) => CHART_TYPES[(i * 7 + 3) % 12];
  const T = typed(lu, offT, defT); const typeOf = { off: Object.fromEntries(Object.entries(T.offense).map(([s, p]) => [s, p.type])), def: Object.fromEntries(Object.entries(T.defense).map(([s, p]) => [s, p.type])) };
  const seen = new Set(); let catchNotMan = 0, blocks = 0, catches = 0;
  for (let k = 0; k < 400; k++) {
    const op = PLAYS[OFFENSE_IDS[k % OFFENSE_IDS.length]], dp = PLAYS[DEFENSE_IDS[(k * 3) % DEFENSE_IDS.length]];
    const r = simulatePlay({ offensePlay: op, defensePlay: dp, offense: T.offense, defense: T.defense, seed: 4000 + k, ballOn: 35 });
    for (const c of r.typeContests) {
      seen.add(c.contest);
      const other = c.team === 'off' ? 'def' : 'off';
      assert.equal(c.mod, typeMod(typeOf[c.team][c.a], typeOf[other][c.b]), `${c.contest} ${c.a} vs ${c.b}`);
      assert.equal(c.opp, typeMod(typeOf[other][c.b], typeOf[c.team][c.a]));
      if (c.contest === 'block') blocks++;
      if (c.contest === 'catch') {
        catches++;
        const keys = manKeyTargets(op); const manD = dp.onField.find((d) => dp.assignments[d]?.a === 'man' && keys[dp.assignments[d].key] === c.a);
        if (manD !== c.b) catchNotMan++; // a safety (or a zone defender) contesting a receiver he did not line up on
      }
    }
  }
  for (const k of ['block', 'shed', 'tackle', 'breakTackle', 'coverage', 'catch', 'breakup', 'sack', 'escape']) assert.ok(seen.has(k), `contest ${k} is reached`);
  assert.ok(blocks > 50 && catches > 10, `${blocks} blocks, ${catches} contested catches`);
  assert.ok(catchNotMan > 0, 'contested catches use the defender at the ball, not the pre-snap man assignment');
});

test('engine: a tackle uses the tackler and the carrier only (gang helpers never add their own type); inputs are never changed', () => {
  const lu = lineup(8, 60); const T = typed(lu, 'Fire', 'Nature'); const before = JSON.stringify(T);
  for (let k = 0; k < 120; k++) {
    const op = PLAYS[RUN[k % RUN.length]], dp = PLAYS[DEFENSE_IDS[k % DEFENSE_IDS.length]];
    const r = simulatePlay({ offensePlay: op, defensePlay: dp, offense: T.offense, defense: T.defense, seed: 70 + k, ballOn: 30 });
    const tackles = r.typeContests.filter((c) => c.contest === 'tackle');
    if (r.result === 'tackle' && r.stats.tackler && tackles.length) assert.ok(tackles.some((c) => c.a === r.stats.tackler), 'the tackler is recorded against the carrier');
    for (const c of tackles) assert.ok(['off', 'def'].includes(c.team) && c.mod === -0.04);
  }
  assert.equal(JSON.stringify(T), before, 'no attribute, rating or type is written back to the monsters');
});

test('engine: the edges move outcomes the right way, and a much better-rated monster still wins against a type edge', () => {
  const runs = (offT, defT, q = { off: 62, def: 62 }, n = 260) => {
    const lo = lineup(21, q.off), ld = lineup(22, q.def); const T = typed({ offense: lo.offense, defense: ld.defense }, offT, defT);
    let yds = 0; for (let k = 0; k < n; k++) { const r = simulatePlay({ offensePlay: PLAYS[RUN[k % RUN.length]], defensePlay: PLAYS[DEFENSE_IDS[k % DEFENSE_IDS.length]], offense: T.offense, defense: T.defense, seed: 300 + k, ballOn: 30 }); yds += r.yards; }
    return yds / n;
  };
  const fav = runs('Fire', 'Nature'), unf = runs('Nature', 'Fire'), even = runs('Psychic', 'Fire');
  assert.ok(fav > unf, `favourable ${fav.toFixed(2)} > unfavourable ${unf.toFixed(2)} yards per carry`);
  // Ratings first: a +12 rated offense with the type disadvantage still out-gains a −12 offense with the advantage.
  const strongButWeakType = runs('Nature', 'Fire', { off: 72, def: 60 }), weakButStrongType = runs('Fire', 'Nature', { off: 60, def: 72 });
  assert.ok(strongButWeakType > weakButStrongType, `${strongButWeakType.toFixed(2)} vs ${weakButStrongType.toFixed(2)}`);
  assert.ok(Math.abs(fav - even) < 2.5 && Math.abs(unf - even) < 2.5, 'a type edge is a nudge, not a different game');
});

test('pre-snap expected matchups: one opponent per monster, from the call and the visible alignment; three receivers, three relationships', () => {
  const op = PLAYS[PASS.find((id) => PLAYS[id].onField.filter((s) => /^WR/.test(s)).length >= 2)];
  const dp = PLAYS.cover_2_man;
  const m = expectedMatchups({ offensePlay: op, defensePlay: dp });
  const offs = m.map((x) => x.off), defs = m.map((x) => x.def);
  assert.equal(new Set(offs).size, offs.length); assert.equal(new Set(defs).size, defs.length);
  const keys = manKeyTargets(op);
  for (const d of ['CB1', 'CB2']) { const target = keys[dp.assignments[d].key]; if (op.assignments[target]?.a === 'route') assert.ok(m.some((x) => x.off === target && x.def === d && x.kind === 'coverage'), `${d} expected on ${target}`); }
  // The offense only sees the defense's alignment: the matchups come out without reading its assignments.
  const look = presnapLook('cover_2_man'); assert.equal(look.assignments, undefined);
  const fromLook = expectedMatchups({ offensePlay: op, defensePlay: look });
  assert.ok(fromLook.length >= 3 && fromLook.every((x) => look.onField.includes(x.def)));
  // A defense facing an unknown offense (alignment only) still pairs receivers, blockers and the back.
  const fromOffLook = expectedMatchups({ offensePlay: presnapLook(op.id), defensePlay: dp });
  assert.ok(fromOffLook.some((x) => x.kind === 'coverage') && fromOffLook.some((x) => x.kind === 'block'));
  // Three receivers with three different types: three different relationships.
  const three = PLAYS[PASS.find((id) => PLAYS[id].onField.filter((s) => /^WR|TE/.test(s) && PLAYS[id].assignments[s]?.a === 'route').length >= 3)];
  const lu = lineup(3, 60); const T = { offense: { ...lu.offense }, defense: { ...lu.defense } };
  const rec = three.onField.filter((s) => three.assignments[s]?.a === 'route' && s !== 'RB').slice(0, 3); const recTypes = ['Fire', 'Nature', 'Water'];
  rec.forEach((s, i) => { T.offense[s] = { ...T.offense[s], type: recTypes[i] }; });
  for (const d of Object.keys(T.defense)) T.defense[d] = { ...T.defense[d], type: 'Nature' };
  const edges = expectedMatchups({ offensePlay: three, defensePlay: dp }).filter((x) => rec.includes(x.off)).map((x) => describeMatchup(x, T.offense, T.defense).off.mod);
  assert.deepEqual(new Set(edges), new Set([0.04, 0, -0.04]), 'Fire vs Nature +4%, Nature vs Nature 0, Water vs Nature −4%');
  const shown = matchupEdges({ offensePlay: three, defensePlay: dp }, T.offense, T.defense);
  assert.ok(shown.every((x) => x.off.mod || x.def.mod), 'neutral matchups carry no icon');
});

test('AI: the same numbers, a capped lean toward winning matchups, and ratings outweigh types', () => {
  const lu = lineup(2, 62); const state = { down: 1, toGo: 10, ballOn: 40, score: { home: 0, away: 0 }, possession: 'home', quarter: 1, clock: 180, quarterLength: 180, timeouts: { home: 3, away: 3 } };
  const mk = (offT, defT, offQ = 0, defQ = 0) => {
    const T = typed(lu, offT, defT);
    for (const p of Object.values(T.offense)) p.attrs = Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, v + offQ]));
    for (const p of Object.values(T.defense)) p.attrs = Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, v + defQ]));
    return { team: { offense: T.offense, defense: T.defense }, opp: { offense: T.offense, defense: T.defense } };
  };
  const base = Object.fromEntries(weighOffense(state, mk('Fire', 'Nature').team, PASS, null));
  const fav = Object.fromEntries(weighOffense(state, mk('Fire', 'Nature').team, PASS, null, mk('Fire', 'Nature').opp));
  const unf = Object.fromEntries(weighOffense(state, mk('Nature', 'Fire').team, PASS, null, mk('Nature', 'Fire').opp));
  for (const id of PASS) { assert.ok(fav[id] >= unf[id] - 1e-9, id); assert.ok(fav[id] <= base[id] * 1.2 + 1e-9 && unf[id] >= base[id] * 0.85 - 1e-9, `${id} lean capped`); }
  // matchupScore: rating first. A receiver 15 points better with the type disadvantage still scores above a 15-points-worse one with the advantage.
  const r = { attrs: { catching: 80, speed: 80, agility: 80 }, type: 'Nature' }, d = { attrs: { coverage: 65, speed: 65, agility: 65 }, type: 'Fire' };
  assert.ok(matchupScore(r, d, 'pass') > 0); assert.ok(matchupScore({ ...r, type: 'Fire' }, { ...d, type: 'Nature' }, 'pass') > matchupScore(r, d, 'pass'));
  assert.ok(matchupScore({ attrs: { catching: 65, speed: 65, agility: 65 }, type: 'Fire' }, { attrs: { coverage: 80, speed: 80, agility: 80 }, type: 'Nature' }, 'pass') < 0);
  const defW = weighDefense(state, mk('Fire', 'Nature').team, DEFENSE_IDS, null, mk('Fire', 'Nature').opp); assert.equal(defW.length, DEFENSE_IDS.length);
  assert.deepEqual(Object.keys(USUAL_OPPONENT).sort(), ['C', 'LG', 'RB', 'RG', 'TE', 'WR1', 'WR2', 'WR3']);
});

test('presentation: the field draws a tappable icon beside each edged monster and nothing for neutral ones', () => {
  const op = PLAYS[PASS[0]], dp = presnapLook('cover_2_man');
  const svg = fieldSvg({ ballOn: 30, presnap: { play: op, offensePlay: op, defensePlay: dp }, typeIcons: { off: { WR1: 'up', TE: 'down' }, def: {} } });
  assert.equal((svg.match(/class="tm-icon"/g) || []).length, op.onField.includes('TE') ? 2 : 1);
  assert.match(svg, /data-tm="off:WR1"/); assert.match(svg, /#22c55e/);
  assert.doesNotMatch(fieldSvg({ ballOn: 30, presnap: { play: op, offensePlay: op, defensePlay: dp } }), /tm-icon/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, validatePlaybook, artRole, artEnd, eligibleReceivers, manKeyTargets } from '../src/data/playbook.js';
import { LINEMEN } from '../src/data/personnel.js';

test('playbook validates with no problems', () => {
  assert.deepEqual(validatePlaybook(), []);
  assert.ok(OFFENSE_IDS.length >= 24 && DEFENSE_IDS.length >= 14);
});

test('every play fields exactly seven players with an assignment and alignment each', () => {
  for (const p of Object.values(PLAYS)) {
    assert.equal(p.onField.length, 7, p.name);
    assert.equal(new Set(p.onField).size, 7, p.name);
    for (const slot of p.onField) {
      assert.ok(p.assignments[slot], `${p.name} ${slot} assignment`);
      assert.ok(Array.isArray(p.align[slot]), `${p.name} ${slot} alignment`);
    }
  }
});

test('offensive plays have three linemen and exactly one primary route on pass plays', () => {
  for (const id of OFFENSE_IDS) {
    const p = PLAYS[id];
    assert.ok(['LG', 'RG'].every((s) => p.onField.includes(s)), p.name);
    if (p.type === 'pass') {
      const routes = eligibleReceivers(p).filter((s) => p.assignments[s].a === 'route');
      assert.ok(routes.includes(p.primary), `${p.name} primary`);
      assert.equal(routes.filter((s) => artRole(p, s) === 'primary').length, 1, `${p.name} one yellow route`);
      assert.equal(p.progression[0], p.primary, `${p.name} primary read first`);
    } else {
      assert.ok(p.onField.some((s) => ['carry', 'keep', 'option'].includes(p.assignments[s].a)), `${p.name} carrier`);
    }
  }
});

test('route and block geometry starts at the alignment and stays inside the sidelines', () => {
  for (const p of Object.values(PLAYS)) {
    for (const slot of p.onField) {
      const a = p.assignments[slot];
      if (!a.points) continue;
      if (['route', 'run_block', 'stalk', 'pull', 'release', 'block', 'rush', 'contain', 'zone'].includes(a.a)) {
        assert.deepEqual(a.points[0], p.align[slot], `${p.name} ${slot} starts at alignment`);
      }
      for (const [, y] of a.points) assert.ok(Math.abs(y) <= 26, `${p.name} ${slot} inside sideline`);
    }
  }
});

test('art roles and endpoints follow the colour conventions', () => {
  for (const p of Object.values(PLAYS)) {
    for (const slot of p.onField) {
      const role = artRole(p, slot), end = artEnd(p, slot), a = p.assignments[slot];
      if (p.side === 'offense') {
        assert.ok(['primary', 'secondary', 'alternate', 'block'].includes(role), `${p.name} ${slot} ${role}`);
        if (role === 'block') assert.equal(end, 'tbar', `${p.name} ${slot} blocks end in T-bars`);
        if (a.a === 'route') assert.equal(end, 'arrow', `${p.name} ${slot} routes end in arrowheads`);
      } else {
        assert.ok(['deep', 'middle', 'flat', 'rush', 'man'].includes(role), `${p.name} ${slot} ${role}`);
        if (a.a === 'man') assert.equal(end, 'none');
        if (a.a === 'rush') assert.equal(end, 'arrow');
      }
    }
  }
});

test('defensive packages differ and man keys resolve against every offensive formation', () => {
  const pkgs = new Set(DEFENSE_IDS.map((id) => PLAYS[id].pkg));
  assert.ok(pkgs.size >= 3, 'more than one defensive personnel package');
  for (const id of OFFENSE_IDS) {
    const keys = manKeyTargets(PLAYS[id]);
    assert.ok(keys.wideL && keys.wideR && keys.inside, id);
    assert.equal(new Set([keys.wideL, keys.wideR, keys.inside]).size, 3, `${id} three distinct receivers`);
  }
});

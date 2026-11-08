#!/usr/bin/env node
// Provenance of the frozen perf rosters (docs/task8/PERF_SCENES.md). Run once per build root; the output was pasted into
// tools/perf/scenes.json ("rosters"). The manifest, not this script, is the source of truth: the runner never calls a generator, so
// both builds read the same explicit attributes. Fields kept: id, name, position, type, attrs (the 12 ratings both engines read),
// permDurability (Task 8 stamina input; the baseline ignores it). Species, form, mastery and ability are dropped: an ordinary roster
// carries no ability on either build (the baseline would otherwise run its legacy species effect, the candidate a Dex contract).
//   node tools/perf/make-rosters.mjs --root=DIR --prefix=T > rosters.json
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const root = path.resolve(arg('root', path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..')));
const prefix = arg('prefix', 'T');
const { generatedTeam } = await import(pathToFileURL(path.join(root, 'src/franchise/roster.js')).href);
const SPECS = [[`${prefix}62a`, 11, 62], [`${prefix}62b`, 12, 62], [`${prefix}75`, 13, 75], [`${prefix}50`, 14, 50]];
const keep = (p, key, slot) => ({ id: `${key}_${slot}`, name: p.name, position: p.position, type: p.type || null, attrs: { ...p.attrs }, permDurability: p.permDurability ?? p.attrs.durability });
const out = {};
for (const [key, seed, quality] of SPECS) {
  const t = generatedTeam(seed, { id: key, name: key, abbr: key.slice(0, 3), quality });
  const map = (lu) => Object.fromEntries(Object.entries(lu).map(([slot, p]) => [slot, keep(p, key, slot)]));
  out[key] = { provenance: `generatedTeam(${seed}, quality ${quality}) from ${prefix === 'T' ? 'Task 8 acdc91e' : 'main 43976f4'}`, offense: map(t.offense), defense: map(t.defense), kicker: keep(t.kicker, key, 'K') };
}
process.stdout.write(JSON.stringify(out) + '\n');

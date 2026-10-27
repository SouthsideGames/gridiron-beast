#!/usr/bin/env node
// Test tiers (docs/TESTING_POLICY.md). Splits the one `npm test` suite into tiers without moving, removing or weakening any test:
//   fast  every test file NOT listed in SIM below (unit and small integration tests; new files land here by default)
//   sim   the long-running simulation files listed in SIM (whole seasons, careers, leagues; about 90% of the suite's time)
//   perf  the wall-clock performance test alone (run it with nothing else busy on the machine)
//   list  print each tier's files
// `fast` + `sim` is exactly the full suite (`npm test`); the full suite stays the gate before a PR is approved.
//   node tools/test-tier.mjs fast|sim|perf|list
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
// Measured in an isolated full run (2026-10-27, 2 CPUs): each of these takes 10 s or more; together about 1,350 of 1,443 s.
const SIM = [
  'tests/franchise.test.js', 'tests/career-page.test.js', 'tests/league-careers.test.js', 'tests/career-timeline.test.js',
  'tests/league-flows.test.js', 'tests/lifecycle.test.js', 'tests/lifecycle-flows.test.js', 'tests/injury-history.test.js',
  'tests/franchise-clash.test.js', 'tests/league-season.test.js', 'tests/career-history.test.js', 'tests/career-presentation.test.js',
  'tests/partnership-franchise.test.js', 'tests/stats-filters.test.js', 'tests/franchise-acceptance.test.js', 'tests/stats.test.js',
  'tests/rules.test.js', 'tests/uid-isolation.test.js', 'tests/engine.test.js', 'tests/partnership-play.test.js',
  'tests/league-registry.test.js', 'tests/species.test.js', 'tests/abilities.test.js', 'tests/franchise-save-compat.test.js',
  'tests/qb-read.test.js', 'tests/coach-assist.test.js',
];
const PERF = { file: 'tests/clash/engine.test.js', pattern: '^performance:' };

function allTests(dir = 'tests') {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...allTests(rel)); else if (e.name.endsWith('.test.js')) out.push(rel);
  }
  return out.sort();
}
const all = allTests();
const missing = SIM.filter((f) => !all.includes(f));
if (missing.length) { console.error(`test-tier: listed in SIM but not found (update tools/test-tier.mjs): ${missing.join(', ')}`); process.exit(2); }
const tiers = { fast: all.filter((f) => !SIM.includes(f)), sim: [...SIM] };

const tier = process.argv[2];
if (tier === 'list') { for (const [k, v] of Object.entries(tiers)) console.log(`${k} (${v.length}):\n  ${v.join('\n  ')}`); console.log(`perf: ${PERF.file} --test-name-pattern="${PERF.pattern}"`); process.exit(0); }
const args = tier === 'perf' ? ['--test', `--test-name-pattern=${PERF.pattern}`, PERF.file] : tiers[tier] ? ['--test', ...tiers[tier]] : null;
if (!args) { console.error('usage: node tools/test-tier.mjs fast|sim|perf|list'); process.exit(2); }
const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status ?? 1);

// Wording never decides anything (central text: src/text/index.js). The same season of franchise play and the same Beast Clash
// battles are run twice, once in English and once with every line of the central text replaced by a made-up translation.
// Everything that is not wording (results, rosters, ratings, money, ids, random draws) must come out identical. A difference
// means a rule, an id or a saved value is being read from the text: fix the code, never this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tool = fileURLToPath(new URL('../tools/text-pseudo-run.mjs', import.meta.url));
const run = (args) => new Promise((resolve, reject) => execFile(process.execPath, [tool, ...args], { maxBuffer: 1 << 26 }, (err, out, errOut) => (err ? reject(new Error(errOut || err.message)) : resolve(JSON.parse(out)))));

test('a made-up translation of every line changes nothing but the wording: one franchise season and 120 Clash battles', { timeout: 600000 }, async () => {
  const [english, other] = await Promise.all([run([]), run(['--pseudo'])]);
  assert.equal(english.problems, 0, 'the English season runs clean');
  assert.ok(Object.keys(english).length > 40, 'the digest covers the franchise');
  const differ = Object.keys(english).filter((k) => english[k] !== other[k]);
  assert.deepEqual(differ, [], 'these parts of the game changed when only the wording changed');
});

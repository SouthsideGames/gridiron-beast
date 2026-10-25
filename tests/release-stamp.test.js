// Release stamp (v42.4.1): index.html carries this release's number on the stylesheet and main.js, and an import map that sends
// every game module to its ?v=<release> URL, so a phone holding an older release's cached files fetches the new ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gameModules, releaseNumber, stampedIndex } from '../tools/stamp-release.mjs';

test('index.html is stamped for this release: every game module mapped to its versioned URL', async () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'); const v = await releaseNumber(); const mods = gameModules();
  assert.equal(stampedIndex(html, v, mods), html, 'run node tools/stamp-release.mjs after bumping src/version.js');
  const map = JSON.parse(html.match(/<script type="importmap" id="gb-modules">([\s\S]*?)<\/script>/)[1]).imports;
  for (const m of mods) assert.equal(map[`./${m}`], `./${m}?v=${v}`, m);
  assert.ok(mods.includes('src/ui/injury-ui.js') && mods.includes('src/ui/evolution-scene.js') && mods.includes('src/ui/screens/menu.js'));
  assert.ok(html.indexOf('id="gb-modules"') < html.indexOf('<script type="module"'), 'the map comes before the first module script');
  assert.ok(html.indexOf(`src/fresh.js?v=${v}`) > html.indexOf('id="gb-modules"') && html.indexOf(`src/fresh.js?v=${v}`) < html.indexOf('<script type="module" src="src/main.js'), 'the freshness check runs between the map and main.js');
  assert.match(html, new RegExp(`src/main\\.js\\?v=${v.replace(/\./g, '\\.')}"`)); assert.match(html, new RegExp(`styles/app\\.css\\?v=${v.replace(/\./g, '\\.')}"`));
});

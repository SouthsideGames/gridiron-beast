// v42.11.1: the final whistle's Continue works (a v42.11.0 comment swallowed `const playoff`), and QB reads in games are a
// development-only display that the released game never shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { qbReadsShown } from '../src/ui/qb-read-ui.js';
import { BUILD, devDisplaysAllowed } from '../src/version.js';

test('the final whistle declares everything it uses on live code, not inside a comment, and cannot run twice', () => {
  const src = fs.readFileSync('src/ui/screens/match.js', 'utf8');
  const fn = src.slice(src.indexOf('function finishGame(f)'), src.indexOf('function finishGame(f)') + 6000);
  const live = fn.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n'); // what the engine runs, line comments removed
  for (const name of ['won', 'champ', 'playoff', 'diff', 'feel', 'hero']) assert.match(live, new RegExp(`const ${name} = `), `${name} is declared in live code`);
  assert.match(fn, /if \(!f\.game\?\.state\?\.finished \|\| finishGame\.busy\) return;/, 'a second tap returns');
});

test('QB reads in games: on in development (switch on by default), off with the switch, never in the released game', () => {
  assert.equal(BUILD.release, false, 'this repository is still the development build'); assert.equal(devDisplaysAllowed(), true);
  assert.equal(qbReadsShown({}), true, 'replay reads on by default while developing');
  assert.equal(qbReadsShown({ devQbReads: false }), false, 'the Developer Tools switch turns them off');
  assert.equal(qbReadsShown({}, { live: true }), false, 'the live read ring stays off unless switched on');
  assert.equal(qbReadsShown({ qbReads: true }, { live: true }), true);
  // the released build: same function with release on
  const src = fs.readFileSync('src/ui/qb-read-ui.js', 'utf8'); assert.match(src, /if \(!devDisplaysAllowed\(\)\) return false;/);
  assert.match(fs.readFileSync('src/version.js', 'utf8'), /export const devDisplaysAllowed = \(\) => !BUILD\.release;/);
});

test('every in-game QB read display goes through the gate; the player Settings screen no longer offers it', () => {
  const match = fs.readFileSync('src/ui/screens/match.js', 'utf8'), practice = fs.readFileSync('src/ui/screens/practice.js', 'utf8'), menu = fs.readFileSync('src/ui/screens/menu.js', 'utf8');
  assert.ok(!/qbRead: true/.test(match) && !/qbRead: !!f\.settings\.qbReads/.test(match), 'match field uses the gate');
  assert.match(match, /anim\.ev\?\.sim\?\.qb && qbReadsShown\(f\.settings\) \? qbReadPanelHtml\(/);
  assert.match(practice, /prac\.sim\?\.qb && qbReadsShown\(/);
  const settings = menu.slice(menu.indexOf("registerScreen('settings'"), menu.indexOf("registerScreen('developer'"));
  assert.ok(!/data-change="qbreads"/.test(settings), 'not in player Settings');
  const dev = menu.slice(menu.indexOf("registerScreen('developer'"));
  assert.match(dev, /data-change="devqbreads"/); assert.match(dev, /devDisplaysAllowed\(\) \?/);
});

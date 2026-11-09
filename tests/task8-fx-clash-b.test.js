// Task 8 Clash ability presentation, second half (Earth, Dark, Light, Metal, Psychic, Dragon): see task8-fx-clash-a.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, runElement, LOOKS } from './helpers/fx-clash.js';

const ELEMENTS_B = ['Earth', 'Dark', 'Light', 'Metal', 'Psychic', 'Dragon'];
const CAT = catalog(ELEMENTS_B);
test('this half covers 36 Clash abilities, each with its own look', () => { assert.equal(CAT.length, 36); for (const c of CAT) assert.ok(LOOKS[c.id], `${c.id} has a look`); });
for (const el of ELEMENTS_B) test(`${el}: every Clash ability x form x mastery shows every presentation phase (or declares it n/a) and draws cleanly at every quality`, () => { const n = runElement(el, CAT); assert.ok(n >= 24, `${el}: ${n} variants`); });

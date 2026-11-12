#!/usr/bin/env node
// Every Beast Dex line the game shows, under the key a translator's file uses for it (src/text/dex.js).
//   node tools/dex-text.mjs            prints { key: English line } as JSON
// The English here is read from the Dex data itself, so there is nothing to keep in step by hand: change the Dex
// (docs/beast-dex/data, then tools/build-beast-dex.mjs) and this list follows. tools/text-export.py puts these rows in the
// translator's sheet; tests/dex-text.test.js checks that every line a screen asks for is in the list.
import { FAMILIES, ABILITIES } from '../src/data/beast-dex.generated.js';
import { SPECS } from '../src/sim/abilities/review-texts.js';
import { dexKey, SECTION_SLUG } from '../src/text/dex.js';

/** The Dex mechanic line without the "ID: Name;" prefix some records carry (as src/ui/ability-info.js shows it). */
export const tidyMechanic = (a) => String(a.mechanic || '').replace(new RegExp(`^${a.id}:\\s*${a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};\\s*`), '');

export function dexEnglish() {
  const out = {};
  for (const f of FAMILIES) if (f.description) out[dexKey.familyDescription(f.id)] = f.description;
  for (const a of ABILITIES) {
    out[dexKey.abilityName(a.id)] = a.name;
    if (a.mechanic) out[dexKey.abilityMechanic(a.id)] = tidyMechanic(a);
    for (const d of a.details || []) if (SECTION_SLUG[d.section] && d.rule) out[dexKey.abilityRule(a.id, d.section)] = d.rule;
  }
  for (const [familyId, s] of Object.entries(SPECS)) if (s?.expect) out[dexKey.abilitySummary(familyId)] = s.expect;
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(JSON.stringify(dexEnglish(), null, 1) + '\n');

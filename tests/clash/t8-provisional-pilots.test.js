// PROVISIONAL (owner ruling 2026-11-09 rule 1): NOT part of the acceptance set. These cases exercise readings that are not approved
// (flags.js PROVISIONAL_POINTS), with config.provisional 'on', so a ruling can be checked against a working implementation. The
// acceptance cases for the same abilities are in tests/clash/t8-pilots.test.js (normal gameplay: `awaiting ruling`).
import '../../src/clash/t8/index.js';
import { provisionalSuite } from './t8-ability-harness.js';

provisionalSuite(['FIR-03-C']);

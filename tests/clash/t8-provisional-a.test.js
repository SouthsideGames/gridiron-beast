// PROVISIONAL (owner ruling 2026-11-09 rule 1): NOT part of the acceptance set. Batch A readings that await a ruling (flags.js
// PROVISIONAL_POINTS: d13-values, d5-perk), exercised with config.provisional 'on' and labelled.
import '../../src/clash/t8/index.js';
import { provisionalSuite } from './t8-ability-harness.js';

provisionalSuite(['DAR-02-C', 'DAR-03-C', 'LIG-05-C', 'LIG-06-C', 'MET-04-C']);

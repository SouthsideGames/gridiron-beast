// N9c: former provisional scenarios now run with provisional mode OFF.
// PROVISIONAL (owner ruling 2026-11-09 rule 1): NOT part of the acceptance set. Batch E reading that awaits a ruling
// (feather-relay-voluntary), exercised with config.provisional 'on' and labelled.
import '../../src/clash/t8/index.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['WIN-01-C'], { minScenarios: 1, requiredKinds: [] });

// Task 8 M4 S8, batch C (healing and support, 11): acceptance contract cases on the real engine, every Dex form x mastery tier.
// Dawn Song (D14) and Clear Light (cooldown unit; D13) never activate in normal gameplay: their acceptance case is the explicit
// `awaiting ruling` report (owner ruling 2026-11-09 rule 1); their provisional cases are in tests/clash/t8-provisional-c.test.js.
import '../../src/clash/t8/index.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['WAT-01-C', 'NAT-01-C', 'NAT-06-C', 'ELE-01-C', 'ICE-01-C', 'LIG-01-C', 'PSY-01-C', 'DRA-02-C', 'DRA-03-C']);
contractSuite(['LIG-02-C', 'LIG-03-C'], { minScenarios: 1, requiredKinds: ['blocked'] });

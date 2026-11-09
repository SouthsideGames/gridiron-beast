// Task 8 M4 S6, batch A (attack modifiers and enhanced attacks, 16): the acceptance contract cases on the real engine, every Dex form x
// mastery tier, through the shared harness (tests/clash/t8-ability-harness.js). Provisional readings are excluded here (owner ruling
// 2026-11-09 rule 1); abilities that depend on one are accepted by their explicit `awaiting ruling` behaviour. The provisional cases
// are in tests/clash/t8-provisional-a.test.js.
import '../../src/clash/t8/index.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['DAR-02-C', 'DAR-03-C', 'DAR-04-C', 'LIG-05-C', 'DRA-01-C', 'DRA-05-C', 'DRA-06-C', 'MET-03-C', 'ELE-03-C', 'WIN-02-C', 'LIG-04-C', 'PSY-04-C', 'EAR-04-C', 'NAT-02-C']);
// Daybreak Lance (D13) and Iron Bite (D5) never activate in normal gameplay: their acceptance case is the awaiting-ruling report.
contractSuite(['LIG-06-C', 'MET-04-C'], { minScenarios: 1, requiredKinds: ['blocked'] });

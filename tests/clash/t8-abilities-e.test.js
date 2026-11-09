// Task 8 M4 S10, batch E (rotation and lineup, 7 + Shared Burden from S5): acceptance contract cases on the real engine, every Dex form
// x mastery tier. Feather Relay follows the owner's reconciled D3 ruling (a rotation with no P8 penalty, cadence and locks kept); its
// unaddressed "voluntary" status for the enemy rotation triggers is accepted by the explicit `awaiting ruling` report; the provisional
// reading is in tests/clash/t8-provisional-e.test.js.
import '../../src/clash/t8/index.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['FIR-02-C', 'WAT-05-C', 'WAT-06-C', 'ICE-02-C', 'WIN-03-C', 'WIN-01-C', 'WIN-04-C', 'NAT-04-C']);

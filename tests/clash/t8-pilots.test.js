// Task 8 M4 S5: the two pilot contracts, Falling Star (FIR-03-C: delayed, slot-marked, frozen targets, pre-KO strength) and Shared
// Burden (WAT-02-C: reserve link, 8c raw split, owner KO), run through the shared contract-case harness: every form x mastery value,
// trigger, activation, resolution, cleanup, the blocked cases the contracts name, and determinism.
import '../../src/clash/t8/index.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['FIR-03-C', 'WAT-02-C'], { minScenarios: 4 });

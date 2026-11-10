// N9d: these former provisional cases are approved acceptance scenarios and run without provisional mode.
import '../../src/clash/t8/index.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['LIG-06-C'], { minScenarios: 1, requiredKinds: [] });

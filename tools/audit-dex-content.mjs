import { auditDexContent } from '../src/dex/content-audit.js';
const result = auditDexContent();
console.log(`Beast Dex content: ${result.expanded}/${result.forms} expanded form drafts; ${result.remaining} remaining; ${result.families} live families.`);
for (const error of result.errors) console.error(error);
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
if (result.errors.length || (process.argv.includes('--require-complete') && result.remaining)) process.exitCode = 1;

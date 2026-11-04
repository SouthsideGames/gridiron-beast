// Diagnostic: run franchises on the instrumented tree and log every AI pick with its club's draft-time plan.
// Task 6 Phase B (planning tool; changes nothing). Apply docs/task6-phase-b/diagnostics/draft-log-instrumentation.patch to a scratch worktree first.
//   node tools/task6-b-draftdiag.mjs TREE 1-10 10 out.json   then   node tools/task6-b-misaligned-diag.mjs HARNESS.json out.json
const [,, root, seeds, seasons, out] = process.argv;
globalThis.__draftLog = [];
const { runFranchise } = await import(root + '/tools/franchise-soak.mjs'); const { leagueInvariants, withBoardReset } = await import(root + '/tools/league-soak.mjs');
const [a, b] = seeds.split('-').map(Number); const all = [];
for (let s = a; s <= b; s++) { globalThis.__draftLog = []; runFranchise(s, { seasons: Number(seasons), check: withBoardReset(leagueInvariants) }); all.push(...globalThis.__draftLog.map((x) => ({ seed: s, ...x }))); }
(await import('node:fs')).writeFileSync(out, JSON.stringify(all));
console.log(all.length, 'picks');

# M3 ability batch brief (for each element batch)

Base: `origin/task8-implementation` at or after 498591d. One branch per batch: `task8-m3-<elements>`.

## Rules (owner)
- Preserve every approved trigger, clock and exception exactly as written in the Dex contract (generated data) and the spec. Do not
  invent rules; where a contract is genuinely silent, choose the minimal reading, document it in the module header and list it.
- No stacking: a registered family never also runs its legacy effect (the engine skips legacy keys for registered families).
- Functional visuals only (events the reviewers and the field view can show); art polish is deferred.
- Labs, reviewers, previews and replays award nothing.

## Sources
- Contract: `node -e "import('./src/data/beast-dex.js').then(B=>console.log(JSON.stringify(B.abilitiesOf('<family>').football,null,1)))"`
  (eight sections; `ruling` and `supersededRule` show the approved overrides). Values: `approvedValues('<abilityId>')`.
- Spec: docs/beast-dex/SPECIFICATION_BASELINE.md §9–§13 and §20–§23; SPECIFICATION_APPENDICES.md (statuses, fields);
  docs/task8/FIELD_CLOCKS.md (G1–G3); docs/task8/APPROVAL_REGISTER.md; task8-overrides.json.
- Framework: src/sim/abilities/registry.js (hooks: playStart, tick, engage, tackleAttempt, catchPoint, fumble, playEnd,
  possessionChange; game-scope state; recordExecution for mastery events), pilots src/sim/abilities/emberfox.js (charge) and
  glimmer.js (zone, G2/G3 clocks). Engine ctx (engine.js `abilityCtx`): state, executed, queueField, createdFor, teamSide,
  canStartSignature (Eclipse), opponents, dist, applyStatus, statusOf, log, stats, ball, kickoff, twoPoint, isRun, rng (the
  abilities' own stream). Statuses: src/sim/t8/status-effects.js; fields: src/sim/t8/field-effects.js (field `strength` = the
  producing ability's percent; payload for extra data); rules.js drives field creation (G3), clocks and the Light end-of-play unit.

## Each family
1. `src/sim/abilities/<family>.js` registering its contract; add one import line to `src/sim/abilities/index.js`.
2. If a contract needs an engine capability that no hook or ctx entry provides, add the smallest generic hook/ctx entry in
   engine.js (named for the capability, never the ability), mark it `// M3 hook:`, and list it in the report.
3. Tests in `tests/task8-abilities-<elements>.test.js`: per contract, its trigger, core resolution, recharge/cooldown, lifetime,
   and every listed exception, on the real engine (synthetic lineups via tests/tools/lineup.js with `species/form/mastery/type/id` on
   the slot inputs, or rules.js game states). Probabilities: freeze tolerance and sample size before running (B12); guaranteed
   behaviour must hold in every case.
4. Keep green: tests/engine.test.js, tests/rules.test.js, tests/qb-read.test.js, tests/task8-*.test.js. Do not run the whole suite.

## Report
Base commit, branch head, per family: what was implemented, each choice where the contract is silent, any engine hook added, test
counts. Push the branch; do not merge, open PRs, touch main or publish. Commit trailers:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01R64AEXEW6htbxE8uuTvNi1

# Removed intermediate evidence: what it held and how to reproduce it (follow-up A-5, 2026-11-26)

The directories `reports/balance-impl/{baseline,phase3,phase4,phase5,r0,r1,r4,r10}/` were removed after the follow-up investigations.
Their findings are quoted, with numbers, in `IMPLEMENTATION_LOG.md` (unchanged; the paths it names are the files below) and in
`FINAL_REPORT.md`. The files themselves remain in git history: `git show dcb599a:reports/balance-impl/<dir>/<file>` (the last commit
that holds them) or `git checkout dcb599a -- reports/balance-impl/<dir>`. Each can also be regenerated on the commit it was measured
on with the command shown (all tools are observation-only and deterministic for a given seed).

| File | Measured | Command (tools/ unless stated) | Finding quoted in |
|---|---|---|---|
| baseline/ability-strength-top-24.json | Ability strength, audit code, 24 games | `task10-ability-strength.mjs` (games 24) | IMPLEMENTATION_LOG "corrected baselines" |
| baseline/defense-fix-compare-120.json | Defence fix comparison, 120 games | `defense-fix-compare.mjs --games=120` | same |
| baseline/passing-calibration-120.json | Passing with abilities on/off, 120 games | `passing-calibration.mjs --games=120` | same (completion 59.7% off, 55.0% on) |
| r0/board-trace-{rookie,pro,allstar}-seed{1,2,3}.json | Board forecast traces | `balance-audit/board-trace.mjs --difficulty=D --seed=S` | R-0 |
| r1/attr-sweep-n200.json, r1/probe-*.json | Attribute sweeps, R-1 probes (n 200 / 300, levels 30–95) | `balance-audit/attr-sweep.mjs --n=200`, `balance-audit/r1-probe.mjs --n=300` | R-1 |
| r1/game-study-500-mixed*.json, r1/position-leverage-150.json | 500-game study, leverage 150 | `balance-audit/game-study.mjs --games=500 --seed=1`; `position-leverage` (attr-leverage recipe) | R-1 |
| r4/drift-*.json, r4/fr15-*.json.gz, r4/fr15-summary-*.json | aiDev calibration (persistent mode, seeds 1–4 × 8 seasons); 15-season runs | `balance-compare.mjs --mode=persistent --difficulty=D --seeds=1-4` with DIFFICULTY.aiDev as named; `ai-franchise-benchmark.mjs --seeds=3 --seasons=15 --difficulty=D --owner=repair --board=content` | R-4 |
| r10/clash-focus-{before,after-fixed}.json | Clash ability effect, 2,000 / 4,000 battles | `balance-audit/clash-focus.mjs --only=... --n=4000` | R-10 (the old all-abilities measure; see FOLLOW_UP_REPORT §6.1) |
| phase3/game-study-500-*.json, phase3/roster-strategy-150.json | 500 games seed 1 after R-7 / R-8+R-10+R-14; roster strategy 150 games q60 | `balance-audit/game-study.mjs --games=500 --seed=1`; `balance-audit/roster-strategy.mjs --games=150 --quality=60` | R-7, R-2 |
| phase4/game-study-300-q{52,64}.json | Equal-quality clubs, 300 games, seed 7 | `balance-audit/game-study.mjs --games=300 --seed=7 --equal --qmin=Q --qmax=Q` | R-12 |
| phase5/*.json | Final engine: attribute leverage, sweep, 500-game study, position leverage 300 / 1,000, Speed strategies | `balance-audit/attr-leverage.mjs --attr=speed --bump=12 --games=120`; `attr-sweep.mjs --n=200`; `game-study.mjs --games=500 --seed=1`; position leverage bump 8; `roster-strategy.mjs --games=150 --quality=60 --only=speed` | R-2, R-16 |

Kept in place: `final/` (the final validation files), `followup/` (this follow-up), `ui/`, `r18-save-audit-seed3.json`, the reports.

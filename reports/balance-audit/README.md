# Balance audit, November 2026 (record)

The audit's findings, as approved by the owner on 2026-11-25. Implementation: branch `impl/balance-audit-2026-11`,
`reports/balance-impl/` and GDD §61.

**Removed in the implementation's cleanup (R-15, 2026-11-26), kept in git history:**
- `RECOMMENDED_CHANGES.md`: every recommendation (R-0 to R-19) is implemented, investigated or deferred, and each outcome is recorded
  in GDD §61 and the final implementation report. Retrieve it with `git show d1f2d79:reports/balance-audit/RECOMMENDED_CHANGES.md`.
- `raw/` (28 MB of tool outputs: game studies, franchise runs, sweeps, Board traces, Clash studies). The reports below quote what
  they measured, and the tools in `tools/balance-audit/` and `tools/` reproduce them from the seeds given in each report. Retrieve
  a file with `git show d1f2d79:reports/balance-audit/raw/FILE`.

Links in the reports below to `raw/` or `RECOMMENDED_CHANGES.md` point to those files at commit `d1f2d79`.

# Reproduce the 15-season runs

These runs back FINAL_CALIBRATION_REPORT §3, §4 and §10. The raw run files (each about 2 MB compressed) are not committed. Regenerate them with `node tools/balance-audit/calib-experiment.mjs`, run from the repository root at commit 230e3ba.

| Group | Arguments |
|---|---|
| Pro | `--seeds=N --difficulty=pro --seasons=15 --owner=repair --board=content --quiet` |
| Rookie −4 | `--seeds=N --difficulty=rookie --seasons=15 --owner=repair --board=content --quiet` |
| Rookie −7 | `--rookieQuality=-7 --seeds=N --difficulty=rookie --seasons=15 --owner=repair --board=content --quiet` |
| All-Star | `--seeds=N --difficulty=allstar --seasons=15 --owner=repair --board=content --quiet` |

Notes:
- Run each group with N = 3 and N = 4.
- Add `--json=<group>-sN.json` to every run so the analysis tools below can read it.

Analyse the run files with:

```
node tools/balance-audit/difficulty-study.mjs --group=label:a.json,b.json ...
node tools/balance-audit/cap-analyze.mjs --cap=1600000 --group=label:a.json,b.json ...
```

Their outputs are `difficulty.json` and `cap.json` in this folder.

#!/usr/bin/env bash
# Task 6 Phase 0: the v42.17.0 baselines (observational; nothing here writes to a save or to the source tree). One JSON per job, in
# parallel lanes, resumable (a job whose JSON exists is skipped). Run from a tree that has harness v4.
#
#   tools/task6-baseline.sh --out=DIR [--root=TREE] [--lanes=2] [--label=v42170] [--only=harness,scenarios,contract,drift,repeat]
#
# Jobs (the approved seed sets, docs/TASK6_PHASE0_METHODOLOGY.md §2):
#   harness   ai-franchise-benchmark v4, Pro: B 1–60 × 10 seasons (groups of 10, as the Task 5.5 v3 files), held-out 61–80 × 10,
#             C 106–115 × 20 (106–108, 109–110 as the v3 files; 111–115), held-out C 116–125 × 20
#   scenarios the six stress scenarios, seeds 1–5 × 6 seasons
#   contract  GDD §45.6: tools/balance-compare.mjs, persistent and legacy, seeds 1–8 × 8 seasons, on each difficulty
#   drift     owner difficulty drift: balance-compare persistent with the board reset, seeds 1–12 × 20 seasons, on each difficulty
#   repeat    reproducibility: B 51–60 run a second time into a separate file (must give the same hash)
#   drift24   All-Star drift seeds 13–24 (with drift: 24 seeds), formal phase validation only (owner 2026-10-30)
set -u
declare -A A=([out]="" [root]="" [lanes]=2 [label]=v42170 [only]=harness,scenarios,contract,drift,repeat)
for x in "$@"; do k="${x#--}"; k="${k%%=*}"; v="${x#*=}"; A[$k]="$v"; done
[ -z "${A[out]}" ] && { sed -n 2,14p "$0"; exit 2; }
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="${A[root]:-$(dirname "$HERE")}"; OUT="${A[out]}"; L="${A[label]}"; mkdir -p "$OUT"; JOBS="$OUT/jobs.txt"; : > "$JOBS"
has() { [[ ",${A[only]}," == *",$1,"* ]]; }
job() { local f="$OUT/$1.json"; [ -s "$f" ] || echo "$2 > $OUT/$1.out 2>&1" >> "$JOBS"; }
H="node $HERE/ai-franchise-benchmark.mjs --root=$ROOT --difficulty=pro --quiet"
BC="node $HERE/balance-compare.mjs"
if has harness; then
  # long 20-season jobs first, so the lanes finish together
  for r in 106-108 109-110 111-115 116-120 121-125; do job "$L-C-$r" "$H --seeds=$r --seasons=20 --label=$L-C-$r --json=$OUT/$L-C-$r.json"; done
  for r in 1-10 11-20 21-30 31-40 41-50 51-60 61-70 71-80; do job "$L-B-$r" "$H --seeds=$r --seasons=10 --label=$L-B-$r --json=$OUT/$L-B-$r.json"; done
fi
if has drift; then for d in rookie pro allstar; do for r in 1-6 7-12; do job "$L-drift-$d-$r" "$BC --mode=persistent --boardReset=1 --difficulty=$d --seeds=$r --seasons=20 --json=$OUT/$L-drift-$d-$r.json"; done; done; fi
# formal phase validation only (owner 2026-10-30): All-Star drift on 24 seeds
if has drift24; then for r in 13-18 19-24; do job "$L-drift-allstar-$r" "$BC --mode=persistent --boardReset=1 --difficulty=allstar --seeds=$r --seasons=20 --json=$OUT/$L-drift-allstar-$r.json"; done; fi
if has contract; then for d in rookie pro allstar; do for m in persistent legacy; do job "$L-contract-$d-$m" "$BC --mode=$m --difficulty=$d --seeds=1-8 --seasons=8 --json=$OUT/$L-contract-$d-$m.json"; done; done; fi
if has scenarios; then for s in aging expiring thin injuries rebuild picks; do job "$L-D-$s" "$H --seeds=1-5 --seasons=6 --scenario=$s --label=$L-D-$s --json=$OUT/$L-D-$s.json"; done; fi
if has repeat; then job "$L-B-51-60-repeat" "$H --seeds=51-60 --seasons=10 --label=$L-B-51-60-repeat --json=$OUT/$L-B-51-60-repeat.json"; fi
echo "$(wc -l < "$JOBS") jobs, ${A[lanes]} lanes, root $ROOT, started $(date -Is)" | tee -a "$OUT/jobs.log"
xargs -P "${A[lanes]}" -I{} bash -c '{}; echo "done $(date +%T) {}" | sed "s#--root=[^ ]*##" | cut -c1-160 >> "'"$OUT"'/jobs.log"' < "$JOBS"
echo "all jobs finished $(date -Is)" | tee -a "$OUT/jobs.log"

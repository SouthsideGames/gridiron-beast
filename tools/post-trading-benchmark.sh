#!/usr/bin/env bash
# Runs the AI Franchise Benchmark stages (Task 4 definitions) on one or more source trees, in parallel lanes, one JSON per job.
# Used for the Task 5 before/after comparison and, unchanged, for the Task 5.5 checkpoint.
#
#   tools/post-trading-benchmark.sh --out=DIR --tree=base=/path/to/v42.16.0,t5=/path/to/this/tree \
#       [--valuation=/path/to/src/franchise/trade-value.js] [--B=1-10,11-20] [--C=101-103,104-105] [--D=1-5] \
#       [--bseasons=10] [--cseasons=20] [--dseasons=6] [--stages=B,C,D] [--lanes=2] [--difficulty=pro]
#
# Output: DIR/<tree>-B-<seeds>.json, <tree>-C-<seeds>.json, <tree>-D-<scenario>.json and DIR/jobs.log. Jobs are ordered so that
# every tree finishes the same stage at about the same time. Re-running skips jobs whose JSON already exists (resumable).
# Nothing here writes to a save or to the source trees. Always run from the tree that has the extended harness.
set -u
declare -A A=([B]=1-10,11-20 [C]=101-103,104-105 [D]=1-5 [bseasons]=10 [cseasons]=20 [dseasons]=6 [stages]=B,C,D [lanes]=2 [difficulty]=pro [valuation]="" [tree]="" [out]="")
for x in "$@"; do k="${x#--}"; k="${k%%=*}"; v="${x#*=}"; A[$k]="$v"; done
[ -z "${A[out]}" ] || [ -z "${A[tree]}" ] && { sed -n 2,12p "$0"; exit 2; }
HERE="$(cd "$(dirname "$0")" && pwd)"; OUT="${A[out]}"; mkdir -p "$OUT"; JOBS="$OUT/jobs.txt"; : > "$JOBS"
SCEN=(aging expiring thin injuries rebuild picks)
IFS=',' read -ra TREES <<< "${A[tree]}"
emit() { # label root name seeds seasons scenario
  local label="$1" root="$2" name="$3" seeds="$4" seasons="$5" scen="$6" f="$OUT/$1-$3.json"
  [ -s "$f" ] && return
  local cmd="node $HERE/ai-franchise-benchmark.mjs --root=$root --seeds=$seeds --seasons=$seasons --difficulty=${A[difficulty]} --label=$label-$name --json=$f --quiet"
  [ -n "$scen" ] && cmd="$cmd --scenario=$scen"; [ -n "${A[valuation]}" ] && cmd="$cmd --valuation=${A[valuation]}"
  echo "$cmd" >> "$JOBS"
}
for stage in ${A[stages]//,/ }; do
  case "$stage" in
    B) IFS=',' read -ra R <<< "${A[B]}"; for r in "${R[@]}"; do for t in "${TREES[@]}"; do emit "${t%%=*}" "${t#*=}" "B-$r" "$r" "${A[bseasons]}" ""; done; done ;;
    C) IFS=',' read -ra R <<< "${A[C]}"; for r in "${R[@]}"; do for t in "${TREES[@]}"; do emit "${t%%=*}" "${t#*=}" "C-$r" "$r" "${A[cseasons]}" ""; done; done ;;
    D) for s in "${SCEN[@]}"; do for t in "${TREES[@]}"; do emit "${t%%=*}" "${t#*=}" "D-$s" "${A[D]}" "${A[dseasons]}" "$s"; done; done ;;
  esac
done
echo "$(wc -l < "$JOBS") jobs, ${A[lanes]} lanes, started $(date -Is)" | tee -a "$OUT/jobs.log"
xargs -P "${A[lanes]}" -I{} bash -c '{} >/dev/null 2>>"'"$OUT"'/jobs.err"; echo "done $(date +%T) {}" | sed "s#--root=[^ ]*##" | cut -c1-150 >> "'"$OUT"'/jobs.log"' < "$JOBS"
echo "all jobs finished $(date -Is)" | tee -a "$OUT/jobs.log"

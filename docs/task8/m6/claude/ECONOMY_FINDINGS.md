# M6 economy and AI: roster completion, cap room, Apex ask (2026-11-10)

**Status: no production change. Two decisions for the owner at the end.** Simulation f716b02.

## 1. The two rosters without a kicker: not a defect

`node tools/task8-m6-coverage-scan.mjs . SEED 20 OUT` (evidence: `position-coverage.json`).

- **Reproduced.** Seed 2 shows Eastport Phantoms after year 8 and Sundown Drakes after year 20 with 38 monsters and no kicker,
  exactly as the handoff reports.
- **Cause: where the snapshot is taken.** The benchmark records its "post-offseason" row before the game starts the next
  season. The league's last free-agency fill, its cap trim and its legal-lineup cover run inside that start
  (`startNextSeason`: `leagueFreeAgency`, `leagueTrim`, `leagueInjuryCover`, `validateClubs`).
- **After each season start:** 57 starts across seeds 1–3, **0 clubs** missing a position or with an illegal lineup. Eastport has
  a kicker at the start of year 9.
- **Before every kickoff:** 8,505 club-weeks, **0 flags.**
- **Sundown, year 20:** a franchise ends after 20 seasons (`startNextSeason` refuses a 21st), so that roster never plays.

No fix was made. If the benchmark's snapshot should describe rosters that will actually play, it should be taken after the next
season starts (`--measure=start` already exists in `tools/ai-franchise-benchmark.mjs`).

## 2. Spare cap room

`node tools/task8-m6-economy-review.mjs` over the recorded seeds 1–3 × 20 seasons (900 AI club-seasons; `economy-review.json`),
and a pre-Task 8 baseline on main 43976f4, seeds 1–3 × 10 seasons (`economy-baseline-main.json`).

**The market works.**

| Measure | Result |
| --- | --- |
| AI free-agent signings with two or more bidders | 50.8% (three or more: 31.2%) |
| Mean salary by number of bidders (1 / 2 / 3) | $28,200 / $31,300 / $33,200 |
| Extensions offered and signed | 10,880 offered, 81.4% signed; 735 declined by starters |
| Free agents still unsigned when a market closes | 25.9 on average |
| Market integrity problems | 0 in 60 markets |
| Weakest four clubs, three seasons later | 70.6% stronger (mean +2.7 OVR); 66.7% reach the playoffs within five seasons |
| Parity | 19 different AI clubs won the 57 AI titles; team OVR 54 / 59 / 64 at the 10th / 50th / 90th percentile |

**Cap room does not separate good clubs from bad.** Contending clubs average $365,800 of room, rebuilding clubs $391,700;
playoff clubs $374,600, the rest $389,900.

**The cap did not bind before Task 8 either.** First ten seasons, 450 AI club-seasons each:

| | Pre-Task 8 (main) | Task 8 | Change |
| --- | --- | --- | --- |
| Mean roster payroll | $1,148,600 | $1,025,900 | −10.7% |
| Highest roster payroll | $1,262,400 | $1,121,100 | |
| Mean cap room | $246,400 (13.7% of the cap) | $369,100 (20.5%) | +$122,700 |
| Least cap room any club had | $132,600 | $273,900 | |
| Median rostered OVR | 61 | 49 | −12 |
| Median starter OVR | 68 | 58 | −10 |

- **Why:** salary is $18,000 + $280 × OVR, and Task 8's Dex ratings are lower. About 12 OVR points × $280 × 37 monsters is the
  $123,000 of extra room.
- **Why it cannot be spent:** a full 38-monster roster of the highest salaries recorded would still fit. The highest roster
  payroll seen is $1.12M; with the $405,000 staff allowance that is $1.53M against $1.8M.

**Conclusion.** Spare room is a property of the salary formula, present before Task 8 and about $123,000 larger now. Bidding,
extensions, rebuilding and parity show no sign that it is distorting the league. I do not recommend lowering the cap.

**Options for the approved recalibration (item 30, "numbers reported for review"). None applied.**

| Option | Effect | Cost |
| --- | --- | --- |
| A. Leave as it is | Room stays about 20% of the cap; the league behaves as measured above | None |
| B. Shift the salary base by $3,300 (to $21,300 + $280 × OVR) | Restores the pre-Task 8 payroll and 14% room; relative pay unchanged | Every contract number changes; still not a binding cap |
| C. Map salary to the league percentile of OVR (the direction recorded for D3) | Restores the old pay spread | Flattens pay among weak Basics, which decision 30 warns against |
| D. Make the cap bind (steeper pay for top ratings) | Real cap decisions | A new design; needs its own proposal and benchmarks |

My recommendation is **A** for this release, with B as the smallest change if you want the pre-Task 8 level back. Neither C nor
D should be chosen from this evidence alone.

## 3. Apex contract ask (B9): approved, not implemented

- **Approved rule (B9, in the specification baseline):** ask = salary(current OVR) + 0.5 × (salary(OVR 99) − salary(current OVR)); "an undeveloped Apex
  would ask about 33,540".
- **In the code:** `salaryFor` is the ordinary formula for every monster. An undeveloped Apex (OVR 12) asks **$21,360**, less
  than an ordinary OVR-30 rookie ($26,400). No contract, market, draft or trade code reads the Apex flag.
- **Effect seen in real runs:** see `BALANCE_ACCEPTANCE.md` (Apex accumulation).
- **Why I did not implement it:** the ask is shown on prospect, draft and free-agent cards. A $33,540 ask on an OVR-12 prospect
  identifies an unidentified Apex, which §5 forbids. The rule needs one more ruling first (decision 2 below).

## Decisions for the owner

1. **Cap room:** A (leave), B (shift the base), or commission C or D as a separate proposal.
2. **Apex ask and concealment.** Options: (a) the Apex ask applies everywhere but the player sees the ordinary-looking figure
   until he has discovered the Apex, and pays the real ask when he signs him (which also reveals him); (b) the Apex ask applies
   only once an Apex is known to the club making the offer, AI clubs included, under the knowledge rules of B16; (c) keep the
   ordinary ask and withdraw B9. My recommendation is (b): it is the reading closest to "AI follows equivalent knowledge rules"
   and it never leaks. Any of them is a simulation change with its own commit and regression.

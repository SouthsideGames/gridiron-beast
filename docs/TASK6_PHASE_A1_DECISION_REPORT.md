# Task 6 Phase A-1 — Decision Report (2026-10-31)

This report answers the owner's review of the Phase A-1 results (2026-10-31). It covers four items:
1. the development preview;
2. the owner win-rate drift diagnostic;
3. the early-retirement methodology;
4. the breakdown of 33+ monsters who still improve.

**No gameplay code was changed.** The full benchmark and the full test suite were not re-run. The completed validation results (`docs/task6-phase-a1/`) are preserved unchanged.

## 1. Development preview — published
- **What:** `v42.18.0-dev.a1` (commit `caee962`) is published to the private test link https://claude.ai/artifact/YaeuhvNLm5HS8ZG2YKg6Tj, as artifact version `1793451979-9db2`.
- **Contents:** 162 files, replacing the old v39.2 test build.
  - It is the validated code `a57c255`, with only the version label and the test-build switch (developer shortcuts) changed.
- **Verified after publishing:**
  - the live list has 162 files;
  - the sha-256 of the page, `src/version.js`, `src/data/aging.js`, `src/franchise/retirement.js`, `src/franchise/franchise.js`, `src/data/monsters.js`, `src/ui/screens/roster.js` and `styles/app.css` match the local build byte for byte;
  - `src/version.js` on the live link reads `v42.18.0-dev.a1`, `test: true`;
  - the folder was also loaded in headless Chromium and imported a save.
- **Capabilities** (db, downloads, user) and runtime contract 0.2.77 were carried forward.
- **Not touched:** the main game link (still artifact version 115, v42.17.0) and every PR.
- **Limit:** the claude.ai page cannot be opened from the development environment, so the owner's first open is the final live check.

## 2. Owner win-rate drift — the diagnostic did not pass
**Run as approved.**
- **Proxy:** an *active-replacement* owner proxy. After the draft, it signs the best affordable free agent at the position of each of its starters who retired that offseason (`tools/balance-compare.mjs --owner=active`, tools only).
- **Sample:** Rookie and Pro, seeds 1–12 × 8 seasons.
- **Baseline:** the v42.17.0 drift baseline.
  - v42.17.0 has no retirement, so the active policy can never act there; the existing baseline is therefore the appropriate one, and no baseline was re-run.

| Difficulty | v42.17.0 | A-1, passive owner | A-1, active-replacement owner | Gate (±5) |
|---|---|---|---|---|
| Rookie, seasons 1–8 | 76.9% | 71.3% (−5.6) | 71.2% (**−5.7** [−10.3, −0.9]) | fail |
| Pro, seasons 1–8 | 61.0% | 53.1% (−7.9) | 52.1% (**−8.9** [−12.9, −4.5]) | fail |

**Why the active policy changed nothing** (`docs/task6-phase-a1/diagnostics/`):
- The owner's starters retire rarely in seasons 1–8: 31 times across 48 franchise runs.
- **In 30 of those 31 cases there was no affordable replacement.** The hands-off owner re-signs every expiring contract at its ask and sits at or over the cap, so the policy had no room to act.

**What the evidence says about the cause.**
- **Retirements are not the main driver in seasons 1–8.** The gap comes from **decline of the owner's un-refreshed founding roster**. The owner's team overall stalls from season 5 (Pro: 68.0 against 69.3 at season 5, 66.4 against 69.3 at season 8), while AI clubs are kept at their anchor by the nudge.
- **Managing that decline would take a different owner proxy:**
  - letting declining veterans walk;
  - using the cap room for younger players;
  - drafting for need.
- **This is also a real asymmetry in the balance system.** The AI is refreshed at its anchor automatically; the owner must manage the decline.
- **Neither the simple active policy nor this data separates the game from the proxy.**

**Status.**
- The diagnostic **did not pass**.
- The original gate is **not passed**; it stays failing and **unresolved**.
- Per the instruction, it is **not** documented as an interim issue on the strength of a passing diagnostic.

## 3. Early-retirement methodology — corrected and documented
- **Original definition** (Phase 0, 2026-10-30): position base = normal onset + 5, so early = age ≤ onset + 3 and exceptional = age ≥ onset + 8.
- **Corrected definition:** base = normal onset + 4 (the career age), so early = age ≤ onset + 2 and exceptional = age ≥ onset + 7.
- **Why the correction was needed:** the approved bands (early ≤ 30%, backup QB ≤ 35%; exceptional 3–20%, K ≤ 40%) were calibrated by the Group 1 projection, which counted on onset + 4. Phase 0 transcribed onset + 5 by mistake.
- **Where it is recorded:**
  - methodology §3 and the §8 change log;
  - `thresholds.json` version 3;
  - `tools/task6-analyze.mjs`, which uses the corrected base and still reports the original as `earlyPctOrig` / `exceptionalPctOrig`.
- **Retirement mechanics:** unchanged.

**Result on the corrected definition** (A-1, C and CH):
- early retirements 19–27% at every position (≤ 30%);
- exceptional retirements 8–16% (3–20%, kickers included).
- **Met.**

## 4. Age 33+ still improving — breakdown
The original **≤ 2% target stays visible and is not met.**
- **Method:** `tools/task6-improve33-breakdown.mjs` takes every AI monster-season at 33+ whose overall rose and puts it in exactly one category, in this order:
  1. evolution that season;
  2. kicker;
  3. not yet past his own decline onset;
  4. technique compensating while physical attributes fell;
  5. physical net gain past onset;
  6. no decline applied past onset.
- Categories 5 and 6 would contradict the approved rules.

| Category, % of all 33+ monster-seasons | B (1–60) | Held-out (61–80) | C (106–115) | CH (116–125) | v42.17.0, B |
|---|---|---|---|---|---|
| **Overall improving** | **9.09%** | 10.12% | 7.36% | 7.66% | 24.85% |
| Kicker technique, inside the approved curve (technical onset 35) | 3.83% | 4.11% | 3.28% | 3.70% | 1.56% |
| Evolution seasons (an evolution's attribute gains) | 4.43% | 4.91% | 3.17% | 2.85% | 3.75% |
| Ordinary: before his own decline onset (longevity) | 0.26% | 0.35% | 0.27% | 0.33% | 0.07% |
| Ordinary: technique compensating while physical attributes fell | 0.56% | 0.75% | 0.65% | 0.78% | 13.93% |
| **Contradicting the rules:** physical net gain past onset | **0.00%** | 0.00% | 0.00% | 0.00% | 5.54% |
| **Contradicting the rules:** no decline applied past onset | **0.00%** | 0.00% | 0.00% | 0.00% | 0.00% |

**Reading.**
- **No improvement contradicts the approved ageing rules.** v42.17.0 had 5.5% physical gains past onset.
- Ordinary improvement is **0.82%**, inside 2%.
- The rest comes from two mechanisms the approved specification keeps:
  - **kickers'** late technical curve;
  - **evolutions**, which are age-independent: 37–49% of all 33+ improvements fall in an evolution season.
- **Approximation:** the onset uses current durability (the harness does not record durability at peak).

**Recommendation** (owner decision; nothing changed):
- Clarify the target as *"≤ 2% ordinary improvement at 33+, with kicker-curve and evolution seasons reported separately"*.
- Separately decide whether evolutions at 33+ should keep their full gains. That would be a gameplay change, for a later phase if wanted.

## 5. Decision summary

**Passed** (unchanged from the validation):
- integrity, determinism and non-interference;
- full suite 782 of 782;
- save compatibility;
- §45.6 contract on all difficulties;
- Stage P +1.8%;
- phone-width UI;
- every A-1 ageing and retirement target, including early/exceptional retirements on the corrected definition and the old-save transition (2.0× peak);
- the preview is published and verified.

**Unresolved:**
1. **Owner drift, seasons 1–8 (hard gate):** Rookie −5.6 and Pro −7.9 (passive); −5.7 and −8.9 (active-replacement). It fails, and the diagnostic could not separate game balance from the passive proxy, because the proxy has no cap room.
2. **33+ improvement:** 9.1% against ≤ 2%. The breakdown shows 0% rule contradictions; this awaits the owner's decision on clarifying the target.
3. **The owner's own manual testing of the preview** is in progress.

**Code changes recommended:** **none for A-1's gameplay.** The ageing rules behave as specified, and the drift question is not answered by changing them.

**Possible next steps** (each needs authorisation):
- **(a)** A second diagnostic with an *active-manager* owner proxy (tools only, about 30 minutes). It would let expiring monsters at or past their public onset + 2 walk, then sign the best affordable replacements. This tests whether managed turnover keeps seasons 1–8 within ±5.
- **(b)** Carry the drift gate, still binding, to milestone M1, where A-2 (nudge recalibration, draft scaling) and B change how both sides refill.

**Phase A-1 readiness:** **remain open.** It is not ready for final approval while the drift hard gate is unresolved. It is functionally complete and the preview is live for manual testing. The recommended path is (a); then either approve A-1 with the drift documented as an interim integration issue (if the managed owner passes), or keep it open until A-2 and B are integrated.

## 6. Owner decision (2026-10-31): Option B
Recorded as the owner gave it. No gameplay code was changed, no PR was merged and no build was published for this record.

1. **Phase A-1 mechanics: provisionally accepted as implemented.** Ageing and retirement function as designed. No gameplay changes are authorised.
2. **Difficulty drift: an unresolved, binding requirement.**
   - It is not passed and not waived, and the ±5-point tolerance stands.
   - It is evaluated at the integrated release milestone after Phases A-2 and B (milestone M1), on the formal drift sample: Rookie and Pro on 12 seeds, All-Star on 24.
   - **The owner's reading of the evidence:** ageing and retirement work as designed, while the simulated owner and the AI roster-management systems are not yet equipped to respond to turnover.
3. **Early-retirement methodology: the documented correction is approved.**
   - The base is normal onset + 4, matching the originally approved position-specific ranges (methodology §8, thresholds version 3).
   - The original definition's figures stay reported.
4. **Age 33+ improvement: ordinary improvement is measured against ≤ 2%.**
   - Kicker progression and evolution seasons are reported separately.
   - The original overall result (**9.09%**, seeds 1–60) is preserved for transparency.
   - Current standing:

     | Measure | Result | Threshold |
     |---|---|---|
     | Ordinary improvement | **0.82%** | ≤ 2%: met |
     | Kicker progression | 3.83% | reported separately |
     | Evolution seasons | 4.43% | reported separately |
     | Contradicting the ageing rules | 0% | — |

5. **Additional diagnostics:** no further owner-management diagnostic and no repeat of the full benchmark at this time. The option (a) diagnostic in §5 is not authorised.
6. **Manual testing:** the owner is testing the published preview (`v42.18.0-dev.a1`, private test link) and will report any issues.

**Status:**
- **Phase A-1 stays open** for final integration validation at M1.
- PRs #83, #84, #85 and #86 stay open and unmerged.
- Phases A-2 and B are not authorised until the owner authorises them separately.

**Working method for the next steps** (owner, 2026-10-31): feature-complete development.
1. Implement the authorised scope.
2. Use lightweight checks during development.
3. Publish a stable preview.
4. Consolidate comprehensive testing at meaningful integration milestones.

# Task 7 — All-Star Difficulty Investigation (2026-11-05)

**Status:**
- Investigation only, on the development branch `task7-free-agency`. No gameplay, difficulty coefficient or negotiation value was changed.
- Nothing is merged or published, and the final benchmark has not been run.
- Earlier results stay on record: the original pre-registered results, `TASK7_REMEDIATION_RESULTS.md`, `TASK7_AMBITION_STAFF_RESULTS.md` and `TASK7_NEGOTIATION_RESULTS.md`.

**Method:**
- The drift benchmark's own franchise (persistent league, board reset, hands-off owner), 12 seeds × 8 seasons per difficulty, run by a read-only recorder that also logs every owner game and offseason.
- **Builds compared:** v42.21.0, the pre-Ambition remediation build, and the current build (`bc75960`).
- **Owners compared:** the unchanged hands-off owner; a **repair** variant (the hands-off owner, plus doing what the game's lineup warning asks: sign a legal monster for an open starting slot); and the **negotiating owner** asked for in §7.
- **Reproduction check:** the recorder reproduces the drift results exactly: All-Star 39.5 / 35.3 / 32.6, Pro 53.1, Rookie 69.4.

---

## 1. All-Star root cause

The automated owner's All-Star win rate fell from 39.5% (v42.21.0) to 32.6% (current), −6.9 points.

**Confirmed:**

| Contribution | Points | Evidence |
|---|---|---|
| **Forfeited games** (open starting slots) | **≈ −2.9** | The hands-off owner forfeits 75 of 864 regular-season games (8.7%) in the current build, 50 (5.8%) in the remediation build and 1 in v42.21.0. The repair owner forfeits 3 and wins **35.5%**. |
| **Everything else**, on games actually played | **≈ −4.0** | Played-game win rate: v42.21.0 39.5 → remediation 37.5 → current 35.7; repair owner 35.5. |
| of which: Task 7 before the Ambition | ≈ −2.0 | v42.21.0 → remediation, played games |
| of which: the Ambition and the negotiations | ≈ −1.8 | remediation → current, played games. The owner loses 0.74 starters per offseason to expiring contracts that are not renewed (remediation 0.26, v42.21.0 0). Renewal retention is 91% (remediation 95%, v42.21.0 100%). |

**Why the forfeits happen (confirmed in the game code and on a traced seed):**
- The final single-position rule (D6, approved) removed secondary eligibility. In v42.21.0 `canPlay` let, for example, a safety cover a cornerback slot; now only a cornerback may play there.
- When the owner has fewer healthy monsters at a position than the starting slots need, there is no legal lineup, and the game records a forfeit (GDD §17.2).
- The hands-off benchmark owner signs the cheapest free agents to reach the roster minimum, without regard to position. On seed 1 it held five kickers and one cornerback. It never repairs an open slot.
- So once a slot opens, it forfeits every game until the offseason: whole 0-9 seasons. All-Star now has 10 such seasons in 96, against 1 in v42.21.0.
- Departures through the Ambition make open slots more likely, which is why the current build forfeits more than the remediation build.
- A player is told: the R5 warnings name the slot, the position and the fix, on the lineup screen and in the GM Assistant. The benchmark owner never reads them.

**Shared with Rookie and Pro (documented as asked):**

| Difficulty | Hands-off (current) | Forfeits | Repair owner | v42.21.0 |
|---|---|---|---|---|
| Rookie | 69.4% | 48 | 71.4% | 73.7% |
| Pro | 53.1% | 81 | 55.6% | 58.1% |
| All-Star | 32.6% | 75 | 35.5% | 39.5% |

**The remaining decline on played games:**
- **Not roster strength.** The owner's team overall is unchanged (All-Star mean 68.34 now against 68.33 in v42.21.0). The strength gap to his opponents is unchanged (−3.7 in seasons 5–8 in every build). The AI clubs are not stronger (mean 70.3 against 70.7).
- **Hypothesis 1 (not confirmed):** at an equal strength gap the owner wins fewer played games in both Task 7 builds than in v42.21.0. In the −3 to 0 gap band he won 45% in v42.21.0, against 38% (remediation) and 37% (current). The same pattern appears before the Ambition, so the cause is a Task 7 change that strength numbers do not show. The likeliest is the one-position rule on the field: no cross-position substitutes during a game, and package plays dropping out when a position is thin. The benchmark owner's position-blind roster suffers more from it than the AI clubs' balanced 38-monster rosters.
- **Hypothesis 2 (not confirmed):** the benchmark owner now spends less on monsters. v42.21.0 let him re-sign everyone over the cap (payroll 1.83M against a 1.8M cap). The approved D8 rule now forbids that, and the hands-off owner leaves about 125,000 credits of room unused. AI clubs fill to their cap.

---

## 2. Fairness audit

**Task 7 systems: the same rules for the owner and the AI (confirmed in the code):**

| Check | Finding |
|---|---|
| Ambition rules | One function for every club: `rateOffer`, `talksOpen`, `negotiation`, `negotiate`. No code path reads whether the club is the owner's. The one difference is how a monster's tenure is counted for Loyalty: the owner's roster stores the year he joined (`joined`) instead of a club-history line. It counts the same seasons. |
| Acceptance calculations | Identical: `negotiate` has no owner branch. |
| Negotiation attempts | Two counteroffers per window for every club (`NEG.counters`). The AI loop never makes more (a test checks every stored negotiation). |
| Contract lengths, bonuses, cap | The same validation (`blocker`, cap checks before an offer counts, bonus rules). AI clubs negotiate at their own term; monster preferences count for both. |
| Monsters refuse both | Yes. In 400 offseasons AI clubs found 18% of early-extension monsters not negotiating; 15% of AI renewals failed; AI established starters walk 0.94 per club-season. |
| AI clubs lose important monsters | Yes: 75+ overall starters walk 0.17 per club-season, the v42.21.0 rate. |
| Owner's opportunities | The owner may negotiate in both extension windows at any time in a final season, and at renewal. The AI uses fixed windows (turn and week 6). **The hands-off benchmark owner uses none of the extension windows**, while AI clubs do: a difference of management, not of rules. |
| Task 7 and difficulty | No Task 7 code reads the difficulty: free agency, negotiation, Ambition, staff, strategy, draft affordability and migration (verified by search). |

**Existing difficulty mechanics (pre-Task 7, documented, unchanged):**

| Mechanic | Rookie / Pro / All-Star | What it does |
|---|---|---|
| Club quality target (`DIFFICULTY.quality`) | −4 / −1 / **+3** | The strength each AI club is held to (GDD §15.2). It is carried by the **balance nudge** (decision C): an AI club more than a band below its target gets generated arrivals at the target, and one far above it develops more slowly. |
| AI coach IQ | 0.6 / 1.0 / **1.5** (+0.2 for gyms) | Play-calling quality. |
| Opponent film | 1 / 2 / **3** play swaps | How much an AI coach adapts to the owner's tendencies. |
| Trade margin; generosity; incoming-call chance | 3% / 6% / **12%**; 1.35 / 1.0 / **0.78**; 0.32 / 0.26 / **0.20** | AI trading is tougher on harder difficulties. |
| Comeback lift | off / on / on | Applies to both sides. |

**Pre-existing asymmetries between the owner and the AI (approved earlier, not introduced by Task 7):**
- **In-season injury cover:** an AI club that cannot field a legal lineup signs cover automatically each week; the owner faces the forfeit rule and must sign himself (GDD §17.2). With the one-position rule this asymmetry now costs a passive owner whole seasons.
- **Balance nudge:** AI clubs below their difficulty target receive generated arrivals; the owner never does. It is part of the approved difficulty curve. Measured against your stated philosophy ("no hidden roster advantages"), it is the one mechanism that gives AI clubs players outside the market's rules. It is not new, and not caused by Task 7.
- **Staff:** AI clubs carry a fixed staff allowance (405,000), while the owner's staff is negotiated. Today it costs the owner about 424,000 on average at All-Star, less than v42.21.0's 495,000 under the old 10% raises.
- **Protected monsters:** an AI club's protected gym legendary or signature monster is cap-exempt (D1). The owner holds no protected monsters.

**No unintended Task 7 bonus or penalty was found.** No negotiation advantage, extra attempts, different acceptance, cap exemption or Ambition difference exists for AI clubs.

---

## 3. AI intelligence

- **Confirmed:** AI clubs manage differently in Task 7: Task 6 strategy in the market, core extensions in two windows, negotiation within mode targets and ceilings, younger depth for rebuilders.
- **Not confirmed as a cause of the All-Star decline:** AI strength is pinned by the difficulty target and the balance nudge. The AI mean team overall at All-Star is 70.3 now against 70.7 in v42.21.0, and the owner's strength gap is the same. Better AI management shows in how clubs reach their strength (fewer generated arrivals, more negotiated retention), not in stronger opponents.

---

## 4. Monster agency

- **Confirmed:** about −1.8 points of All-Star on played games come with the Ambition and the negotiations.
  - The owner's renewal retention falls from 95% to 91% and the starters he loses from 0.26 to 0.74 per offseason.
  - Agency also adds to the forfeits: more departures mean more open slots for a position-blind owner. That is part of the −2.9 above.
- These departures are the monsters' own decisions under the same rules every AI club faces. AI clubs lose starters at the v42.21.0 rate.

---

## 5. The negotiating owner (visible information only)

**Policy:**
- It sees what a player sees: the market ask, the opening demand, his counters, the attempts left, role, overall, age, potential and the cap. It never reads the Ambition and never reloads.
- It accepts a fair opening (at or under 0.97 of the ask), and a starter in the top quarter up to 1.08.
- Otherwise it counters at 95% (core) or 90% (others), takes a counter within the ask (+3% for core), else makes a second offer halfway. It lets a reserve go if he asks over 1.05 × the ask.

| (current build, 12 seeds × 8 seasons) | All-Star hands-off | All-Star negotiating | Pro hands-off | Pro negotiating | Rookie hands-off | Rookie negotiating |
|---|---|---|---|---|---|---|
| Win rate | 32.6% | 31.9% | 53.1% | 51.0% | 69.4% | 61.1% |
| Win rate on played games | 35.7% | 34.8% | 58.6% | 59.7% | 73.5% | 72.6% |
| Forfeited games | 75 | 71 | 81 | 125 | 48 | 137 |
| Renewal retention | 91.3% | 83.9% | 91.2% | 84.5% | 92.8% | 85.6% |
| Departures per offseason | 1.68 | 2.95 | 1.70 | 2.90 | 1.38 | 2.59 |
| Starters lost per offseason | 0.74 | 1.21 | 0.65 | 0.94 | 0.54 | 0.88 |
| Pay against market ask | 1.01 | **0.96** | 0.98 | **0.95** | 0.97 | **0.95** |
| Cap room after the offseason | 125,000 | **266,000** | 156,000 | **264,000** | 170,000 | **270,000** |
| Roster size | 35.9 | 33.5 | 36.2 | 34.2 | 36.5 | 34.3 |
| Team overall | 68.3 | 67.3 | 68.4 | 68.1 | 68.4 | 67.9 |

Negotiation outcomes (All-Star): 972 openings accepted, 504 agreements after counteroffers, 70 breakdowns, 64 reserves let go.

**Reading:**
- **Confirmed:** negotiating has real strategic value and real risk. Contracts cost 3–5% less, and about 100,000–140,000 more cap room remains. But more monsters leave, and on played games results are about the same.
- **Confirmed:** with this simple owner it is not a net advantage. The owner does not reinvest the savings, and his thinner, position-blind roster forfeits more often (Rookie 137 forfeits).
- **Hypothesis:** an owner who negotiates, spends the savings and keeps his positions covered would come out ahead. This was not tested.
- The system rewards judgment rather than offering a free discount, which is the intended design.

---

## 6. Difficulty integrity

- **No unintended bonus, penalty or unfair mechanic was introduced by Task 7.**
- **One interaction is a genuine problem, though not an AI advantage.** Under the approved one-position rule, a missing position now means forfeits for as long as it lasts. The game lets an owner start a season, and keep playing, into guaranteed forfeits: the only signal is the R5 warning. That is harsh for a player who misses it, and it distorts the automated benchmark at every difficulty (−2 to −3 points).

---

## 7. Recommendation

**All-Star is functioning as designed** in the sense you set out:
- no hidden advantage for AI clubs was introduced;
- its higher difficulty comes from the existing, documented difficulty mechanics;
- part of the decline comes from monsters' own decisions under rules the AI faces too;
- the current 32.6% is inside your 32–40% target.

**One specific issue needs a decision; the narrowest corrections:**
1. **Game (needs your approval):** before an owner game that would be forfeited for an open starting slot, stop the auto-run and show the warning with its fix. The fix is the cheapest legal free agent at that position, or a release that makes room. The same gate goes at the season start, like the roster-minimum gate (D8). Nothing is substituted out of position and nothing is signed automatically. The R5 rule stands; the player simply cannot slide into forfeits unknowingly.
2. **Benchmark (needs your approval, because you asked to keep the benchmark owner unchanged):** in the final benchmark, report the hands-off owner as today, plus the repair owner as a companion line. The repair owner does exactly what the warning asks. With it, All-Star is 35.5%, Pro 55.6% and Rookie 71.4%, all inside your targets.

I have not changed the game or the benchmark owner.

**Not recommended:** any change to difficulty coefficients, negotiation values or the Ambition. The remaining played-game decline (about −4 points) has a likely structural cause in the one-position rule on the field (hypothesis 1), and a benchmark-owner spending effect (hypothesis 2). It can be confirmed with the final benchmark's held-out seeds before any decision.

**Also for your awareness:** the balance nudge (§2) is the one pre-existing mechanism that adds players to AI rosters outside the market. It predates Task 7 and is part of the approved difficulty curve. It is listed here because of your stated philosophy, not as a Task 7 defect.

---

## 8. Files

- **Tools (diagnostic only; the defaults are unchanged):** `tools/franchise-soak.mjs` gains optional `negotiate` and `beforeGame` hooks for variant owners.
- **Recorder and analysis:** `tools/task7-allstar-record.mjs` and `tools/task7-allstar-analyze.py` (132 runs).

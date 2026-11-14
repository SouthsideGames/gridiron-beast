# Task 10: final implementation report (for owner review)

**Branch:** `task10-integration` (not merged; `main` and the main game link are untouched). **Task 10 is not declared complete:** that waits for the owner's review.

**Builds measured:** the full regression first on `61f62c0`, then the final run on `c84bb73`. The benchmark and the census ran on `61f62c0`.

**Baseline for comparisons:** `task10-franchise-final-balance` at `37adc00`. It passes 2,103 of 2,103 tests.

## 1. Integration (Stage A)

| Source | Commit | How it was taken |
|---|---|---|
| `chatgpt/task10-balance-fixes` | `5761f44` | Already reviewed in `CANDIDATE_REVIEW_5761f44.md`; its approved parts reach this branch through the polish batch |
| `chatgpt/task10-polish-batch` | `d36ed49` | Merged as `84cac2b` (history kept), then corrected and tested change by change |
| `task10-franchise-final-balance` (Claude) | `37adc00` | The base of the integration branch |

ChatGPT's commits were treated as untested candidates. Where one was wrong, the correction is its own commit.

| Integration commit | What it does |
|---|---|
| `1a3b951` | Corrects Falling Star and Second Tide to the approved rules |
| `27363f4` | Corrects the MVP cap; adds the rookie rollover test; reverts the pocket-compression trial |
| `bec7d50`, `4d9036e` | Continuous Beast Clash; trading text and tests; playbook release verification |
| `485cd65` | QB attribute audit |
| `5e56a94` | Two structural fixes found by the regression run |
| `5bd6a16` | Play-by-play |
| `61f62c0` | Coach identities |
| `ba48583` | Quarterback draw-order test |
| `6454c03`, `980a1ce`, `f9cc211`, `c84bb73` | Regression fixes (§7) |

## 2. The eight approved changes

| # | Change | Status | Evidence |
|---|---|---|---|
| 1 | **Falling Star:** main target only, no splash | Verified | The ability, the Dex contract (FIR-03-C) and the look have no splash. The scenarios assert exactly one hit, on the marked occupant, and no damage to reserves. Dex build check passes. |
| 2 | **Second Tide:** heal and shield plus the normal attack, every second eligible action | Verified | The scenarios assert the support effect and an ordinary attack in the same action, on the same cadence. Dex (WAT-01-C) is updated. |
| 3 | **MVP:** the 3 SD cap applies to MVP only; no voter fatigue; repeat MVPs allowed | Verified | The cap is scoped to MVP scoring. The fatigue code and its streak data are removed. The `stats.test.js` test checks that OPOY and DPOY are uncapped and that a repeat MVP is possible. The rule text is corrected. |
| 4 | **Rookie rollover** | Verified | `tests/task10-rookie-rollover.test.js` follows a three-season franchise. Founding rookies, draftees and later arrivals each have exactly one first-year season. Everyone ages one year and gains one season of experience per season. ROY winners are first-year monsters and never repeat. Season 1's awards history stays as recorded. |
| 5 | **Beast Clash results in whole numbers;** wrapping fixed | Verified | The browser run (390×844, at 1×, 2× and 4×) shows whole-number XP, no decimals and no horizontal overflow. The XP bonus line was rounded (a defect the batch missed). All 50,831 battle events have integer values. |
| 6 | **QB drawn above linemen while carrying** | Verified | `tests/task10-qb-draw.test.js`: a ball-carrying QB is drawn last. The order is unchanged for any other carrier or a defensive holder, and every player is drawn exactly once. The change is presentation only. |
| 7 | **Trading weeks 1–7** for owner and AI; closes at the start of week 8 | Verified | `trade-window.js` (open weeks 1–7, `TRADE_CLOSES_WEEK` = 8) and `tests/trading-second-pass.test.js` cover the owner desk, AI–AI trades, pending proposals expiring at the deadline, and cap and roster rules. The trade text moved to central keys. |
| 8 | **Reviewed reserve plays released** | Verified, with exceptions | 136 of 140 reviewed offensive reserve plays and all 150 defensive ones are in the live pools: selectable, validated, no duplicate names or routes. **Four are held back** (§6, owner decision B). Released plays are AI-callable through the coach identities (§4.3) and the scouting swaps. **There are no RPO plays in the catalogue** to release (owner decision C). Play-action plays are released (for example `pa_leak`, `max_shot`, `yankee`, `goal_pa_arrow`, `te_pop`). |

## 3. Continuous Beast Clash (Section 3, the priority)

A Watch battle in Franchise Mode is now one engine session from the first exchange to the last.

- **The engine:** `createClashSessionT8` pauses the same generator before each rotation phase. There is no restart and no second battle. The screen extends the same arena in place (`arena.extend`).
- **No prompts.** The player taps a reserve in the lineup bar. The switch happens at the next safe boundary. A refused tap shows a short, non-blocking note, for example "Next switch in 2 exchanges."
- **The four-exchange voluntary cooldown is kept.** A refused tap does not reset it. A knockout replacement is automatic and does not touch it.
- **One authoritative state.** Every switch is recorded on the encounter as it happens. The battle settles once from that record, with the session's own result (identical state and log hashes), and rewards are applied once. A reload mid-battle resumes at the exchange reached, with the same events.

**Acceptance tests:**
- `tests/clash/t10-continuous.test.js` (items 1–16 at engine level).
- `tests/task10-clash-franchise.test.js` (franchise session, settle once, rewards once, reload, old-save upgrade, Auto equals Skip).
- Browser run at 390×844 with touch, at 1×, 2× and 4×: 0 prompts, 0 restarts of the exchange counter, the battle finishes, taps queue or are refused for cooldown as designed, whole-number XP, no overflow, no page errors.

**By design:**
- **Skip** is the AI-run battle.
- **Watch with "Auto Rotations" on from the start** is the same battle as Skip (tested).
- **Watch where the player never taps** keeps the player's lineup in place, so it can differ from Skip. Not tapping means staying.

## 4. Remaining polish (Section 4)

### 4.1 Reclaimable gym badges: owner decision, nothing changed

> **Superseded on 2026-11-13 (evening):** the owner approved reclaimable badges. They are implemented and verified; see §10.

The current rules have no way to lose a badge.
- GDD §15.4: "Badges are permanent for the franchise."
- GDD §15.3: "No replays."
- No code removes a badge.

The brief's condition ("if they later lose a rematch and the established rules require relinquishing the badge") is therefore never met, and there is nothing to reclaim. Making badges losable would be a new rule. Per the brief, it is **not invented here** (owner decision A).

### 4.2 Player-friendly play-by-play: done

The sheet is grouped by quarter. Every snap shows who had the ball, the down, distance and spot it started from, and the play called (for example "CAN · 3rd & 13 · OPP 47 · PA Post").

The play lines now read as football does:
- "for a loss of 6", "runs for no gain";
- "catches it for a 10-yard TOUCHDOWN!";
- touchdown scores name both clubs ("HOM 0-6 AWA.").

Before, it read "for -6 yards", "catches it in. TOUCHDOWN!" and "Away 0-6".

**A Technical View toggle** adds the result code, yards, both play ids, the repro code and the replay hint.

The situation is saved as numbers and ids, not sentences. A log line saved under a reworded key still shows its saved English.

**Tests and checks:**
- `tests/task10-play-by-play.test.js`;
- browser check at 320×568 and 390×844 (both views, no overflow, no errors).

### 4.3 Coach identities: done, on the existing mechanism

Every AI club's play-caller has one of **Air Raid, Ground & Pound, Trickster, Balanced or Tempo**. Each is fixed with the club's existing identity and consistent with it:

| Identity | Clubs |
|---|---|
| Air Raid | Sunfire Lions, Palmetto Vipers, Ember City, Sundown |
| Ground & Pound | Canyon Crushers, Ironpeak Rams, Stonehaven, Northstar |
| Trickster | Eastport Phantoms ("tricks"), Bayou Stalkers (option) |
| Tempo | Thunder Mesa (quick passing), Stormport |
| Balanced | Harbor, Frostpeak, Glacier, Ashford |

**The only effect** is which plays of the released book the AI's 6+6 leans to: the style's tags are drawn three times as often. There is no rating change and no new rule. The run and pass counts per identity are unchanged. Desperation and red-zone-only calls are never base calls.

**The owner's club has no identity, as before.** `tests/task10-coach-styles.test.js` covers this.

### 4.4 Playbook and trade verification

- **Playbook:**
  - `tests/playbook-reserve.test.js` is updated to the Task 10 release.
  - Live invariants (`run-game`, `qb-read`) pass on the released pools.
  - The four held-back plays are listed in §6.
- **Trades:** item 7 above.

## 5. QB attribute audit (Section 6)

Full report: `docs/task10/QB_ATTRIBUTE_AUDIT.md`. Each attribute was changed alone (40, 65, 90) on the real engine. No game change.

| Attribute | Measure | 40 | 65 | 90 |
|---|---|---|---|---|
| Awareness | Sack rate, neutral | 7.4% | 3.2% | 1.8% |
| Awareness | Sack rate, under pressure | 11.3% | 4.3% | 2.5% |
| Awareness | Throws to a clearly worse target | 16% | 10% | 8% |
| Awareness | Missed open receivers | 14% | 10% | 8% |
| Agility | Escapes from sack attempts | 34% | 49% | 58% |
| Speed | QB Draw yards per carry | 2.4 | 3.4 | 4.1 |
| Speed | 15+ yard runs | 0.5% | — | 8.7% |
| Strength | Broken tackles in the open field | 7% | — | 22% |

All four attributes work in the right direction. One gap: **Strength plays no part in the pocket sack attempt**, which is rusher Tackling against QB Agility, as the GDD specifies (owner decision D). The sack rate was not forced.

## 6. Owner decisions needed

- **A. Gym badges:** ~~keep them permanent, or approve a losable rule~~ **Resolved:** the owner approved reclaimable badges (§10).
- **B. The four held-back plays:** `end_around`, `pin_pull`, `pistol_zone_read`, `midline_read`. **Mostly resolved (§10):** three are corrected and released; **End Around still needs a design decision (F).**
  - **The defect:** they fail a live invariant. The ball carrier misses the mesh, or the handoff is out of reach.
  - **Options:** fix their play art in a follow-up, or leave them in reserve. They stay in reserve and are reviewable in the Playbook Audit.
- **C. RPO:** the catalogue has no RPO plays, so none could be released. Authoring them would be new content.
- **D. QB Strength in sack attempts:** today only Agility resists the pocket sack (GDD line 1229). Add Strength, or keep as designed.
- **E. Hall of Fame record credit reads the career timeline:** **resolved:** the honour ledger (§11.3). Original note: `tests/career-timeline.test.js` ("the timeline never changes the game") fails whenever a retired monster holds a league record. The Hall case's record points come from the timeline events, so with the timeline writers switched off the case differs (`monsterHallOfFame.candidates[].recordsBy`).
  - This is a Task 9 weakness. The candidate review exposed it first; Task 10's changed seasons expose it again.
  - The game is unaffected (the writers are always on), but the Hall is not timeline-independent.
  - **Second symptom (found 2026-11-13 evening):** a retiring monster's titles and records in his League News line also come from the timeline (§10.4).
  - **Proposed fix:** a small record ledger kept outside the timeline. It is a save-format addition, so it is left for approval.
- **F. End Around's design:** **resolved:** pre-snap motion, corrected and released (§11.1). Original note: The receiver lines up 18 yards wide and reaches the QB at about 2.7 seconds, so pressure usually gets there first (§10.2). Choose a tighter split, pre-snap motion, or the QB opening toward him, or leave the play held back.
- **G. The board's "win a gym badge" goal:** **resolved by the owner's ruling (§11.2).** Original note: It now counts a badge taken during the season even if it is lost again later that season. Under the new rule it would otherwise silently fail for a badge won in week 2 and lost in week 9.

## 7. Regression (Stage D)

**Run 1, the full suite on `61f62c0`:** 2,121 tests, 2,116 pass, 5 fail. All five are now fixed, and each passes when rerun alone.

| Failing test | Cause | Fix | Commit |
|---|---|---|---|
| `contracts: … staff renewals within ±8%` | **A real defect** (the pre-existing staff-renewal weakness). A coordinator hired in a postseason event inherited the departed coordinator's contract and raise, and the departed coordinator's renewal stayed open. Signing it priced the new hire from the old one's demand. | The replacement gets his own contract at his own salary, and the stale renewal is withdrawn. The test now also checks that each renewal is for the person currently in the role. | `6454c03` |
| `retirement is a permanent exit` | Outdated test. Since Task 10, a retirement's honours are saved as data, not as an English sentence. | The test reads them through `honoursText`. | `980a1ce` |
| `F8: Edge Contain … better half of the 26 calls` | Outdated test. The defensive book is now every released call (176), not 26. Edge Contain ranks 80 of 176, in the better half. | "Better half" is measured on the whole book. | `f9cc211` |
| `F7 final: an early cut … free defender across the line` | A test-geometry edge case found by a released defense (`toss_sweep` vs `base_cat`). The back was already past the line when he cut, beside an unblocked linebacker. This is the intended behaviour; the test assumed the back was still behind the line. | A free defender level with or behind the back counts. 1 case of 34 early cuts. | `f9cc211` |
| `a made-up translation of every line changes nothing but the wording` | The last saved-sentence gap from the candidate review: an achievement title written into a news line as finished English. | The title is saved as a line, read through its key. | `c84bb73` |

Two failures were found earlier, on the mixed run at `4d9036e`:
- The Clash boundary rule: the session import is now routed through `src/clash/index.js`.
- The arena source test: it now accepts the `record` getter.

Both are fixed in `5e56a94`.

**Run 2, the final full suite on `c84bb73`:** **2,122 tests, 2,122 pass, 0 fail** (57 minutes). The baseline had 2,103 tests; the 19 new ones are the Task 10 tests.

The timeline determinism test (owner decision E) passed on `61f62c0` and failed on the mixed earlier run. Whether it fails depends on whether a retired monster holds a record in that seed's season. The weakness is still there.


## 8. Balance and correctness checks (Stage D)

These are measurements only. Per Section 5, there are no parity or win-rate targets.

### Football ability census

200 whole games between generated clubs, on `61f62c0`.
- **No ability that worked in the baseline census (300 games) has stopped executing.**
- Two abilities with 10 or more appearances never executed. Both are pre-existing and already listed in `OWNER_DECISIONS_2026-11-13.md` §8:
  - Foresight (cerebrix): 0 in both runs.
  - Crosswind Rescue (windlynx): 0.02 per appearance in the baseline, 0 in 37 appearances here. That is within chance for something this rare.
- No other ability's activation rate halved or doubled.

### Reduced franchise benchmark

Pro difficulty, seeds 1–5 × 10 seasons, on `61f62c0`, using the production lifecycle and the hands-off owner policy.

| Measure | This branch | Baseline, same seeds |
|---|---|---|
| Integrity problems | 0 | 0 |
| Errors | 0 | 0 |
| AI rosters | 28–38 | 27–38 |
| Negative cap room | 0 | 0 |
| AI club-seasons with a lineup problem | 2 of 800 | 3 of 1,600 (seeds 1–10) |
| Hands-off owner win % (seeds 1–5) | 51, 24, 52, 38, 29 | 52, 28, 28, 75, 42 |
| Distinct champions per run | 4–7 | 2–7 |
| Unsigned players at market close (mean) | 29.4 | 29.0 |
| 0–21 forfeits in owner games | 139 of 450 | 36 of 450 |

Run time was 898 seconds.

**About the forfeits.** They are the hands-off benchmark owner, not a game rule:
- The cause is a missing position. In seed 4 from season 6, the club has one cornerback for two CB slots, and the benchmark owner never signs anyone.
- The game flags this as a critical "no legal lineup" warning before every such Sunday.
- The baseline shows the same pattern (whole forfeited seasons in seeds 2 and 3). This branch's different seasons reach it in more runs.
- **Not a correctness defect, but worth noting:** a player who ignores the roster for several seasons gets forfeits.


## 9. Risks

- The coach identities move every AI club's play mix toward the released book, so every franchise season differs from the baseline. Tests pinned to exact seeded seasons may move. The regression run above is the check.
- Continuous Clash changes how a Watch battle is recorded. Unresolved old saves are upgraded (the prompt record becomes a player record, tested).
- The Capacitor build has not been tested here. No device testing was done.
- A requested Hall of Fame retirement still goes ahead at season end even if a badge is lost after the request (the checklist gates only the request).
- The three released plays join the AI's coach-identity pools, so AI play mixes and franchise seasons shift slightly again.

## 10. Gym badge reclaim and handoff corrections (ChatGPT `chatgpt/task10-gym-play-corrections` at `acc75ec`)

The branch sat directly on `c3bad8b` and was integrated by fast-forward, so ChatGPT's five commits keep their own history. Every correction is its own commit.

| Commit | What it does |
|---|---|
| `7ca8e81`, `af53200`, `cacc57c`, `c6c123d`, `acc75ec` | ChatGPT: reclaimable badges, GDD sections, End Around and Pin and Pull handoff changes |
| `0c6d00a` | Gym badge corrections and tests |
| `aeaf994` | Handoff play corrections, release of three plays, tests |
| `fe0322b` | The authoritative GDD brought in line |

### 10.1 Gym badges: verified, with three corrections

**Verified** in `tests/task10-gym-badges.test.js`: three seasons of real games with gym results forced to alternate win, loss, win, and a save/load round trip after every game.

| Check | Result |
|---|---|
| A win earns or keeps the badge | Yes, every game |
| A loss removes a held badge | Yes, including playoff losses |
| A later win restores it | Yes |
| Regular season and playoffs both count | Yes, both directions |
| Progress shows current ownership | Count, `badgeOf` and the Hall of Fame checklist always equal the badges held |
| Achievements kept | First badge and four badges stay awarded after the count drops; they are not awarded twice when it returns |
| Save/load and later seasons | Every game reloaded; three seasons; no problems |
| A tie | Never costs a badge: a counted game always has a winner (the tiebreak runs first) |

**Defects found and corrected:**
1. **A forfeit to a gym club didn't touch the badge.** It is recorded as a 0–21 loss, but the rule ran only for played games. The rule now lives in one helper, `settleGymBadge`, used by both the played and the forfeited path.
2. **The badge-lost news was hard-coded English.** It would not follow a language change and fails the text rules. It is now central text: "BADGE LOST: {coach}'s {club} take back the {badge} …".
3. **Losing any badge cleared the HQ "new badge" banner**, even when the banner was about a different badge. Now only the lost badge's banner is cleared.

**Interpretation flagged for you (decision G):** the board's season goal "win a gym badge" counts badges taken during the season, so a badge won and then lost the same season still counts. Older saves fall back to the previous calculation.

### 10.2 The four plays

Measured on the real engine: 12 defenses × 30 seeds, low (40) and high (90) Awareness quarterbacks.

| Play | On ChatGPT's branch | After correction | Status |
|---|---|---|---|
| **Pin and Pull** | 100% handoffs to the back, but **he retraced his path to his starting spot for about 1.3 s after the exchange**; −0.02 yards per play | 100% handoffs (reach 1.4 yd, 0.5 s); runs his route at once behind the pulling guard; 2.59 yards per play; no QB keeps, no freezing, no overlap | **Released** |
| **Midline Read** | Keeps fine; **0 of 168 gives reached the back** (all fell back to "missed the mesh") | Every give completes (reach about 0.9 yd, 0.7 s); keeps and gives both happen | **Released** |
| **Pistol Zone Read** | Same as Midline Read | Same as Midline Read | **Released** |
| **End Around** | Handoff on 46% of plays, at 2.65 s; **37% sacks**; 8 of 150 handoffs against blitzes | Unchanged: needs a design decision (F) | **Held back** |

**Pin and Pull.** ChatGPT's added waypoint was the right fix. The engine special case that held the back near the QB was the cause of the backtracking: his waypoint counter stayed at his starting spot. Removing that special case fixes the route.

**The read options.** In the pistol, the QB's first step carried him downfield, away from a back running directly behind him, so the two stayed about 2.5 yards apart. The QB now takes a short step that rides the mesh.
- The deliberate keeps were never broken.
- Yards per play fell, because the QB no longer has a running start before the read.
- The results now sit alongside the live Read Option: keeps 2.6 / 2.2 yards against 3.1, gives 1.7 against 0.4.

**Awareness**, scored against the defender the QB actually reads:

| Play | 40 Awareness: right read | 90 Awareness: right read |
|---|---|---|
| Midline Read | 83–86% | 97% |
| Pistol Zone Read | 82–86% | 96–97% |
| Read Option (live reference) | 84% | 96–97% |

**End Around.** ChatGPT's longer deadline removes the premature fallback, and when the receiver arrives the handoff is clean. But he is 18 yards wide, and the QB waits in place behind run blocking. An uncommitted experiment with a 9-yard slot split gave:
- handoffs on 89% of plays, at 1.5 s;
- 8% sacks;
- 116 of 150 handoffs against blitzes.

That is a change to the play's design, so the play stays held back. Its reserve walk-through test is exempted from the 7-second limit only while it is held back.

**Other handoffs are unaffected.** All 37 live handoff, option and pitch plays give identical results, seed for seed, with the engine before and after this branch. The only engine change left is End Around's longer missed-mesh deadline.

**Review fingerprints:** Pin and Pull, Midline Read and Pistol Zone Read changed, so they will show as changed since review in the Playbook Audit.

**Tests:** `tests/task10-handoff-plays.test.js` (5 tests).

### 10.3 GDD

- **Head-coach feature:** `docs/GRIDIRON_BEAST_MASTER_GDD.md` has ChatGPT's deferred entry: Heavy Rotation, Balanced Rotation, Starter-Focused, an automatic or manual substitution setting, and possible in-game injuries. There is no code for it.
- **The master document is superseded:** its header says the current design is the root `GRIDIRON_BEAST_GDD.md`, which still said badges are permanent.
- **The root GDD is updated:** §15.3 and §15.4 now describe reclaimable badges, and its Task 10 section records the badge rule, the four plays' status and the deferred head-coach feature.

### 10.4 Regression

**Full suite on `fe0322b`:** 2,130 tests, **2,128 pass, 2 fail** (59 minutes). The 8 new tests are the badge and handoff tests.

| Failing test | Cause | Status |
|---|---|---|
| `partnership-franchise`: the captain-pick fallback | An outdated test setup. The changed seasons left the club with one spare linebacker, and the test removed him, so the season correctly refused to start on the lineup gate. | **Fixed** in `932bada`: the test removes a captain whose position has depth to spare. Passes when rerun alone. |
| `career-timeline`: "the timeline never changes the game" | **Pre-existing (decision E), with a second symptom.** A retiring monster's titles and records in his League News line are read from the career timeline (only awards fall back to the season history). With the writers off, a retiring Beast Bowl champion loses "a Beast Bowl champion" from that line. Game results are unaffected. Like the Hall record credit, the fix is a small title-and-record ledger outside the timeline: a save-format addition, left for approval. | **Open (decision E).** Whether it fails depends on the seed's seasons; it passed on `c84bb73`. |

## 11. The three final decisions (ChatGPT `chatgpt/task10-final-decisions` at `830f1f4`)

The branch sat directly on `a1f5b5e`. It was reviewed on its own branch, corrected there, and fast-forwarded into `task10-integration` at `ed59f29`.

### 11.1 End Around: pre-snap motion (decision F)

ChatGPT added the motion (the receiver lines up 18 yards wide and motions 9.3 yards inward to `[-3.5, 9]`) but left his route starting at the wide spot.
- **The defect:** the playbook validator rejected it ("WR2's path must start where the motion ends"). Snapped at the motion spot, he ran back out to 18 before looping in, so the play got worse.
- **The correction (`8bbd4a9`):** the route starts where the motion ends. The motion and the wide alignment are unchanged.

| End Around (11 defenses × 30 seeds) | Handoffs | At | Sacks | Yards per play | Handoffs vs blitzes |
|---|---|---|---|---|---|
| Before (no motion) | 46% | 2.65 s | 37% | −0.31 | 8/150 |
| ChatGPT as committed | 0% | — | 53% | −1.75 | 0/150 |
| **Corrected** | **100%** | **1.15 s** | **0%** | **+1.66** | **150/150** |

- **Movement:** no missed meshes, freezing or overlap in 660 snaps.
- **Visual check:** the play card shows the wide alignment, the motion zigzag inward, and the loop behind the QB around the left end. A simulated snap's tracks follow the same shape with no doubling back.
- **Status:** End Around is now released, so nothing is held back. Its reserve walk-through meets the normal 7-second limit again, and the live-play invariants pass.

### 11.2 Board badge goal

**The owner's rule:** a badge earned or reclaimed this season counts only if still held at season's end, and a carried-over badge counts only if reclaimed. ChatGPT's season-end change implements it correctly. The goal is settled after the playoffs, and a badge enters the season list only when newly won.

**Correction (`4e607cb`):** HQ's mid-season progress used a separate calculation. Both now use one exported rule, `badgesWonThisSeason`, and the GDD wording is updated.

**Tests** (`tests/task10-badge-goal.test.js`): 8 real seasons across 4 seeds, with gym results set per club and a save/load after every game.
- Each season's count and board verdict are checked against an independent calculation from the games.
- Covered: earned and kept (met); earned then lost, including in the playoffs; carried-over and kept (not counted); lost then reclaimed; an all-losses season (missed).
- Direct checks: a forfeit after earning, a carried-over badge, a reclaim, save/load, and the fallback for saves without the season list.

### 11.3 Honour ledger (decision E)

ChatGPT added a per-monster honour ledger, `careerHonours`, holding awards, championships and records, written whether or not the timeline writers are on. The retirement news, legend records and Hall of Fame case facts read it. Three defects were corrected in `ed59f29`:

1. **Old saves lost honours.** Every reader did `careerHonours || career.ev`. A monster from an existing save, who has honours only in his timeline, got a ledger holding just his next honour, which then hid everything older.
   - **Reproduced:** a two-time champion with six league records and three awards was left with only his awards after one new honour.
   - **Fix:** one reader, `honourEvents`, merges ledger and timeline by key. The ledger is seeded from the timeline the first time it is written. The Hall case merges a legend record's ledger with its timeline, so legends preserved by older saves still make their case.
2. **The writers-off switch no longer meant "nothing written".** ChatGPT removed the guards from the after-game and season-end passes, so the timeline was written with the writers off, and the determinism test failed on "nothing written with the writers off". Those passes now run on a throwaway copy of the book when the writers are off: honours are found and the timeline is untouched.
3. **A pre-existing wording bug**, also in the published build: "two-time" was written "three-time" (the number words were off by one).

**Tests:**
- `tests/career-timeline.test.js` (including "the timeline never changes the game", which failed before): 9 of 9 pass.
- `tests/task10-honour-ledger.test.js`:
  - the ledger equals the timeline's honours and survives save/load;
  - the old-save scenario keeps every earlier honour;
  - **four seasons with the writers on and off produce identical retirement news honours and identical Hall of Fame candidates** (6 candidates, 3 retirements with honours);
  - the wording.
- 200 of 200 tests in the related suites (Hall, legends, retirement, career, saves, compaction, translation).

### 11.4 Regression

**Full suite on `ed59f29`:** **2,136 tests, 2,136 pass, 0 fail**, none cancelled or skipped (66 minutes). The timeline determinism test passes, as do all the new tests for this round: End Around, the badge goal and the honour ledger.

**Final Task 10 commit:** `ed59f29` (code). The report commits after it change documentation only.

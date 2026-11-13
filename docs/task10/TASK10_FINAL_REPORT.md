# Task 10: final implementation report (for owner review)

**Branch:** `task10-integration` (not merged; `main` and the main game link are untouched). **Task 10 is not declared complete:** that waits for the owner's review.

**Full regression and benchmark build:** `61f62c0`. The later commits on the branch only add tests and this report.

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

- **A. Gym badges:** keep them permanent (current GDD), or approve a rule under which a badge can be lost and won back. Nothing is implemented.
- **B. The four held-back plays:** `end_around`, `pin_pull`, `pistol_zone_read`, `midline_read`.
  - **The defect:** they fail a live invariant. The ball carrier misses the mesh, or the handoff is out of reach.
  - **Options:** fix their play art in a follow-up, or leave them in reserve. They stay in reserve and are reviewable in the Playbook Audit.
- **C. RPO:** the catalogue has no RPO plays, so none could be released. Authoring them would be new content.
- **D. QB Strength in sack attempts:** today only Agility resists the pocket sack (GDD line 1229). Add Strength, or keep as designed.
- **E. Hall of Fame record credit reads the career timeline.** `tests/career-timeline.test.js` ("the timeline never changes the game") fails whenever a retired monster holds a league record. The Hall case's record points come from the timeline events, so with the timeline writers switched off the case differs (`monsterHallOfFame.candidates[].recordsBy`).
  - This is a Task 9 weakness. The candidate review exposed it first; Task 10's changed seasons expose it again.
  - The game is unaffected (the writers are always on), but the Hall is not timeline-independent.
  - **Proposed fix:** a small record ledger kept outside the timeline. It is a save-format addition, so it is left for approval.

{{REGRESSION}}

{{BENCHMARK}}

## 9. Risks

- The coach identities move every AI club's play mix toward the released book, so every franchise season differs from the baseline. Tests pinned to exact seeded seasons may move. The regression run above is the check.
- Continuous Clash changes how a Watch battle is recorded. Unresolved old saves are upgraded (the prompt record becomes a player record, tested).
- The Capacitor build has not been tested here. No device testing was done.

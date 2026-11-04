# Task 7 — Free Agency Overhaul: Phase 1 Repository Audit and Implementation Plan (2026-11-04)

**Status: audit only.** No gameplay code was changed, and nothing was merged or published.

| Item | Value |
|---|---|
| Baseline | `main` at `83cd72a`: production `v42.21.0-ai-franchise` (artifact version 116) plus the docs-only roadmap PR #92 |
| Authority | `docs/TASK7_FREE_AGENCY_SPECIFICATION.md`: the owner's specification (30 decisions and the 2026-10-31 audit resolutions), converted from the .docx with the text unchanged |
| Evidence scripts and outputs | `docs/task7-phase1/` |

Settled decisions are not reopened here. §6 lists only the items the specification itself leaves open ("Remaining integration decisions") and the interpretations that genuinely need the owner.

---

## 1. Summary

The current free agency is a single offseason list of pool monsters plus 13 generated veterans:
- fixed price, a fixed 2-year deal, no negotiation;
- open before and after the draft;
- the AI's own free agency runs separately inside `startNextSeason`, **after** the draft.

Task 7 replaces this with one shared market, run through five player-advanced periods before the draft. Every club, the owner and the 15 AI clubs, works under the same contract, cap and legendary rules.

**The most consequential findings:**
1. **Every negotiated salary is overwritten each offseason.**
   - `progression.js:100` and `:82` set `m.salary = salaryFor(m)` for every monster: owner, AI, pools and waivers.
   - This erases renewals, counters, the 70% rookie scale and the postseason raise.
   - It conflicts with resolution 1 ("ratings changes must not overwrite a negotiated active salary") and has to be the first thing Phase 2 changes.
   - Once salaries persist, the AI cap economy behaves differently from the one Task 6 was calibrated on. This is approved by the specification, but it is the largest expected source of benchmark movement.
2. **The offseason runs in a different order from the approved one.**
   - Today:
     1. season close;
     2. retirement;
     3. AI strategy, then AI renewals;
     4. the owner's renewals;
     5. the draft;
     6. at season start, ageing, then AI trades, then AI free agency, then upgrades, nudge, trims and injury cover.
   - Approved: season close → retirement/ageing and contract processing → FA Periods 1–5 → draft → roster preparation → season.
   - So ageing and all free agency must move ahead of the draft.
3. **No legendary limit exists.**
   - `LEGEND_RULES.perClub: 1` (`species.js:149`) is defined but referenced nowhere.
   - The owner can hold any number of legendaries (Legend Tracks), can obtain a second copy of a gym legendary, and released legendaries go to the pools, where AI clubs sign them without checks.
4. **Secondary positions are wired in at a single choke point, plus generation.**
   - `SECONDARY_ELIGIBILITY` and `canPlay` (`personnel.js:56-63`) control every depth chart, auto-lineup and in-game substitution.
   - Generation also places monsters at their species' secondary position: `pickSpecies` at a quarter weight (`monsters.js:134-137`), draft classes (`draft.js:29`), AI arrivals (`league-season.js:264`), and scouting at 20% (`franchise.js:1445`).
5. **Contract, cap and trade plumbing lacks what Task 7 needs:**
   - no bonus, no future-year schedule, no reservations, no extensions and no league year;
   - owner contracts are capped at 2 years;
   - trades **into the owner's club reset the contract** to a fresh 2-year deal (`franchise.js:1061`, `trades.js:197/200`);
   - the only trade lock (`justArrived`) has the wrong length and is ignored by AI–AI trades.

Positional usage in real saves is small, so the lineup repair is low-risk (§2.3).

---

## 2. Current systems against the specification

### 2.1 Contracts, salary and cap

| Topic | Current (file:line) | Specification | Gap |
|---|---|---|---|
| Contract record | `{signed, ends, years}` + `rookie`; protected: `{permanent:true}` (`league-registry.js:26`) | adds bonus, a yearly cap schedule, version and transaction id | extend additively |
| Lengths | owner 1–2 (`contracts.js:13,18`; `franchise.js:840`); AI 1–3 via `leagueContract` (`contracts.js:20-21`; Task 6 `contractLength`/`modeLength`, `league-season.js:38-50`) | shared 1/2/3 for every club | unify on `leagueContract`; drop the owner clamp |
| Salary persistence | reset every offseason (`progression.js:82,100`; `leagueAgeing` `league-season.js:167`) | negotiated salary survives ageing and development | **remove the reset**; keep `salaryFor` as market value only |
| Money units | `salaryFor = 18000 + 280·OVR` is unrounded (multiples of 20, `monsters.js:220`); asks are rounded to 100; `signFreeAgent` charges the unrounded figure while showing a rounded one (`franchise.js:882-892`) | whole credits; offers in 100s; old salaries kept exactly | offers and new contracts in 100s; legacy salaries untouched |
| Signing bonus | none | prorated integer allocation, remainder to the earliest years | new |
| Reservations | none; the owner may go over the cap (`franchise.js:895`, `1533`; `trades.js:213`) and the commissioner review blocks games until cleared (`franchise.js:149-170`) | reserve first-year salary plus first-year bonus for pending offers; usable cap never negative | new ledger; see decision D4 for the over-cap paths |
| Owner payroll | all monsters + staff + `deadCap` (`franchise.js:544-550`); cap = tier × 1.04 with the perk (`:543`) | unchanged base caps (resolution 1) | add the future-year schedule and reserved amounts |
| AI payroll | protected monsters exempt (`league-registry.js:130`); `staffAllowance` deducted (`:132`); `trimToCap` (`league-season.js:134-146`) | same rules for AI and owner; "no special hidden exceptions" | decision D1 |
| Dead cap | players: none; staff: severance, retention and firing go to `deadCap`/`pendingDeadCap` (`franchise.js:209-218`, `482`, `2232`) | no player dead cap | decision D2 |
| Release | `toPool`; contract cleared, no charge (`franchise.js:552-564`) | zero dead cap; no re-sign in the same league year | add the lock |
| Extensions | none: renewal only after `ends <= year` | final contract season, in-season and offseason | new (definition in §3.2) |
| Rookie deals | 70% (`draft.js:14,127`; `league.js:130`), erased by the salary reset before season 1; `tradable()` rookie protection (`trades.js:70-74`) | the specification asks for the treatment to be documented | decision D2 |

### 2.2 Offseason, market and AI

| Topic | Current | Specification | Gap |
|---|---|---|---|
| Order | close → `retirementPass` → `evaluateStrategies` → `leagueContracts` (AI) → owner book (`openOffseason`) → draft → `startNextSeason` (ageing → AI trades → `leagueFreeAgency` → `leagueUpgrades` → nudge → trims → injury cover) (`franchise.js:2133-2139`, `2220-2252`) | close → retirement/ageing and contract processing → FA1–5 → draft → roster prep → season | move ageing and all free agency before the draft; keep strategy evaluation where Task 6 validated it (§3.1) |
| Periods | none; the market is open for the whole offseason (`franchise.js:857-898`) | five manually advanced periods, early completion, a warning on skip | new period state machine |
| Market | `f.pool` (regional, `toPool`) + 13 generated veterans (owner only) + `league.waivers`; AI signs from pools separately (`league-season.js:207`; weekly `poolActivity` `franchise.js:577`) | one market visible to all; a monster signed anywhere disappears for all at once | unify into one market view over the existing stores (no duplicated monsters) |
| Negotiation | renewals only: the counter at 85% with `acceptsCounter` (`contracts.js:47-52`) | personality, patience, rivals, counters, deadlines, tie order | new engine; renewals move onto it |
| Personality | `nature` (attribute modifiers, `monsters.js:28`) | evolving priorities: money, security, role, winning, patience and timing | new additive record derived from nature, age and career stage |
| AI | Task 6: `rosterPlan`, `leagueBenchOf`, `modeOf`, `upgradesAllowed` (Contend 2, else 1), `contractLength`/`modeLength`, `clubCapRoom`, `marketValue`, `trimToCap`, `leagueNudge`, `leagueInjuryCover` | AI uses Task 6 for needs and budgets; no parallel logic | the AI bidder calls these; R5 limits become the per-offseason upgrade-offer limit |
| In-season | Tuesday scouting and the Beast Clash recruitment (`franchise.js:1440-1536`); AI weekly pool signings | year-round market; simplified immediate negotiation | add the in-season market; decision D5 for Clash recruits |
| Unsigned retirement | Task 6 at twice the odds, ageless exempt (`retirement.js:118-121`) | age and personality based; legends exempt | add the personality factor inside `chanceFor` |
| 20 seasons | `SEASON_CAP = 20`; `mayStartSeason` refuses season 21 (`lifecycle.js:16,45-59`) | no invalid offseason after season 20 | after season 20, the FA periods are not opened |
| Compensatory picks | none exist | none | keep (assert in tests) |

### 2.3 One position per monster

**Eligibility** comes from one table: `SECONDARY_ELIGIBILITY` and `canPlay` (`personnel.js:56-63`). Every lineup path goes through it:
- the depth chart (`roster.js:22,39,55,88-91`);
- the in-game substitution (`rules.js:194`);
- the legendary-play slot check (`legendary.js:28,69`);
- the roster UI (`roster.js` screen `:79`, `:125-126`).

Making `canPlay` primary-only enforces the rule everywhere. Then:
- the −10% secondary attribute penalty (`monsters.js:155`) and the 1.75× injury risk (`progression.js:9,40`; `franchise.js:1688`) become unreachable, and are removed with their UI copy;
- the dex line "also X" (`dex.js:60`) and the free-agent sheets (`hq.js:247,270`) stop showing secondaries;
- the ability audit's TE→RB alternate (`ability-audit.js:135`) goes too.

**Generation** places monsters at a species' secondary position (`monsters.js:134-137` at a quarter weight; `draft.js:29`; `league-season.js:264`; scouting `franchise.js:1445` at 20%, which includes legendaries, two of which have cross-side secondaries: tempestra WR/CB and titanolith OL/DL). Primary-only generation is feasible: every position has at least 3 non-legendary primary species (QB 4, K 3, the rest 5–8). Some regions lack a primary species at some positions; the draft and arrivals already search the other regions.

**Measured on 6 existing saves and 3 fresh leagues** (`docs/task7-phase1/possave-*.json`):

| Measure | Owner | AI (15 clubs) |
|---|---|---|
| Monsters whose position ≠ their species' primary | 5–9 of 29–38 (about 20%) | 133–202 of about 560 (about 27%) |
| Legendaries off their species' primary position | 0 | 0 |
| Depth-chart slots filled out of position today | 0–1 per save (one S, on the season-15 save) | 0–1 per league |
| Manual lineup entries out of position | 0 | n/a |
| Base slots left empty if eligibility were primary-only | 0–1 (S) | 0–1 (S or K) |

So the depth-chart effect is tiny. The open question is the 20–27% of monsters whose single assigned position is their species' secondary (decision D6).

**Engine behaviour with no legal monster:** a ghost (`{attrs:{}}`, `rules.js:195`); plays needing the slot are flagged in the pregame (`hq.js:597`).

**Proposed lineup repair (non-destructive):**
1. On load, illegal `lineupManual` and `depth` entries are removed and logged.
2. The chart is rebuilt primary-only.
3. An empty base slot is shown on HQ with a direct link to the market and the depth chart.
4. AI clubs are repaired the same way, and their Task 6 needs fill holes in the next market or injury cover.

No monster is deleted, released or moved.

### 2.4 Legendaries and protected monsters

**Inventory:**
- 12 legendary species, none a K: offence 7 (pyroclast, stormcrown, tempestra, titanolith, aurelion, astralux, aurodrax), defence 5 (tsunarok, elderoot, glacivern, nyxshade, aegistron).
- Each gym club holds one protected gym legendary (`gyms.js:10-17`; `monsters.js:339-343`), so every gym is already within 1 offence and 1 defence.
- The rival's signature is never a legendary (`franchise.js:784-789`).
- Draft classes, arrivals and the generated veterans never contain legendaries (`monsters.js:146`).
- The leaks:
  - the owner's Legend Track signings (`franchise.js:234-253`, `1463-1531`), unlimited and including duplicate gym species (`:239`);
  - `devGrantLegendary` (`:1197`);
  - release or walk to the pools (`:557-573`, `:846`), then AI signing with no check (`league-season.js:207-208,244`; `franchise.js:577`);
  - owner-to-AI trades of owner legendaries (`franchise.js:1048-1056`).

**Protected status** = `m.legendary || m.signature` (`league-registry.js:30`): permanent contract, cap-exempt for AI clubs only, untradeable, unreleasable (`:120`), ageless. Owner legendaries are not protected: they have ordinary contracts, count on the cap, and can be released, traded or left to walk.

**Can compliance become impossible?** Not today: one protected legendary per gym, and the signature is never legendary. The validator must still treat a protected monster as permanently occupying its category, so that no path lets a second same-side protected legendary arrive.

The **category** is derived from `SPECIES_BY_ID[m.species].position` (canonical primary), never from the live `m.position` or a lineup slot.

### 2.5 Trades and transaction locks

| Lock | Current | Specification |
|---|---|---|
| Newly signed free agent | none | not tradeable until the next offseason |
| Release and re-sign | none (the pool is re-signable at once) | not in the same league year |
| Return to the previous team | none | not in that league year |
| `justArrived` | `m.traded.year === season.year`, owner desk only (`trade-desk.js:46`); lapses at season start; AI–AI trades ignore it | to be replaced by the league-year locks above, enforced for owner and AI |
| Contract on trade | AI–AI kept (`league-trades.js:145-150`); owner→AI kept (`franchise.js:1053`); **AI→owner reset to a new 2-year deal** (`franchise.js:1061`; `trades.js:197,200`) | the contract and remaining schedule are kept in every direction |

There is no league-year concept today (§3.2 defines one).

### 2.6 Saves

**Schema and storage versions:**
- `SCHEMA_VERSION 8` (`LEGACY 6`), `franchise.js:65-66`;
- `Save.migrate` accepts 6 or 8 (`save.js:32-49`);
- registry `LEAGUE_VERSION 1`; storage 7; cloud 8.

**How additive state works:** Task 6 added `strategy` and `devSlots` with no version bump (absent means the default).

**Requirement:** Task 7 needs a real version marker, because the legendary deadline and the mid-offseason rules depend on knowing when the new system began. Plan:
- `SCHEMA_VERSION 9` with an `f.freeAgency` block holding the system version, the activation point, the period state, the market, offers, the reservation ledger, the locks, and the legendary compliance deadline;
- migrate accepts 6, 8 and 9;
- an older build that meets schema 9 refuses it and does not corrupt it; it already refuses unknown schemas (`save.js:32`).

**Backups:**
- autosave is debounced (`store.js:154`);
- the weekly backup runs after Sunday (`main.js:97`);
- add a checkpoint backup before each period advance and before the season start (specification: "autosave/checkpoint around period advance and signings").

---

## 3. Integration design (within the approved decisions)

### 3.1 The offseason pipeline

The steps run in this order. Each step records completion in `f.freeAgency.steps[year]`, so reloading never repeats a step.

1. **Season close** (unchanged): awards, records, the board, the postseason event, the Legend Track pick.
2. **Retirement** (Task 6 `retirementPass`, unchanged, before renewals as required).
3. **Strategy snapshot:** Task 6 `evaluateStrategies`, at the same point and with the same inputs Task 6 validated (season results, pre-ageing horizons).
   - Moving it after ageing would raise ageing shares and invalidate the F1–F4 calibration.
   - The snapshot is referenced by the FA engine, as the specification's persistence list requires.
4. **Ageing** for the owner, the AI, pools and waivers (`offseason()` / `leagueAgeing`), moved here from season start.
   - Salaries are not reset.
   - The just-drafted-rookie age correction (`franchise.js:2239`) becomes unnecessary for new-system years and stays for legacy years.
5. **Contract processing:** the final-season extension window (§3.2) for the owner's expiring contracts (the existing "Contracts up" book, now on the negotiation engine) and the AI's Task 6 `leagueContracts` decisions (R3 and mode rules, now issuing Task 7 contracts).
   - Anything unresolved becomes a free agent when Period 1 opens.
6. **The AI–AI offseason trade window**, kept before the market, as today.
7. **FA Periods 1–5:** owner-advanced. At each advance, offers resolve in deterministic order and AI clubs bid and reassess.
   - Early completion and the skip warning work as specified.
8. **Draft** (unchanged mechanics); AI needs are reassessed before it.
9. **Roster preparation:** Task 6 trims, the nudge and injury cover, through the shared transaction rules, then the start-of-season gates, including legendary compliance.

### 3.2 League year and extensions

- **League year:** the league year turns over when FA Period 1 opens.
- **Final season:** contract processing (step 5) therefore still falls inside each expiring contract's final league year. The existing renewal step becomes the specification's "offseason extension in the final contract season", rather than a separate mechanism. In-season extensions use the immediate in-season negotiation.
- **Locks:** the trade and release locks are keyed to this league year.

### 3.3 Shared transaction engine

All acquisition paths go through one `acquire()` validator:
- free agency;
- extensions;
- the draft;
- trades in both directions, owner and AI;
- Clash recruitment;
- Legend Tracks;
- AI pool and waiver signings, the nudge and injury cover;
- `devGrantLegendary`.

**What the validator checks:**
- an open roster spot;
- the legendary category, with the conditional-replacement rule;
- the locks;
- usable cap.

It writes the contract, schedule and ledger atomically.

**Single-copy rule:** no monster can hold two final contracts. Each offer carries a version and transaction id, and the monster's market entry is removed in the same transaction.

### 3.4 Money

- Stored money is whole credits. Offer controls step in 100s.
- Bonus allocation is `floor(bonus/years)` with the remainder +1 to the earliest years. The allocations sum exactly to the bonus.
- The reservation equals first-year salary plus the first-year allocation.
- Market value (`salaryFor` and `renewalAsk` logic) stays as the expectation model. The contracted salary is separate, and the old salary is kept exactly on migration.

---

## 4. Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Salary persistence and the changed offseason order move balance; Task 6 was calibrated with salary resets and AI free agency after the draft | owner balance and drift shift (the Task 6 exceptions are the baseline) | one consolidated benchmark against v42.21.0 on the Task 6 seed sets; calibrate only the AI offer and budget limits that Task 7 introduces, never Task 6 constants |
| AI bidding cost across 15 clubs × 5 periods | Stage P season time | candidate lists from Task 6 needs only (top-N per club); measure Stage P at checkpoint B |
| Primary-only lineups with injuries | more ghost substitutions in games | measured in the checkpoint B soak; Task 6 injury cover already targets thin groups |
| A legacy owner holding 2+ legendaries on one side | blocked acquisitions; the gate at the deadline | trade and release options shown; nothing deleted |
| Released owner legendaries entering pools | AI over-limit | the validator blocks AI acquisition beyond 1 offence / 1 defence; legends may stay unsigned forever |
| Older cached build opening a v9 save | refused load (safe) | the existing refusal path; the cache-busting `?v=` stamp |
| Mid-offseason legacy saves | double processing | decision D3, and step records |

---

## 5. Implementation plan

**Branch:** one feature branch, `task7-free-agency`, with one PR and a commit per phase. There will be no PR stack this time.

**Testing policy:** targeted tests per phase, a cheap integrity soak at checkpoints A and B, and the full suite plus the consolidated benchmark **once**, at checkpoint D.

| Phase | Work | Depends on | Targeted tests |
|---|---|---|---|
| **2** Data contracts and migration | `f.freeAgency` (schema 9); the contract schedule; the ledger; period state; the league year; the legendary classifier (species primary) and validator; personality priorities (derived, additive); **salary persistence** (remove the resets); single position (`canPlay` primary-only, primary-only generation, UI copy) and the lineup repair; the old-save audit | — | contract and proration units; the classifier; lineup repair on the six saves; generation produces primary only |
| **3** Transaction engine | `acquire()` for every path; signing, extension, withdraw, reject and expire; atomic reservation and idempotency; the locks; trades keep contracts (fix `franchise.js:1061`, `trades.js:197/200`) | 2 | the offer state machine; reservation released exactly once; double-sign prevention; the locks; trade contract preserved |
| **Checkpoint A** | the legacy flow still runs end to end with the new data layer | 2–3 | 4-seed × 3-season soak with 0 integrity problems; save-compat 6/6 |
| **4** Negotiation and bidding | offer scoring by personality; patience erosion; counters; revisions (2 per monster per period); deadlines of 1–3 advances, capped at P5; the tie order; in-season immediate mode | 3 | seeded reproducibility; the tie order ignores owner status; revisions never extend deadlines |
| **5** AI integration | the AI bidder on Task 6 `rosterPlan`, `modeOf`, `upgradesAllowed`, `contractLength`, `clubCapRoom` and `marketValue`; budgets reserve future obligations; reassessment after signings and before the draft | 4 | parity tests (AI and owner face identical rule outcomes); no illegal AI acquisition |
| **6** Orchestration | the §3.1 pipeline; five periods; skip warnings; the year-round market; in-season signings; step idempotency; season 20 endpoint | 5 | full offseason loop; reload in every period; no repeat ageing or expiry |
| **Checkpoint B** | the complete simulated system | 2–6 | 8-seed × 8-season soak: integrity, cap solvency, roster legality, legend limits, determinism, Stage P; quick calibration of the new AI limits only |
| **7** UI and GM Assistant | the market screen (simple, with expandable detail); offers; cap total, reserved and usable; block explanations; period advance warnings; legendary announcements; the GM Assistant (recommendations only); 320–430 px | 6 | browser checks: market, offer, counter, advance warning, blocks, phone widths |
| **8** Migration and legendary enforcement | the legacy deadline; the compliance gate with trade and release options; AI self-compliance; old-save paths (in season, mid-offseason, started draft) | 6 | save-compat on all fixtures and a constructed over-limit save; the gate cannot deadlock |
| **Checkpoint C** | UI on the real build | 7–8 | the deploy check on a preview build; the browser checks above |
| **9** Consolidation | the full suite once; the consolidated franchise benchmark (Task 6 seed sets B/H, drift, contract, plus FA metrics); preview on the private test link; the approval package | all | one run, against pre-registered gates (decision D7) |

---

## 6. Items needing the owner's decision

Only items the specification marks as not approved, or where it can be read two ways.

| # | Item | Recommendation |
|---|---|---|
| D1 | Protected AI gym legendaries and the rival's signature: permanent contracts and the AI-only cap exemption | **Keep protected, permanent and cap-exempt, as a documented gym/rival campaign rule.** They never enter the market, they still count toward their club's 1 offence / 1 defence limit, and owner-acquired legendaries stay on ordinary contracts. Counting their salaries would put 5 of 8 gyms over the cap in the season-15 save (`docs/task7-phase1/cap.mjs`). |
| D2 | The rookie 70% scale, rookie trade protection, and the staff severance/retention/firing charges | **Keep all three.** The 70% rookie scale will now actually last its two seasons, since the salary reset that erased it is removed. Rookie trade protection is unchanged. Staff charges stay one-season staff charges: shown in the cap schedule, counted against usable cap, and separate from the player zero-dead-cap rule. |
| D3 | Saves loaded partway through an offseason (including a started draft) | **Finish that offseason under the existing flow (no rewind); the new system starts at the next season close.** This matches resolution 3 ("a save loaded partway through an offseason receives the following complete offseason"). |
| D4 | Commissioner-reviewed over-cap acquisitions (trades and Clash recruits may go over today) | **Apply the binding affordability rule to every acquisition path.** Keep the commissioner review only as a safety net for non-acquisition cap changes (staff charges, event raises) and legacy saves already over. |
| D5 | Beast Clash recruitment terms (today a won encounter signs at fixed salary for 2 years) | **A won encounter gives the right to the simplified in-season negotiation under the shared rules.** No Clash battle rule changes. Legend Track legendaries also obey the legendary limit. |
| D6 | "One position" for species data | **Future generation uses each species' primary position only, and species secondaries are removed from play and display.** Existing monsters keep their current single assigned position: about 27% of AI and 20% of owner monsters sit at a species secondary today, and none of them is changed. |
| D7 | Benchmark gates for checkpoint D | **Hard gates:** 0 integrity or ledger problems, usable cap never negative, legal rosters, legendary limits always held, determinism, Stage P within +10%. **Comparative gates:** the Task 6 rebuilding and franchise-balance measures not significantly worse than v42.21.0. **Reported, not gated:** owner balance and drift (the specification treats drift as a separate baseline issue). **New FA metrics, reported:** FA distribution, competition and age/legend distribution. |

---

## 7. Not done in this phase

No gameplay code, no merge, no publish, no Task 8 work. Implementation starts after the owner's answers to §6.

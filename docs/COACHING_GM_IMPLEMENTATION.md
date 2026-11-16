# Coaching substitutions, live injuries and persistent GM careers

Implementation candidate: `codex/coaching-gm-careers`, build `v43.17.0-coaching-gm-preview`.
Base: `5bebfff` (the owner's approved rules in the root GDD).

This branch is for Claude's independent testing and review. It is not merged or deployed. The existing main game link and real user saves have not been changed.

## Implemented behavior

### Coaching

- The three head coaches have fixed philosophies visible at onboarding, hiring and in the staff room: Flint is Starter-Focused, Vale Balanced, Reyes Heavy Rotation. AI ordinary clubs derive a stable staff/philosophy; a formerly managed club retains its stored staff.
- Settings and the match's **Lineup & Substitutions** panel offer Automatic (default) and Manual. A manual next-play selection overrides the automatic decision for one play. The backend revalidates it at the snap.
- Position eligibility, health and identity uniqueness are shared constraints. Only actual rostered monsters play. The same selection routine serves live coaching, headless simulation, scrimmage packages, conversion attempts and special-teams units.
- Heavy Rotation starts looking below 72% stamina and tolerates a 22-point average-attribute drop; Balanced uses 45%/12; Starter-Focused uses 20%/6. A replacement must be 15 percentage points fresher. In a close fourth quarter or overtime (margin <=8), Balanced/Starter thresholds are multiplied by .6. These initial tunables need gameplay review, not a new scope decision.
- In the match, routine rotation is summarized as one brief line per play ("Rotation changes for this play: N"). An injury, and the reserve who replaces your injured monster, are shown at once, one line each. The full list of the play's changes is in **Lineup & Substitutions**. A listed monster returning after a rest or a one-play selection is labelled "back in the lineup".
- Bench time does not introduce stamina regeneration; existing halftime recovery remains. Injured players cannot return. Exhausted players must yield to a non-exhausted legal reserve; if none exists, the existing halved-effectiveness fallback remains.
- Contact injuries are deterministic from game seed, play index and monster ID. They cannot be rerolled by reloading, rerendering, changing animation speed or replaying a clip. Base chance .0015 per contact participant, multiplied by durability/depleted-stamina terms. Existing Minor/Moderate/Severe recovery bands remain.
- Injuries are stored in the game's JSON state and committed to persistent health at final settlement; the deciding Clash filters injured football players too. Unavailable package calls are removed while another equipped call is legal. Healthy special-teams units are filled before selecting their seven; missing package specialists do not create placeholder bodies. If no legal equipped scrimmage call/lineup remains, the game ends as an administrative 0–21 forfeit, with an explicit recorded reason. Measure this frequency carefully.
- Stats are keyed by actual individual IDs in new games; the old slot-keyed format is still readable. Box scores, participation XP, performance grades, reserve practice eligibility, fatigue and Dex credit use the actual participants. Kicking/formula-unit stat paths also record their participants.

### GM careers

- The player is a hired GM accountable to the Board. No club-purchase economy or GM salary economy was added.
- **GM Career** is accessible from HQ throughout the career. After finalized season awards, **GM Job Market** opens before contract/free-agency decisions. Staying is explicit in the offseason UI; normal headless management actions close that window for a staying GM.
- Jobs are at the ordinary franchises, preserving the existing game's ordinary-club player model; the eight named gyms remain campaign opponents. Vacancies and decisions are deterministic. At least one rebuilding application always succeeds, and a fired GM receives a direct rebuilding offer.
- Applications, incoming approaches and accepted/declined outcomes are supported. Interest considers career win share, the last three seasons, results relative to Board forecasts and championships. Reapplying cannot reroll a decision.
- Preview includes real inherited monsters, contracts/injuries, staff, next-class pick ownership, estimated cap room and expected team direction. Acceptance requires confirmation.
- A move keeps the save slot, UID, persistent league, season history, pick ownership and global records. It swaps the managed roster with a registry club without physically transferring individual monsters or rewriting their team histories. The former club continues under AI management.
- The club the GM leaves becomes an AI club in the same offseason: it gets its AI strategy mode, then its expiring contracts go through the AI renewal negotiation the other clubs had at season close (each monster answers; one who will not talk walks to the market), and it is trimmed to the cap. The result is recorded on the ended stint.
- Returning to a former club keeps its staff contracts' real expiration dates and agreed salaries; only contracts that have ended come up for renewal. Dead money from the earlier stint is not charged again.
- Club campaign/finances/depth/staff state is stored separately. The destination's current roster always comes from the live registry, not a stale earlier stint. New Board evaluation/confidence starts fresh. No staff or monsters automatically follow the GM.
- Career totals preserve each stint's earned accomplishments, subtracting inherited club totals so previous AI seasons and returning to a club cannot inflate the GM's Hall case. History rows identify the club; GM career and Hall records retain stints.
- Inherited AI duplicate display names get the existing numeral treatment, and career backfills run during the move. This avoids a save loader silently changing the newly inherited roster. Identity, contracts and historical award attribution are preserved.
- Moving is transactional in memory, with structural league verification and rollback on error. The UI commits the changed save before showing success and restores the previous club if persistent saving fails.

### Fifteen seasons and penalties

- A shared constant limits the entire GM career to **15 completed seasons**, across all jobs. Changing clubs/firing does not reset history or the career counter.
- Already-running old saves at or beyond that limit can complete their current season. No historical season is deleted. Already archived saves stay read-only. No job opens after the career limit.
- The optional 40-second play clock is advisory. Expiry resets its display; no yardage, down, game-clock, possession or scoring mutation occurs. No expanded penalty system is added. Old penalty log sentences keep their stored fallback text.

## Verification and limits

See `docs/coaching-gm/VALIDATION.md` for final targeted results. The automated feature tests include a real two-season career that changes club before contracts, checks the still-live former club, and round-trips the save; an actual slot-store round trip; deterministic contact injuries; philosophy differences; manual choices; player stat attribution; firing; the season cap; and non-mutating job-market rendering.

The pre-existing central-text audit failure is reproduced on clean base `5bebfff`: nine old ability/FX keys are orphaned. Other central-text checks pass. Do not waive it or call the full suite green; compare baseline and candidate and resolve it through the normal review process.

The remote browser here could not reach the local HTTP preview (HTTP response failure), so no interactive browser or physical-device pass is claimed. Node module import checks and the UI's pure rendering checks pass. Full policy-required regression, browser/device acceptance, 15-season management studies and balance studies are still for Claude before approval.

## Claude handoff

1. Fetch `codex/coaching-gm-careers`; inspect the diff against `5bebfff`, root GDD §§27.5D–E and this report. Treat this as an implementation candidate, not an approved release.
2. Test and correct each approved behavior. In particular inspect substitution plans after play/package changes, injured/exhausted and zero-depth cases, actual stats/rewards for reserves, partial-game reload, all special-team paths, conversion attempts, overtime Clash eligibility, and advisory clock expiry while the game is paused/animated.
3. Walk through hiring/philosophy labels, Settings, the lineup panel and job market at 320px, iPhone 17 Pro Max size, landscape and reduced motion. Verify controls, no horizontal overflow, no repeated prompts and no page errors. Test the actual DOM event paths, not only rendered strings.
4. Run a career with multiple moves, a return to a former club, rejected offers, incoming offers and forced firing. Verify no duplicate identities, picks/contracts/staff state, salary/cap accounting, franchise-specific accomplishments versus GM totals, roster/depth repair, former-club continuity and fair Board goals. Verify job acceptance cannot occur after management transactions or extend the 15-season cap.
5. Test old active saves before and beyond Season 15, existing archives, backups, import/export/cloud/slot restore, mid-game stamina/injury/manual choices, failed storage and stale tabs. A failed job save must leave the prior club playable. Do not use the owner's real cloud save for testing.
6. Measure rotation usage, injury incidence, forced forfeits, early/late-game effectiveness and multi-season AI roster integrity. Initial thresholds/chances are tunables; report any material behavior change before adopting a major redesign.
7. Follow `docs/TESTING_POLICY.md`: run the full suite once on the final candidate before approval; investigate failures, compare the documented baseline text-audit issue, and rerun affected checks after corrections. Do not weaken assertions or replace tests with source-text mirrors.
8. Report what passed, actual bugs corrected, remaining limitations and an exact commit. **Do not merge to main or update the main game link yet.** Return it for owner review and a subsequent release decision.

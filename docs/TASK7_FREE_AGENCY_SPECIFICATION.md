# Gridiron Beast — Task 7 Free Agency Implementation Specification (owner-approved; converted from the attached .docx on 2026-11-04, text unchanged)

Status: Foundational design approved (30/30 questions), with
owner-approved audit resolutions dated October 31, 2026. Design approval
does not authorize implementation, merging or publishing.

# Approved decisions

1.  Hybrid negotiations and bidding wars.

2.  Individual evolving personality priorities.

3.  Multiple manually advanced offseason periods.

4.  Dynamic patience, with consequences for repeated low offers.

5.  Negotiate salary, contract years, signing bonus.

6.  Prorate signing bonuses over contract years.

7.  No dead cap upon departure; no bonus refunds; anti-exploit
    safeguards; bonus advanced optional.

8.  Open roster spot required before making a standard offer.

9.  Unsigned free agents available year-round.

10. AI uses Task 6 long-term franchise intelligence.

11. Display competing offers.

12. Five offseason periods; early completion possible; warn on skip.

13. Personality-driven signing timing.

14. Free-Agent Interest Dashboard.

15. Playing-time preference depends on personality/career stage; no
    binding starter promises.

16. Personality-driven demand flexibility when unsigned.

17. Simplified immediate in-season negotiation.

18. Special legendary bidding/signing announcements; legends never
    retire.

19. Optional GM Assistant; recommendations only, no automatic signings.

20. Legendary slot replacement negotiation allowed, but existing
    same-side legendary must be removed before signing becomes official.

21. No legendary special-teams monsters.

22. Existing saves temporarily retain over-limit legendaries; block
    additional acquisitions in an over-limit category immediately.
    Require compliance before the season following the first complete
    offseason under the new system.

23. Contract extensions in final contract season, in-season and
    offseason.

24. Reserve first-year cap charge for pending offers; release upon
    closure.

25. Personality-driven comparison of competing offers.

26. Age/personality-based unsigned retirement; legends exempt.

27. All five free-agency periods before the draft.

28. AI long-term budgeting with Task 6.

29. Visible personality-driven offer deadlines.

30. Simple UI, expandable advanced detail.

Additional legendary cap: maximum one offensive and one defensive
legendary per franchise, including AI, across draft/trade/FA/roster
systems. No legendary kickers or special teams.

# Functional specification

## Offseason sequencing

Approved order: Season close -\> retirement/ageing and contract
processing -\> FA Periods 1-5 -\> draft -\> roster preparation -\> next
season. Preserve Task 6 retirement before renewal decisions. Run
transitions in a deterministic, idempotent order. Preserve the
year-round unsigned-player market and simplified in-season signings. Do
not repeat completed ageing, retirement, expiration or draft events
during migration.

## Player records and market

Maintain stable monster identity, age, species, rarity, one assigned
football position (no secondary-position eligibility), abilities,
ratings, current contract and free-agent status. Add market expectations
and mutable negotiation state; personality/career stage controls money,
security, role, winning, patience, and timing. Ensure unsigned ageing
and retirements reuse Task 6; legendary retirement prohibited. Recompute
team fit from actual roster, scheme/role where supported, and cap
availability. Display competing offers as grounded simulation data,
never invented UI offers.

## Offers and contracts

Offer fields: team ID, monster ID, annual/base salary, years, signing
bonus, submission period/time, expiration, state, reserved first-year
cap charge, negotiation round, and version/transaction ID. Use explicit
state machine: draft -\> pending -\>
countered/accepted/rejected/withdrawn/expired/signed, with accepted
conditional on all signing requirements. Prevent multiple final
contracts for one monster. Reserve first-year base salary plus the first
year's exact integer-credit bonus allocation (plus any existing
applicable cap components). On successful signing, convert reservation
into actual cap charge atomically. On reject/withdraw/expire, release
once. Future-year cap schedules reflect term and prorated bonus. No dead
cap after trade/release/retirement and no bonus refund; apply the
transaction restrictions in the approved audit resolutions. Trades
preserve the existing contract and remaining schedule; remove the
departing team's future charges without restarting or reprorating the
deal. Standard offer requires open roster slot; legendary conditional
replacement only relaxes occupied legendary category, not the ordinary
open roster spot rule. If replacing legendary, verify removal at
finalization and do not finalize if not compliant.

## Negotiation engine

Monsters score offers by personality, money, term/security, likely
playing opportunity, team success, career stage and market context.
Support rival offers, patience erosion from lowballs, counteroffers and
dynamic acceptance timing. Display a readable interest/offer
explanation. Make outcomes reproducible under seeded RNG for tests;
avoid arbitrary opaque randomness. In-season use immediate
accept/reject/counter, with the same financial and personality rules.

## AI teams

Integrate Task 6 strategic planner for positional need, depth,
contender/rebuild status, aging, upcoming extensions, draft needs, and
long-run cap. Avoid parallel contradictory AI logic. AI must observe the
same cap, roster, legendary, and offer rules; no special hidden
exceptions. Limit offer counts and reserve budgets for critical
positions and future obligations. Reassess needs after signings and
before draft.

## Legendary policy

Enforce one offensive and one defensive legend maximum, no special-teams
legendary eligibility, across all acquisition paths. Each monster has
one assigned football position; legendary category is derived from
canonical primary position and remains fixed. Allow negotiation for
replacement without overfilling the slot; final contract is conditional
on moving the existing same-side legend. Legacy saves retain existing
excess and block further acquisitions in an over-limit category
immediately. Compliance is required before starting the season following
the first complete offseason under the new system; block advancement
with trade/release options at the deadline. Never silently delete
monsters. Legends may remain unsigned forever and never retire.
Legendary announcements are cosmetic and cannot alter competitive rules.

## Interface

Main market: period 1–5, cap total/reserved/usable, positional filters,
monster name/OVR/position/rarity, team fit, salary expectation,
interest, quick negotiation. Expandable: personality priorities,
competing offers, bonus/term controls, full cap schedule, deadline and
negotiation history. Optional GM Assistant provides recommendations and
offers only; never signs or spends cap without confirmation. Accessible
explanation for roster/legendary/cap blocks, and advance-period warning
for pending offers.

## Persistence and integrity

Persist market, offers, deadlines, reserved cap, period, team strategy
snapshot references, and contract schedules with save version.
Idempotent load, advance, and signing; deterministic resolution
ordering; atomic contract transactions; no duplicate player assignment;
no negative usable cap; no stale offers after signed elsewhere; no
orphan reservations. Migration must preserve old saves and legendary
over-limit transition. Autosave/checkpoint around period advance and
signings.

# Edge cases / acceptance criteria

- Multiple teams offer to one monster; exactly one can sign; losers'
  reservations released.

- Two offers accepted at same tick; deterministic arbitration and no
  cap/roster oversubscription.

- Player withdraws, monster rejects, or deadline expires; reservation
  released exactly once.

- Counteroffer changes salary/term/bonus; adjust reservation atomically
  or block if unaffordable.

- Team with full roster cannot submit ordinary offer; actionable roster
  link.

- Team with existing same-side legend can negotiate replacement but
  cannot finalize until prior legend removed.

- Existing save over legendary limit retains monsters and cannot add
  more in offending category; deadline enforcement does not silently
  delete monsters.

- AI cannot draft, trade, sign, or otherwise acquire a forbidden third
  legend.

- No legendary can be assigned special teams; legends never retire even
  after many unsigned years.

- Monster signed during an offseason period disappears from market for
  all teams immediately.

- End of period with pending offer displays warning; offers continue or
  expire according to deadline.

- Free-agent pool persists into season; in-season negotiation resolves
  immediately.

- Salary bonus proration rounds consistently to smallest currency unit;
  schedule sums to total bonus.

- Trade/release/retirement removes future bonus charges under approved
  simplified rules; exploit checks.

- Extensions do not accidentally duplicate or overlap active contracts;
  final-season eligibility enforced.

- Market with zero free agents or zero cap handles gracefully; no stuck
  offseason progression.

- Save/reload in any period preserves offers, cap reservations,
  deadlines, and AI decisions.

- 20-season franchise transitions remain valid; season 20 does not
  launch invalid offseason.

- No monster can fill a football position group other than its assigned
  position; secondary-position metadata cannot enable an exception.

- Old saves using secondary slots receive a documented lineup repair
  path without monster deletion.

- Legacy deadline persists across reloads; over-limit franchises cannot
  advance past it and retain actionable compliance options.

- Bonus remainder allocation is exact and stable; negotiated salaries
  survive ageing and development.

- Offer revisions cannot renew deadlines or reset patience; tie outcomes
  survive reload and do not favor the owner.

- Free-agent trade locks and same-year release/re-sign and return-trade
  restrictions apply equally to player and AI teams.

- No compensatory pick is awarded for any departure.

# Implementation phases

1\. Repository audit: inspect current contract, cap, offseason, draft,
roster, AI Task 6, save migration, trade, legendary and UI systems.
Document exact integration points and conflicting behavior. No
main-branch changes.

2\. Shared data contracts and migration: contract schedules, market
offers, cap reservation ledger, period state, legendary
classifier/validator. Apply the approved single-position policy across
species data, generation, depth charts, lineup validation, AI needs,
market filters and UI; audit old-save lineup repairs before
implementation.

3\. Core transaction engine: signing, extensions,
withdraw/reject/expire, atomic reservation and idempotency.

4\. Personality and bidding simulation: offers, counters, market
dynamics, deadlines, rival bids.

5\. AI Task 6 integration: needs, budgets, market participation and
reassessment.

6\. Offseason and in-season orchestration: five periods before draft,
advance warnings, year-round signings.

7\. UI and GM Assistant: simple marketplace, advanced details, feedback,
legendary presentation.

8\. Save migration and global legendary enforcement: all acquisition
paths and old saves.

9\. Targeted regression tests and preview, then one consolidated
franchise benchmark at integration checkpoint; obtain explicit approval
before merge/publish.

# Testing plan

Unit tests: contract accounting, proration, offer state transitions, cap
reservations, personalities, legend eligibility, expiry, retirement.

Property/invariant tests: cap \>= 0; reservations match active offers;
no double signings; roster limits; no legend retirement; contract
schedules balance.

Integration tests: offseason -\> FA1..FA5 -\> draft -\> season;
in-season signing; extensions; trades/releases; save/reload; old-save
migration; AI vs player parity.

Simulation: seeded multi-team, multi-season runs for free-agent
distribution, cap solvency, bidding competition, age distribution,
legend distribution, draft impact and championship concentration.

UX: mobile/desktop layouts, keyboard/accessibility, younger-player
comprehension, clear errors and warnings, optional advanced details.

Regression: Task 6 ageing/retirement and AI, trading, draft, franchise
legacy and 20-season endpoint; existing difficulty drift remains an
unresolved separate baseline issue.

# Owner-approved audit resolutions - October 31, 2026

## 1. Contract accounting and rounding

Approved: use whole credits for stored money, with salary and
signing-bonus offer controls in 100-credit increments. Preserve old
salaries exactly during migration. Divide the bonus into integer-credit
yearly allocations; distribute any remainder one credit at a time to the
earliest years so the allocations sum to the original bonus.

Approved: integrate the shared one-, two- and three-year contract system
from Task 6. Separate market valuation from contracted salary; ageing,
development and rating changes must not overwrite a negotiated active
salary.

Audited baseline (main commit fc19d345; October 31, 2026): tier base
caps are 1,800,000 / 2,600,000 / 3,600,000 credits for Challenger /
Vanguard / Sovereign. The owner cap perk adds 4%. Existing records use a
separate salary field and a contract containing signed, ends and years;
main currently limits normal contracts to one or two years. Existing
salary generation and transaction rounding differ. These are baseline
facts, not a new cap increase.

## 2. One football position per monster

Owner decision: remove dual-position and secondary-position eligibility
for all monsters. Every monster has one assigned football position and
may fill only depth-chart slots in that position group (for example, a
WR may fill WR1 or WR2). This gives monsters a clearer positional
identity and supports a more varied monster roster.

Apply the rule consistently to both player and AI teams, species data,
monster generation, roster/depth-chart eligibility, draft and market
filters, team needs and displayed position information. No
secondary-position fallback may bypass the rule.

Legendary offensive/defensive category remains stable, derives from
canonical primary position, and cannot be changed through lineup edits,
trades or position edits. No legendary kicker or special-teams
eligibility. Before implementation, audit existing saves for monsters or
lineups using secondary positions and document a fair repair path; do
not silently delete monsters. No new monster count or roster expansion
is authorized by this decision.

## 3. Legacy legendary compliance deadline

Approved: compliance is required before starting the season following
the first complete offseason conducted under the new system. A save
loaded during a season receives the upcoming complete offseason. A save
loaded partway through an offseason receives the following complete
offseason.

Immediately block additional acquisitions in each over-limit category.
At the deadline, block season advancement and show direct trade/release
options. Retain every monster until the player makes the necessary
choices. AI teams resolve excess through legal transactions before the
same gate. Reconcile protected-monster restrictions so compliance cannot
become impossible.

## 4. Offer deadlines, counters and tie resolution

Approved: personality sets an offer response window of one to three
period advances, capped at the end of Period 5. Display the exact
expiration before submission. Time advances only when the user advances
the period.

Approved: allow two substantive team revisions per monster per period. A
salary, term or bonus change creates a new version and atomically
updates the reservation. Revisions and withdrawals cannot reset patience
or extend the original deadline. In-season negotiations resolve
accept/reject/counter immediately under the approved rules.

Approved tie order: personality-weighted offer score, then the monster's
strongest individual priority, then a saved seeded tie-break value, then
stable team ID as a final fallback. Player-controlled status and
processing order confer no advantage.

## 5. Offseason sequence

Owner-confirmed order: Season close -\> retirement/ageing and contract
processing -\> FA Periods 1-5 -\> draft -\> roster preparation -\> next
season.

Technical integrity requirements remain: preserve completed contract
decisions and draft picks; record completed transition steps; never
repeat ageing, retirement or expiration on reload. The exact insertion
point for saves with an already-started draft remains a migration detail
to document and review; the owner explicitly confirmed the sequence, not
a draft rewind.

## 6. Zero-dead-cap transaction safeguards

Approved: a newly signed free agent cannot be traded until the next
offseason. A team cannot release and re-sign the same monster during the
same league year. A traded monster cannot return to its previous team
during that league year.

Approved: trades preserve the existing contract and remaining bonus
schedule; they cannot create a cheaper replacement contract or restart
proration. Remove the departing team's future charges under the approved
zero-dead-cap rule. Record bonuses as paid once, with no refunds or
duplicate payments.

Enforce restrictions on player and AI transaction paths and persist them
through save/reload. These are transaction restrictions; they do not
introduce departure dead cap.

## 7. Compensatory draft picks

Owner decision: no compensatory draft picks. A free-agent departure,
release, retirement or other contract ending does not award a
compensatory selection. No compensatory-pick system is to be invented or
added.

## Remaining integration decisions - not approved by this response

The owner's answer to item 7 rejects compensatory picks; it does not
approve all previously proposed treatments of other existing exceptions.
Explicitly reconcile protected AI legendary/signature permanent
contracts and cap exemptions with Task 7's shared financial rules. Do
not silently remove or extend protected status.

Document the treatment of existing rookie discounts, rookie trade
protection, staff severance/retention charges, and temporary
commissioner-reviewed over-cap acquisition paths. Task 7's
already-approved offer affordability/reservation rules remain binding.
Complete the old-save position/lineup audit and started-draft migration
plan before coding.

# Delivery / approval gate

Deliver audit, implementation plan and isolated development preview.
Keep main game unchanged until explicit user approval. Run targeted
tests per phase and consolidated benchmark at meaningful integration
checkpoint rather than repeatedly running full expensive suite. Do not
declare production ready solely on unit tests.

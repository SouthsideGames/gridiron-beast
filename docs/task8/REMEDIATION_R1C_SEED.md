# task7-remediation R1 c: the seed of the "intervening signing" scenario (for owner review)

Test: `tests/task7-remediation.test.js`, "R1 c: an intervening signing elsewhere never makes the release-and-sign partial (the
released monster legally signs with another club)". **The seed change is unapproved** (owner, 2026-11-08 09:26). This note
explains it and changes nothing.

## What the test does

`atomicUpgradeCase(seed)` opens a real free agency on `newFranchise(seed)`.

1. It takes the third AI club alphabetically. If that club has fewer than 38 monsters, it pads the club to 38 with OVR-45 OLs.
2. It picks a release candidate, the "spare": a pad if there is one, otherwise the club's weakest unprotected monster at a
   position with more than three players.
3. The club offers for a free agent. Without a release, the offer is refused for lack of a roster place. The club then makes
   the offer conditional on releasing the spare.
4. Free agency runs to its end through the real code.

## The assertions (all unchanged; no seed change touches them)

- The release is atomic:
  - nobody is released while the offer is pending;
  - the spare is released only when the signing completes;
  - the roster ends at exactly 38.
- The release went to the market, or to another club. It never vanished.
- The released monster cannot rejoin the club this league year (lock).
- No charge is left behind: committed cap is at most the starting cap plus the offer's reservation.
- The market has no problems (shared validation).
- **The scenario's prerequisite, in this variant only:** the released monster was signed by another club in a later period
  (`releasedSignedElsewhere`). The seed exists only to make this prerequisite hold. The atomicity checks above are the test.

## The seeds and why each one stopped working

| Seed | When | What happens to the spare at that seed |
| --- | --- | --- |
| 34 | Task 7 original | The intervening signing happened. After Task 8 M1's Dex generator, the release stays unsigned. |
| 39 | Task 8 M1 (seeds 34–45 searched; 39 and 40 worked) | At 75545f0, before D1: the spare is a WR, OVR 23, age 22. It ends on the market, and no club signs it after the D7 identities' free-agency tie-break. At 4383965, after D1: the spare is an LB, OVR 27, age 25. The approved Phase 3 pool rule (`POOL_WORTH`: an AI castoff under OVR 52 and older than 24 leaves the league at once) sends it straight out of the league. That is a legal outcome, but the scenario's "on the market or at another club" check fails. |
| 40 | D7 (unapproved; only 40 of 34–50 worked) | At 75545f0: the spare is a DL, OVR 17, age 21. Bayou Stalkers sign it, so the prerequisite holds. At 4383965, after D1: the spare is a DL, OVR 22, age 24. It stays on the market and nobody signs it, so **the test fails at the current head.** |
| 41 | D1 branch, never merged (34–60 searched; 41 and 53 worked) | At 4383965: the spare is an LB, OVR 12. Thunder Mesa sign it, so the prerequisite holds. |

The seed never chose a different rule. It decided which monster was the spare, and whether another AI club happened to want a
low-rated castoff. Every approved change that reshuffles founding rosters (the Dex generator, the D7 identities, D1) reshuffles
both, so a searched seed decays again at the next approved change.

## Options for the owner

1. **Approve a seed** (40, or 41 after D1). It is the cheapest option. It is a searched seed, and it will drift again.
2. **Construct the prerequisite explicitly**, as was done for R4 and the career fixture (recommended). Through the real
   free-agency code:
   - make the spare a pad at a pool-worthy rating (OVR at least 52 and at most 60, so the pool keeps it);
   - give a second AI club a real lineup hole at that position and cap room, so the real AI free agency signs it in a later
     period;
   - assert both prerequisites explicitly before the atomicity checks, which stay as they are.
3. **Leave the test failing** until the M6 economy recalibration.

At the current head the test fails. It is the only failure the final M3 run is expected to show, and it is left as it is pending
this review.

## Resolution (owner 2026-11-08 10:25): option 2 implemented

- **The intervening-signing test is constructed** through the real free-agency code, on the fixed market of franchise 31:
  - The spare is a legally generated TE (quality 68, age 23). Its OVR sits in the pool's keep band, 52–60, and this is asserted.
  - The upgrade completes in a period with more periods still to come.
  - The second club's TEs then leave the league through the ordinary silent exit, which gives it a genuine urgent TE hole. Its
    usable cap is asserted to cover the spare's ask.
  - Free agency runs to its end. Nobody is assigned to anybody.
  - The later signing elsewhere is asserted. In this run Sunfire Lions sign him, while the second club takes another TE.
  - Every atomicity, roster-size, cap, market-validity and same-year lock assertion is kept.
- **"Never vanished" is restated** as a valid recorded destination or disposition: the market, another club, or the league exit
  the approved pool rule allows. The last of these needs a recorded release by the club, no copy on any roster or market, and an
  eligible castoff (OVR under 52 and older than 24).
- **The pool rule now has separate coverage:** an eligible low-rated AI release leaves the league with a recorded release and
  no stale copy, while one inside the keep band enters the pool.
- **No gameplay rule changed.** `tests/task7-remediation.test.js` passes 10 of 10.

# AI club identities: proposal for owner review (N7f)

**Status: proposal.** Nothing here is approved or implemented. This review does not block M1 foundation work.

## 1. How league clubs and gyms relate today

Sources: `src/data/league.js`, `src/data/gyms.js`, `src/franchise/strategy.js`, `src/franchise/franchise.js`, and GDD §15.

- **The league.** 16 clubs in 4 divisions, 2 conferences, one campaign.
- **Gym clubs.** Eight clubs are permanent gyms, two per division. Each has:
  - a home element, whose monsters fill most roster spots;
  - that element's **legendary**, the only copy in the league;
  - a named coach with a style and an offensive and defensive scheme;
  - a tier (early, mid or late) and a badge.

  The player can never choose a gym.
- **Ordinary clubs.** The other eight are ordinary, and the player chooses one of them at creation. That leaves **15 AI clubs: 8 gyms and 7 ordinary.**
  - Ordinary clubs' coaches are derived from a hash **that includes the season**, so their play-calling tendencies change every year today.
- **Schedule.** Every season an ordinary club plays four gyms and five clubs of its own group, alternating.
- **Free legendaries.** Fire (Pyroclast), Nature (Elderoot), Wind (Tempestra) and Psychic (Astralux) belong to no club; they are earned through Legend Tracks.
- **Competitive cycles already exist** (Task 6, `strategy.js`). Each AI club takes one of Contend, Compete, Retool or Rebuild once a season, from visible facts: results, roster quality, age profile, payroll and picks. The mode already steers its draft, trades and free agency. **Gyms never fall below Compete.**
- **Seasonal strength boosts exist today and are retired by N7f:** yearly gym growth, ordinary growth of 0.5 per season, and a whole-league floor for each title the player wins.

## 2. Proposed identity model

**What an identity is.** Each AI club holds a fixed **offensive identity** and **defensive identity** for the whole franchise. Gyms also have their element and a legendary strategy.

**What an identity guides.** It works only through legal choices, never through hidden boosts:

| Area | How the identity guides it |
| --- | --- |
| Coach | Fixed scheme and tendencies (ordinary coaches stop changing every season). The pass/run bias and aggression come from the identity. |
| Lineup | Prefers players who fit the scheme among legal options; position legality and legendary limits are unchanged. |
| Draft and scouting | A tilt toward the positions and attributes the identity values, combined with the existing mode weights. |
| Trades and free agency | A need for an identity position counts more; a club does not chase players its scheme can't use. |
| Training | The approved allocation, with the identity's attributes ranked first among a position's OVR attributes. No non-approved attribute is ever trained. |

**Strengths, weaknesses and counterplay.** Every identity has a matchup it struggles with. Results are not equalised.

**Cycles.** The modes above drive rebuilding, developing (Retool), contending and declining. A club's identity stays constant while its mode moves. Nothing regenerates or boosts a club.

**The player's club.** It has no identity. If the player picks a club that would be ordinary-AI, its identity is simply not applied.

## 3. Gyms: element plus a legendary strategy

Legendary positions and abilities are the approved Dex versions.

| Gym | Element | Legendary (position): approved ability | Strategy | Strength | Weakness and counterplay |
| --- | --- | --- | --- | --- | --- |
| Harbor Sentinels (early) | Water | Tsunarok (S): **Tsunami Line**, an interception earns a full-width Water band at safety depth for the next play; Clash: Riptide Pursuit | Ball-hawk zone defence: Water CBs and safeties who break up and intercept passes (Splashdown), with a patient, ball-control offence | Turns risky throws into turnovers and slippery next plays | Runs and short, safe passes deny interceptions; Water-type receivers ignore the band |
| Sunfire Lions (early) | Light | Aurelion (WR): **Daybreak**, opponents' touchdowns arm a guaranteed defence-disrupting flash after a reception | Air Raid with Light cooldown fields (Beacon Lane); built to come back | Dangerous when trailing; repeated signature use | Field goals instead of touchdowns keep Daybreak unarmed; pressure on the QB |
| Thunder Mesa (mid) | Electric | Voltarch (QB): **Stormguard**, two temporary pass blockers; Clash: Twin Thunder | Quick passing behind extra protection, with a blitzing defence; Electric fields can Stun | Clean pockets; turnovers forced by the blitz | Good runs punish the blitz; deep coverage limits quick passing; Electric types are immune to its fields |
| Canyon Crushers (mid) | Earth | Titanolith (OL): **Landslide**, an advancing rock wall with guaranteed displacement, once per possession | Ground Attack; a physical run front on defence | Short-yardage and goal-line power | Loaded boxes and fast defenders force passing downs; the slam is limited to once per possession |
| Eastport Phantoms (mid) | Dark | Nyxshade (CB): **Shadow Exchange**, swaps positions with a chosen defender | Man-coverage tricks; Dark fields reduce Awareness | Breaks reads and confuses assignments | Quick reads and misdirection runs; Dark types are immune to its fields |
| Frostpeak Howlers (mid) | Ice | Glacivern (**K**, counts toward the offensive legendary limit, B19): **Second Chance**, one failed field goal per game is re-kicked | Field position: zone defence that gives up yards but not touchdowns, plus reliable kicking; Frostmark Ice fields after made field goals | Scores on most drives; low-variance | Touchdowns beat field goals; aggressive fourth-down play and red-zone efficiency |
| Ironpeak Rams (late) | Metal | Aegistron (DL): **Fortress Gate**, interior panels block both teams for a play, once per defensive possession | Run-stuffing, blitz-heavy front; a power-run offence | Interior run game shut down; delayed AI reactions (Metal fields) | Outside runs and quick passes outside the panels; Metal types are unaffected |
| Palmetto Vipers (late) | Dragon | Aurodrax (QB): **Sovereign Arm**, a protected pass that would be intercepted becomes incomplete and removes the defender for a play | Aggressive vertical passing with man coverage; no base field | Deep shots with protected interception risk | A pass rush and sacks (Sovereign Arm doesn't stop them); disciplined deep coverage still forces incompletions |

**Supporting rosters.** Gym rosters favour their element and the positions the strategy needs (for example, Water CBs and safeties at Harbor, OL and RBs at Canyon), within normal generation and legal lineups.

## 4. Ordinary clubs (any of the eight can be AI)

| Club | Offence | Defence | Strength | Weakness and counterplay |
| --- | --- | --- | --- | --- |
| Ember City Beasts | Air Raid | Blitz Heavy | Explosive plays both ways | Gives up big plays; patient short passing beats the blitz |
| Stonehaven Titans | Ground Attack | Zone Control | Clock control, few big plays allowed | Slow to come back from behind; stacked boxes |
| Glacier Guardians | Balanced | Zone Control | Few mistakes | Low ceiling; mismatches with speed |
| Stormport Bolts | Air Raid | Man Coverage | Speed on the outside | Physical runs; press-beating receivers |
| Northstar Wolves | Ground Attack | Blitz Heavy | Physical, fourth-quarter teams | Play-action and screens |
| Sundown Drakes | Air Raid | Zone Control | Vertical passing | Pass rush; run defence when the zone drops |
| Ashford Hawks | Balanced | Man Coverage | Adaptable game plans | No dominant strength; whoever wins the matchups wins |
| Bayou Stalkers | Ground Attack | Man Coverage | Option-style runs, tight coverage | Deep passes against man; discipline in the run fit |

## 5. Questions for the owner

1. **Gym mode floor.** Gyms never fall below Compete today. Keep that floor so gyms stay the strategic tests (recommended), or let gyms cycle fully like ordinary clubs?
2. **Ordinary coaches.** Make each ordinary club's coach tendencies fixed for the franchise, matching its identity (recommended), instead of re-drawn every season?
3. **The identity table.** Approve, or change, the eight gym strategies and eight ordinary identities above.
4. **Rookie.** Ordinary AI clubs start lower under Rookie (initial percentile targets about 23–43 instead of 50), while gyms keep their tier. Confirm that this is the "more forgiving ordinary opponents" intent.

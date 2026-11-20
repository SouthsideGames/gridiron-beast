# Individual beast names

## Player-facing behavior

Every generated athlete has a short, one-word personal name. The species/form is a separate secondary label: for example, Rocco — Crustank — DL. The same species can have many individuals without Roman numeral suffixes.

Personal names remain attached to beast IDs through evolution, club changes, draft selection, saving/loading, and career records. Evolution changes the form label and sprite, not the personal name. Draft announcements name the individual and show its species below. The cornerstone offered in creation keeps the name shown before selection.

Roster, assignment, depth, contracts, recruiting, draft and free-agent cards show species alongside personal names. Search accepts personal names, current form names and base species names. The Beast Dex remains a species catalogue.

The names come from a curated syllable vocabulary with over 90,000 eligible combinations, filtered for length, catalogue collisions and offensive fragments. No external generation service is used. Names are not tied to type or position. A franchise-wide saved registry reserves issued names case-insensitively, including names of departed athletes, to prevent reuse while reading old records.

## Existing saves

The additive `individualNames` field maps beast IDs to permanent names. Existing generated species labels, including numbered labels, acquire personal names on migration. Custom names are preserved unless another beast already owns that name. ID-bearing historical snapshots are synchronized with the registry; free-form historical news prose is deliberately left intact rather than guessing which individual a species label meant. Standalone Hall of Fame archives without beast IDs retain their recorded historical names.

IDs, species, development, attributes, contracts, statistics and gameplay random-number state do not change. The name generator hashes identity separately; it draws no gameplay random numbers. Older saves are not reconstructed or reset. New Hall of Fame summaries save form stage explicitly so it cannot be inferred incorrectly from a personal name.

## Validation

- Eight new identity tests cover deterministic generation, uniqueness, migration and custom names, ID-bearing records, reloads, evolution, transfers/re-keying, cornerstone selection, draft ceremony output and Hall of Fame form labels.
- Final focused run: 29/29 passed (identity, release stamp, and three historic Clash test files).
- Earlier evolution/developer-preview focused run: 21/21 passed; centralized text: 8/8 passed.
- Three baseline comparisons (seeds 82, 312, 612) have identical roster/AI/draft IDs, attributes, development, salaries, contracts, draft order and gameplay RNG state.
- Broad fast-tier run: 2,046 tests, 2,040 passed and six failed before final corrections. Four failures were historic Clash fixtures that identify events by catalogue display labels; those fixtures now explicitly keep those labels, and all four pass in the focused rerun. Two release-stamp failures ran before the version/stamp update; both pass after stamping. This is a broad run plus affected reruns, not a clean final full-suite result.
- Compatibility/career/registry/acceptance/species run: 44/45 passed initially. The remaining completed-season reload check exposed historical snapshots gaining live-monster metadata. Snapshot reservation now uses a copy; the saved season history round-trips unchanged. The failed multi-season test passes on its own after the correction (1/1), and the final eight identity tests also pass.
- The same completed-season save retains 617 uniquely named canonical individuals.

Historic Clash fixtures explicitly retain their catalogue display labels because their unchanged assertions identify ability events by species names in log prose. Evolution expectations now assert stable personal names and separate form transitions. No gameplay assertion was removed or weakened.

Browser check: `CHROMIUM_EXECUTABLE=/usr/bin/chromium python3 tools/individual-names-check.py`. It covers roster/depth search, an actual card, Dex, draft selection/ceremony, save/reload and overflow at 320, 390, 440 px and short landscape. This environment blocks Chromium startup with `socket() Operation not permitted`; no browser or native-device pass is claimed. Run it in a browser-capable environment, then review on a phone.

A complete regression pass remains a pre-merge validation task. No merge, deployment or Capacitor installation is part of this change.

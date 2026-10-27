# Gridiron Beast

Pixel-style monster football franchise game by Southside Games — **7-on-7, mobile-first, no dependencies**. Built for iOS and Android phones and tablets first; a PC release is possible later.

- **Play:** open `index.html` from any static host (GitHub Pages works as-is) on a phone or desktop. Installable as a PWA.
- **Test:** `npm test` (Node ≥ 18, zero dependencies) runs the full suite (671 tests). `npm run test:fast` runs the 371 quick tests; `npm run test:sim` the 300 long-running simulation tests. When to run what, and how merges and releases are verified: [`docs/TESTING_POLICY.md`](docs/TESTING_POLICY.md).
- **UI check:** `python3 tests/ui/responsive.py [--shots DIR]` drives onboarding, a week and a complete game at four phone sizes with Playwright (dev-only).
- **Reproduce a play:** every play in the in-game log carries a repro code; `node tests/tools/replay.js "offense|defense|ballOn|seed"` prints its event trace.

## Layout

```
index.html, manifest.webmanifest, styles/app.css   app shell
src/core      rng, field geometry
src/data      personnel, routes, playbook (single source of truth), monsters, league, staff
src/sim       engine (one play), rules (game state), special-teams, coach-ai, game-runner
src/franchise franchise (owner/staff/week/season/league sim/progression/economy), roster, save
src/ui        router, dom, play-art, field-view, pixel-monster, screens/*
tests         node --test suites, tools/, ui/responsive.py
legacy/       the previous v5.0 (11-on-11) prototype, unchanged and still runnable
docs/         historical design documents (superseded by the four GRIDIRON_BEAST_*.md files at the root)
```

Design and status: `GRIDIRON_BEAST_AUDIT.md`, `GRIDIRON_BEAST_GDD.md`, `GRIDIRON_BEAST_REBUILD_PLAN.md`, `GRIDIRON_BEAST_TEST_PLAN.md`.

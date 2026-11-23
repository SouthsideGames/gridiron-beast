# Logos, uniforms and home stadiums (32 clubs)

Every image here is drawn by the game's own code (`src/ui/team-logo.js`, `src/ui/team-kit.js`, `src/ui/field-view.js`,
`src/ui/field-branding.js`, `src/ui/stadium-fx.js`). Phone screenshots are an emulated 430×932 phone (Chromium), not a real device.

- `logos/00-contact-sheet-all-32-dark.png`, `01-…-light.png`: all 32 logos on dark and light backgrounds.
- `logos/02-game-sizes-16-20-24-32-48px.png`: each logo at the sizes the game uses (scoreboard 18 px, lists 22–30 px, club page 40 px).
- `logos/individual/<club>.png`: one club at 220 px on dark and light, and at 64/32/24/18 px.
- `uniforms/00-home-contact-sheet.png`, `01-away-contact-sheet.png`: shirt with crest, and the same kit on field sprites.
- `uniforms/by-division/NN-<division>.png`: home, away and alternate kit of each club, side by side.
- `uniforms/02-visitors-change-kit-examples.png`: pairings where the visitors switch kits to stand apart.
- `stadiums/divisions/NN-<division>.png`: the eight division contact sheets (whole field and stands, four stadiums each).
- `stadiums/NN-<club>/1-full-stadium.png`: the whole home stadium.
- `stadiums/NN-<club>/2-field-branding-far-end-zone-midfield-near-end-zone.png`: the real match screen at the far end zone,
  midfield and the near end zone.
- `stadiums/NN-<club>/3-gameplay-camera.png`: the real match screen with the gameplay camera at the 35.

Regenerate: `tools/visual/logos.html`, `uniforms.html` and `stadium.html` (open from a local server at the repository root).

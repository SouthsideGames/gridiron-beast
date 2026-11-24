# Consistent UI icons and the coach preview

Preview: `v43.21.0-icons-coach-preview`. Branch: `codex/consistent-icons-coach-preview`.

## Appearance editor

The shared editor used in franchise setup and My Office has a sticky group containing the portrait, Surprise Me, and five text-only category buttons. It stays below the 48px header plus the top safe-area inset. The page has one normal scroll region; options scroll under the preview. The portrait frame is 96px normally and 72px on screens at most 650px high. Long team-color notes stay outside the sticky region. Existing chips and arrow controls remain available, and appearance saves keep the same format.

## Artwork

Selected RhosGFX Vector Icon Pack PRO SVG artwork supplied by the project owner is integrated in `src/ui/icons.js`. The uploaded archive and its full asset library are not committed or republished. Source: https://rhosgfx.itch.io/vector-icon-pack ; original license pointer: https://rhosgfx.com/license . Artwork remains RhosGFX's property, not newly authored game art.

47 flat variants are normalized to a common view box, stripped of document IDs/styles, and colored with currentColor. This keeps their size and active/disabled colors consistent. Transparent backgrounds remain transparent. No icon font or network asset fetch is needed.

| Navigation | Pack artwork |
|---|---|
| HQ | General / Home |
| Roster | General / Paw |
| Plays | General / Clipboard |
| League | General / Trophy |
| More | UI / Hamburger Menu |

Pack artwork supplied by the owner on 2026-11-23 (Flat White variants, converted the same way):

| Use | Pack file |
|---|---|
| Map tab (🗺) | Tools / Map |
| Stadiums (🏟) | Sports / Football Pitch |
| Beast Dex (🧬) | Nature / DNA |
| Type Chart (🔺) | Element Guide (owner's own icon, 100-unit art scaled to 64) |
| Football everywhere (🏈, How to Play) | Sports / Football |
| Coaching Staff (👥) | General / Clipboard (already in the game) |

History (📜) uses the book, Guide (ℹ️) the info mark, Search (🔎) the binoculars.

The shared renderer maps common pictorial decorations to the selected art; unneeded pictorial decorations are omitted. Category labels and Surprise Me are text-only. Ordinary arrows, copyright characters, saved data and existing SVG monster/field artwork are preserved. Icons are decorative; existing labels and aria-labels remain. Router screens and sheets use the renderer, as do incremental football controls. Directly drawn SVG scenes and specialist incremental panels are intentionally not rewritten; review remaining pictographs in those views during browser validation.

## Validation

- Unit checks cover navigation mapping, all selected SVGs, inherited color, repeated rendering, accessible attributes/actions, escaping, preserving existing SVG artwork, removing unneeded decorations, and sticky group structure.
- Targeted set: ui-icons, qol-coach-portrait, central-text, text-style and release-stamp. Initial complete set passed 24/24; final results are recorded in the PR.
- Selected artwork visually inspected using a rasterized contact sheet; this caught and corrected original 64/128 view-box differences and transparent rgba fills.
- Release-file discovery passes with 479 files; import map contains 468 game modules.
- `tools/coach-editor-mobile-check.py` now covers five widths, short heights, sticky visibility after scrolling and a live nose change while scrolled. Run it with Playwright; optionally set CHROMIUM_EXECUTABLE.
- Browser execution is blocked in this workspace: installed Chromium exits because required socket creation is denied. No browser or actual-device pass is claimed. Full regression has not run for this draft and is required before approval.
- Pending: browser/mobile layout checks, navigation/roster/feature/final-whistle/cache checks, full regression, and iPhone/Android review (safe areas, sticky preview, tabs, live updates and My Office).

No merge, deployment or Capacitor rebuild is performed by this change.

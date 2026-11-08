# Basic art: review guide

[Back to Beast Dex](../README.md) · [Basic family index](../BASIC_INDEX.md)

## What the art is

The game draws every monster from a short design recipe with its own 16×16 pixel builder (`src/ui/sprite16.js`). The recipe has a body plan, size, look, 1–3 features, an optional pattern and two colours. The builder paints, shades and outlines the sprite on a transparent background, and each individual gets a small brightness tint. Sprites are static: the current pipeline has no animation frames. They are shown at 16–96 px (Beast Dex cells 40 px, profile sheets 96 px).

Each Basic family's recipe is in `data/basic-authoring.json` (field `art`) and is copied to `data/families.json` (`art.spec`). `art/basic/<id>.svg` is the sprite exactly as the game's builder draws it. No external generator or hand-drawn file is involved. The game itself is unchanged: these recipes are not wired into gameplay yet.

Basic designs use only small or medium sizes and 1–3 features, so they read simpler than legendaries. Every Basic sprite's pixel grid differs from every one of the 102 existing forms and from every other Basic. Across the batch, each position mixes at least four body plans.

## Review sheets

- `review/<POS>.html`: the twelve Basics of one position at 128 px on a transparency checkerboard, labelled with name, type, archetype, strength, weaknesses and recipe, plus the game's display sizes (24–48 px). The position's existing forms appear below for comparison.
- `review/in-context.html`: the game's own Beast Dex cell markup and stylesheet, each element's six originals followed by its ten Basics.
- `review/png/`: rendered images of all of the above, for viewing without a browser.

Regenerate with `node docs/beast-dex/tools/art_review.mjs` from the repository root. It also writes `basic-art.json`, which holds each recipe, its checks and its SVG hash.

## Rejecting or revising a design

Each family is independent. To change one design, edit its entry in `data/basic-authoring.json`: the `art` recipe, the name, the personality text or the profile choices. Then run:

```
python3 docs/beast-dex/tools/build_basic.py
node docs/beast-dex/tools/art_review.mjs
python3 docs/beast-dex/tools/render_and_validate.py
```

Only the edited family's records, sprite and page change. Other families are not regenerated or re-rolled. Set an approved family's `reviewStatus` to `approved` (or `rejected: <reason>`) in the same file.

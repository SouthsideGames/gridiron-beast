# Task 8 main merge — 2026-11-11

Owner-authorized PR #98 merged as `88a174d4115a5c2cd049a1a29d8a54e1ac5d7380`.

- Verified merge tree: `532e35ca2312cc767450c6afe011f01041fcf8cc`, exactly equal to the final tested branch tree.
- Runtime build: **v43.6.0-task8-review**, BUILD.test=false, BUILD.release=false; both developer ability reviewers remain available.
- Runtime code matches the full-regression runtime; subsequent work was tests, fixtures, tools and documentation.
- Full regression covered 2,019 tests: 2,017 passed and two constructed trade fixtures failed. The original valid scenario was frozen, without weakening trading assertions; all 13 tests in the affected file then passed.
- Final and post-merge smoke: 15/15. Football replay 100/100 and Clash replay 100/100 match. Release scanner self-check: 21/21.
- Release archive contains 416 files, all byte-identical to the merged commit. No test helpers are included.

## Publication was pending at merge time (completed below)

The existing main game artifact is https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq . This session cannot publish to its signed-in Claude publisher. **The artifact was not updated by this merge.** The prior live release manifest is deliberately unchanged. Do not replace the existing main URL or represent the old artifact as this build.

To finish publication, publish the exact release files from merge 88a174d to that existing artifact, verify the version/file hashes and regenerate the live release manifest only after successful publication. Owner iPhone 17 Pro Max and visual review then occurs on the main link through Developer Tools → Ability Reviewer / Clash Ability Reviewer. Mark Good or Needs work, add notes and send feedback.

M6 remains open for owner phone/visual review and documented performance/balance limits; see FINAL_VERIFICATION.md and OWNER_ADOPTION_2026-11-11.md. Missing local browser executable prevented the browser deploy check; no physical-device or final frame-time pass is claimed.

## Publication completed (2026-11-11)

The existing main game artifact https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq now serves **v43.6.0-task8-review** as artifact version 119. No replacement URL was created and the private testing link was not touched. `release/manifest.json` records this release.

- Build: `git archive 88a174d`; `tools/release-files.py` listed 416 files; all 416 in the publish folder are byte-identical to the merge.
- Deploy check on the publish folder: passed (version, stamp and Main Menu label; BUILD.test false; two schema-10 saves made with the previous preview build load after a reload; Developer Tools and the AI Testing Lab open; a setting survives a reload; live QB read ring and replay read list). Both ability reviewers open from Developer Tools with Good / Needs work controls; 0 page errors.
- Before publishing: the live artifact held the previous release's 176 files; six sampled files matched the v42.22.0 manifest.
- Published in two steps so the live game was never a mix of releases: version 118 added the 240 new files under the unchanged v42.22.0 page; version 119 switched the page and the 175 existing paths together.
- After publishing: 416 live files. 75 were read back and are byte-identical to the publish folder (the 60 files of 22 KB or more, which are 61% of the bytes, plus `src/version.js`, `src/fresh.js`, `manifest.webmanifest` and 12 small files). The other 341 were checked by path and count, with 14 sizes spot-checked; they were not read back byte for byte. The live `index.html` contains the built page unchanged inside the host wrapper, with 412 `?v=43.6.0` stamps and none older.
- Saves: franchises from before Task 8 (v42.22.0 and earlier) are refused with the approved "saved by an earlier version" message and are kept on the device unchanged. This is the approved Task 8 behaviour, not a publication defect.

Two tool notes, neither a release defect:

- `tools/deploy-check.py`: the helper-isolation step read the browser's resource-timing buffer, which holds 250 entries by default; with 416 files it was full before the helper loaded and the step reported nothing. The buffer is now enlarged first. No check was removed or weakened.
- `tools/release-files-check.py` reports 20/21 before the manifest is regenerated (its "released archive lists exactly the published files" case compares with the previous manifest) and 21/21 afterwards.

Still open: owner iPhone 17 Pro Max and visual review, and every item under "Remaining owner review / acceptance" in FINAL_VERIFICATION.md. M6 is not complete. No physical-device or frame-time pass is claimed.

# Task 8 main merge — 2026-11-11

Owner-authorized PR #98 merged as `88a174d4115a5c2cd049a1a29d8a54e1ac5d7380`.

- Verified merge tree: `532e35ca2312cc767450c6afe011f01041fcf8cc`, exactly equal to the final tested branch tree.
- Runtime build: **v43.6.0-task8-review**, BUILD.test=false, BUILD.release=false; both developer ability reviewers remain available.
- Runtime code matches the full-regression runtime; subsequent work was tests, fixtures, tools and documentation.
- Full regression covered 2,019 tests: 2,017 passed and two constructed trade fixtures failed. The original valid scenario was frozen, without weakening trading assertions; all 13 tests in the affected file then passed.
- Final and post-merge smoke: 15/15. Football replay 100/100 and Clash replay 100/100 match. Release scanner self-check: 21/21.
- Release archive contains 416 files, all byte-identical to the merged commit. No test helpers are included.

## Publication is pending

The existing main game artifact is https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq . This session cannot publish to its signed-in Claude publisher. **The artifact was not updated by this merge.** The prior live release manifest is deliberately unchanged. Do not replace the existing main URL or represent the old artifact as this build.

To finish publication, publish the exact release files from merge 88a174d to that existing artifact, verify the version/file hashes and regenerate the live release manifest only after successful publication. Owner iPhone 17 Pro Max and visual review then occurs on the main link through Developer Tools → Ability Reviewer / Clash Ability Reviewer. Mark Good or Needs work, add notes and send feedback.

M6 remains open for owner phone/visual review and documented performance/balance limits; see FINAL_VERIFICATION.md and OWNER_ADOPTION_2026-11-11.md. Missing local browser executable prevented the browser deploy check; no physical-device or final frame-time pass is claimed.

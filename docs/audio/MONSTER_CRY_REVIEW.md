# Procedural monster cry review — draft

Branch: audio/monster-cry-reviewer. Base main: 6a41fe128be9e469d09bc8d33e4d92f27dcf7571. No Task 10 branch changes, balance changes, merges or deployments.

Developer → Monster Cry Reviewer inventories every current Dex form (192 families / 222 forms), shows the actual family description and the game's evolved appearance (size, look, claws/spikes), and provides per-form playback, family comparison, Stop, volume, element/status/family filters, next family, approval/revision with notes, and a copyable review report. Filters select families; the chosen family's full evolution line remains visible for comparison.

All cries are **unapproved procedural drafts** synthesized on demand from seeded pulse, triangle, FM, noise, envelopes and filters. There are no sampled animal voices or generated AI vocal assets. All 222 forms have playable recipes; none are claimed owner-approved or perceptually distinct merely because their PCM differs. No shipping Dex/monster detail playback is enabled yet. No ability audio or background music was integrated in this change.

Design inputs: family description, family identity, type, evolved size/look/body/features, personality cues and stage-specific articulation. Description anatomy takes priority over sprite shortcuts: the toad uses a croak, clockwork bird uses mechanical pulses, singing bird uses phrases, squeaky Steelpaw uses a short squeal. Most species use automated draft interpretation; owner review is required to refine individual identities.

Drakling family revision 3 is independently composed: the small baby who thinks he is huge attempts a growl that breaks into squeaks/sputter; medium Drakyra has clipped, agile snarls; large, fierce, spiked Dracolossus has resonant surges and a rough horn-like flourish. They are not one resampled waveform. Size and maturity interpretation follows the game's evolvedSpec function; no nonexistent per-form lore is invented.

Reviews persist locally, separate from franchise saves. A changed recipe fingerprint returns the affected form to Pending. Notes are not cloud-synced or automatically sent to a developer: Copy review report shares them. Storage failure is surfaced, and the current session retains notes for report export. Draft generation does not use gameplay RNG.

Playback is opt-in from a tap, bounded to one voice, cancellation-safe while audio unlock is pending, stops on leaving or backgrounding, and caches at most 12 PCM cries. At 22,050 Hz mono and <3 seconds per sample this limits raw cached PCM to <3.2 MB. Browser/native audio behavior and listening quality still need device validation.

Validation:
- node --test tests/monster-cries.test.js: 6/6 pass. Every real form has deterministic finite bounded PCM, no byte-identical duplicates; custom description mappings, evolution articulation, stale approval, storage failure, playback cancellation, and real screen markup covered. These checks do not establish listening quality.
- Browser script: tools/monster-cry-check.py. Attempt blocked in this host: installed Chromium exits at startup because its process-singleton socket is not permitted. Phone layout, real browser sound and browser persistence are **not verified**. Script retained for a supported host.
- Final targeted run: 16/16 passed (monster-cries, release-stamp, dev-review), 0 failed, 0 skipped, ~4.5 seconds. Release label v43.12.1-audio-cry-reviewer and import-map stamping include the new modules.
- An initial broader fast-tier run found the playback-stop mock/reentrancy issue and missing import-map stamping. Both were corrected and pass the targeted rerun. That long-running broad run is not evidence for the final head; no full-suite pass is claimed.
- Remote push was rejected by automatic approval review because it treated exporting this source to GitHub as requiring explicit user approval. No workaround attempted; the branch is committed locally only.
- Full regression and physical iOS/Android checks remain required before merge approval. Do not merge or publish without owner approval.

Next: owner-approved isolated preview/update route; hear Drakling v3 in the reviewer; mark per-form changes; refine the remaining draft voices. This branch is not the published main game link.

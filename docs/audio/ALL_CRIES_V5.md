# Description-led cry catalogue, revision 5

Owner accepted the eight contrasting voice drafts as an improvement, requested description/element consistency, and authorized updating all cries.

Every current family has an explicit voice assignment: 192 families, 222 playable forms, 34 synthesis voices. The assignment inventory is `CRY_ASSIGNMENTS_V5.csv`, generated from the actual game catalogue and recipes. There is no default family assignment and no dependence on gameplay RNG.

The eight reference families keep their base voice/phrase direction. Other families now use individual seeded phrase shapes, pauses, pitch contours, envelopes and voice parameters. Evolved forms retain the family voice but gain a new lead-in and ending, changed pauses, sustained syllables and separately composed contours. They are not just pitch-shifted base recordings.

Anatomy and descriptions lead: Gloamtoad croaks despite being Dark/blob, Glowhare buzzes because it is a lantern beetle despite its name, and Coglet is clockwork rather than a generic bird. Liquid bubbling is assigned only to Water families Tidepaw and Bubblop. Pyroclast rumbles. Other aquatic animals can whistle, grunt, click or roar according to their anatomy instead of all bubbling.

The old universal fuzzy coloring/filter stage is removed. Voice kinds have their own spectrum and articulation. Sound is synthesized locally, one active cry at a time, with the existing bounded PCM cache and cry-volume/master controls. No external sounds or Pokemon recordings are bundled.

All revised recipe fingerprints return existing approvals to Pending; review notes remain available. These are listening-review drafts. Automated waveform uniqueness, finite/bounded PCM, assignment coverage and evolution structure are technical checks, not proof that listeners perceive every monster as distinct or that every artistic choice fits.

Validation: targeted audio, all-form cry, developer review, text style and release-stamp checks pass 31/31. All 222 forms render deterministically within the existing duration/peak limits. Full regression and physical-phone listening remain pending. This extends PR #110; it does not publish or merge it. Prior music fixes in that PR are retained.

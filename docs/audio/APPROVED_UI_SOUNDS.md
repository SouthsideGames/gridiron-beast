# Approved UI sound integration

The seven owner-approved masters are in `assets/audio/ui/`. They match the original preview WAV files byte for byte.

- Tap: enabled buttons/action controls, tabs, checkbox/radio changes. No pointer-down/double firing, slider ticks or redraw sounds. Native disabled buttons stay silent.
- Back/Close: back, cancel and close buttons. Confirm: confirmation buttons and successful-action feedback.
- Unavailable: failed-action feedback. Notification: fresh developer review announcements; ordinary informational toasts stay quiet.
- Reward: completed draft selections, successful encounter signings, contract signings/extensions and accepted trade transactions. Rejected offers do not play a reward.
- Major Achievement: achievement-scene presentation, once per queued scene object in this session; additional beats/redraws stay quiet.

Playback uses the exact approved PCM, a single SFX voice and existing SFX/master settings. Same-event feedback replaces the pending ordinary tap; repeated low-priority taps are limited to 70 ms. Sounds that have not loaded are skipped rather than queued for later. Failures are non-blocking. Backgrounding cancels pending/active voices. No game RNG, save schema or simulation code changes.

Validation: 38 targeted tests passed (UI audio behavior, all seven WAVs, existing audio/cries, iOS config, release stamp and wording). Release file list passes with 498 files, including all seven masters and the new module. Exact source-to-delivery byte checks passed. Full regression and on-device/browser listening remain pending. Not merged or published. Release label bump is deferred to publication preparation.

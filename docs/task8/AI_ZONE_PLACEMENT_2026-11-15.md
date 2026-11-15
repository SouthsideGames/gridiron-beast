# AI zone placement follow-up

Build v43.16.1-ai-zones. The AI receives exactly the same legal lane, depth-band and overlap options as the player. Its coach chooses with a private seeded weighted draw: all legal options remain possible, while a preferred play lane and available combinations receive modest extra weight. Choices vary across games, snaps and creators, remain stable on reload/replay, and do not advance game RNG. Paired patches/lanes choose together. Explicit human choices take precedence; Auto Place uses the same varied coach policy.

The live match now passes its viewer side to the pre-snap renderer. Upcoming enemy zone locations are excluded from that view until the snap, on both offense and defense. Existing active zones remain public. Actual simulation and replay fields are unchanged by this presentation filter. All zone review revisions advance to require review of the new placement behavior while preserving notes.

Validation: 17 focused AI/placement/release checks, the existing ability contract tests with explicit Middle fixture choices, review notification checks and release import-closure checks. Full regression is not run. The fixture now explicitly selects Middle to test its fixed geometry; separate production-rule tests exercise the varied AI policy and all legal choices.

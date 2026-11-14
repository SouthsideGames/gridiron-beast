# Music and detail-page cries — implemented on isolated audio branch

Build: v43.12.3-audio-controls. Branch: audio/monster-cry-reviewer. No main merge or publication, and no Task 10 branch modifications.

## Actual assets

Four owner-supplied, owner-selected songs are included as 160 kbps stereo MP3 delivery files (about 13 MB total), encoded from the full-song loop edits already created in this conversation. Original masters remain outside the game repository. These are existing supplied recordings, not newly generated music.

| Source loop | Delivery | Used for |
|---|---|---|
| Gridiron_Beast_Main_Menu_Full_Song_Loop_v2.wav | assets/audio/music/main.mp3 | Menu, Franchise, draft, offseason and general management screens |
| Gridiron_Beast_Pregame_Full_Song_Loop_v1.wav | assets/audio/music/pregame.mp3 | Pregame |
| Gridiron_Beast_Beast_Clash_Full_Song_Loop_v1.wav | assets/audio/music/clash.mp3 | Beast Clash |
| Gridiron_Beast_Championship_Ceremony_Full_Song_Loop_v1.wav | assets/audio/music/championship.mp3 | Beast Bowl ceremony |

Live football is silent until gameplay effects are designed. Developer review/lab scenes are quiet for auditions. Settings keeps the current song. Same-track navigation never restarts it; a track change fades outgoing/incoming over 900 ms. A short 300 ms streaming-player overlap at repeat reduces loop boundary gaps. Playback uses one shared Web Audio context and streamed music, not four fully decoded soundtrack buffers. At most incoming/outgoing music players are kept; replaced pending loads cannot begin playback late. Last playback position is retained in session for re-entry/resume.

## Cries

All current 222 form recipes remain unapproved procedural drafts. An actual monster-card route entry plays that individual's form cry. Rerenders for attributes/mastery do not. Revealed Dex sheets play the base species voice; unknown silhouettes stay silent. Species sheets opened from an individual card use that individual's form. Career profile pages/sheets, full draft prospect reports, and free-agent negotiation/detail cards also audition the monster on opening. The cry reviewer remains available under Developer. Rendering lists/sprites does not generate sound. Opening another detail or leaving the route stops the previous voice; no AI request or sampled vocal asset is needed.

## Controls and lifecycle

Settings has master mute, music volume, sound-effects volume, crowd volume and cry volume. Preferences are versioned device-wide, independently of franchise state, and storage failure is surfaced. Existing evolution cues keep their opt-in and timing, but now share the audio context/master bus so mute applies to them too. Audio unlocks on a real tap/key; a rejected cry is skipped, not queued. Visibility/pagehide stops music/cry voices, with current music intent restored on resume. Capacitor's optional global App plugin is listened to if present; a gb-app-state event bridge is available for a future native wrapper. Native packaging/plugins are not added or claimed tested.

## Validation and limits

- 36/36 targeted checks passed across audio integration, all-form cry coverage, existing developer reviews, release stamping, evolution preview and evolution overhaul (14.2 s).
- After adding a focused route-entry/redraw check, the integration set passed 7/7. Combined coverage: 37 checks, 0 failures; affected rerun only.
- All four delivered MP3 files decoded end-to-end with FFmpeg without errors.
- git diff --check passed; updated release import map includes all new modules.
- Browser checks remain blocked by this host's Chromium process-singleton socket restriction. No browser listening, native iOS/Android behavior, perceived loop seam quality, or final phone mix is claimed verified.
- Full regression remains pending before merge approval. No gameplay/balance code was changed. No UI sounds or ability sounds were added.
- The earlier automatic approval rejection blocked exporting this branch to GitHub. No subsequent push was attempted without explicit authorization. All implementation is committed locally; the public/main game link is unchanged.

Next: authorize uploading the audio branch, test its separate build on a phone, then request main merge/publication approval. After these audio features are accepted, discuss UI effects as requested.

Owner explicitly authorized pushing the audio branch to GitHub after the earlier rejection. Sound-effects volume now controls the existing evolution SFX bus; the crowd bus/control is prepared for future crowd assets. No UI/ability/crowd sounds are claimed added.

# Menu guidance and random GM name

Build 43.29.1 fixes the saved-franchise lesson panel appearing above the main menu after relaunch. Global menu/settings/Dex/developer/archive screens do not render lesson panels, receive tutorial highlights or mount automatic tutorial moments. Lesson progress is preserved and resumes inside the franchise.

The first Commissioner setup step has a Random Name button between Back and Continue. It replaces both first and last name fields with an editable name, avoids immediately repeating the current pair, and does not use franchise gameplay RNG. The button appears only on the name step. Button wording is in the centralized onboarding text section.

Validation: 35/35 targeted tests pass (guided-week, new menu/onboarding regressions, centralized text, release stamp). The regressions cover reloaded tutorial progress on global screens and returning to HQ; the actual random-name click handler, manually editing the generated name, and retaining it when navigating forward/back. Release stamp and diff checks pass.

Chromium startup is blocked in this environment by socket permissions, so browser and real-phone checks remain pending. No full suite rerun for this narrow UI fix. Nothing merged, deployed or installed.

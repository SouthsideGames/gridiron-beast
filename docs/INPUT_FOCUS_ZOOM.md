# Input focus zoom

Build v43.25.1-input-focus, based on main b8b3254.

Some compact controls inherit small text or explicitly use 15px text. The shared stylesheet now enforces max(16px, 1rem) for text/search/email/password/URL/telephone/numeric/date/time inputs, textareas, selects and editable text regions. This also covers inline smaller field styles and sheets mounted outside the main screen. Larger Text remains respected. Checkboxes, radios, ranges, file pickers and buttons are excluded.

No viewport scaling cap, focus/blur zoom-reset script, save logic, navigation behavior or native settings are changed. The fix prevents small field text from triggering focus zoom; it does not forcibly reset an already zoomed session in an older phone build. Rebuild and reopen the updated app for the phone check.

Validation: release-stamp and text-style checks 6/6 pass (0 failures/skips), 0.81 seconds; whitespace check passes. No full regression run for this CSS-only behavior change plus release stamp. Real iPhone/WebView focus behavior is pending: emulated desktop browsers cannot establish an iPhone focus-zoom pass.

Phone acceptance: at normal and Larger Text sizes, tap onboarding name fields, roster/market search, salary and bonus fields, coach/preset naming, and reviewer note textareas in sheets. Type, switch fields and dismiss the keyboard. Check that the viewport does not zoom on focus or remain enlarged, controls do not overlap, and ordinary scrolling still works. Check portrait and landscape. Keep existing saves and the app identifier when updating.

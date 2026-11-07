# Task 8 M1 preview (private test build)

- **Link:** a new private artifact, "Gridiron Beast Task 8 Preview" (https://claude.ai/artifact/3qW6dbFAZ4yCc8i1SnAVq6), version 1.
  - It is separate from the live game link and from the older private test link; neither was touched.
- **Build:** `v43.0.0-t8-m1-preview`, branch `task8-m1-preview` at c8ce6ff, 190 files.
  - It is staged from `git archive` with `BUILD.test = true` and the title changed; nothing else differs from the branch.
- **Save:** each artifact has its own browser storage and its own cloud mirror, so the preview starts with no franchise and cannot read or write the live save.
- **Testing record:**
  - Full suite 930/933 at 0f953e3. The three failures were fixed in 788ba97, and their files re-ran 8/8.
  - Later changes passed targeted tests and browser checks only:
    - a boot fix in `src/clash/stats.js`;
    - tip text;
    - the test tools.
  - The browser walkthrough at 390 px on the staged build had 0 page errors:
    - boot, new franchise, HQ, roster and monster page;
    - Developer → Task 8 test tools: sample, level-up, evolution level, bank, offseason, save check.
- **Not merged, not released.**

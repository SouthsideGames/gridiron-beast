# Release manifest

`manifest.json` records exactly what the last release published to the main game link: the version, the merged commit, the artifact version, every published path with its SHA-256, and `extra` files that are published deliberately although nothing in the game imports them (each with a reason).

`tools/release-files.py` uses it as the cross-check for the next release. A file published last time that is missing from the new list stops the release until it is investigated and passed with `--allow-removal PATH --reason "..."`. After each successful publish, regenerate it from the release archive:

```
python3 tools/release-files.py REL --write-manifest release/manifest.json --version vX.Y.Z-name --commit <merge sha> --artifact-version N
```

Then commit it to `main`. It is not a game file and is never published. See `docs/TESTING_POLICY.md` §6.

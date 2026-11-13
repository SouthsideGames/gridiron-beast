# Task 10: quarterback pressure and attribute audit (2026-11-13)

Owner instruction: audit the existing Awareness, Speed, Agility and Strength contributions before proposing any new pressure mechanic; one attribute at a time; no forced sack rate.

**Method** (`tools/task10-qb-attribute-audit.mjs`, data in `results/integration/qb-attribute-audit.json`): the real engine through the attribute lab (`src/lab/attr-trials.js`). Every monster is a plain 65 with no ability and no type; only the quarterback's one attribute changes (40 / 65 / 90). The 30 original live pass plays (no screens) against 10 defenses, 10 seeds each: 3,000 identical plays per cell. Two conditions: neutral (everyone 65) and pressure (the defense's linemen and linebackers at 85 Speed and Strength). Designed quarterback runs (QB Draw against the 26 original defenses, 8 seeds) for the open-field attributes.

## Results

| Attribute | What it should do | Measured (QB at 40 → 65 → 90) | Verdict |
|---|---|---|---|
| **Awareness** | Recognise pressure, decide sooner, read better, fewer sacks | Sacks 7.4 → 3.2 → 1.8% (neutral), 11.3 → 4.3 → 2.5% (pressure). Sacked when pressured 21 → 11 → 9%. Throws to a clearly worse target 16 → 10 → 8%. Open receivers missed 14 → 10 → 8%. Completion 60 → 64 → 65%. Decision time 1.81 → 1.77 → 1.71 s. Scrambles stopped at or behind the line 79 → 68 → 44% | **Works** in every direction it should |
| **Agility** | Escape the pocket and contact | Sack attempts escaped 34 → 49 → 58%. Sacks 3.8 → 3.2 → 2.7%. Broken tackles in the open 7 → 15 → 19% | **Works** |
| **Speed** | Scramble effectiveness, outrun pursuit | QB Draw: 2.4 → 3.4 → 4.1 yards a carry; 15+ yard runs 0.5 → 1.4 → 8.7%; stopped at or behind the line 41 → 34 → 29%. Pressured 28 → 28 → 26% of dropbacks (neutral). No effect on escaping a sack attempt in the pocket | **Works in the open field.** In the pocket the escape is Agility's by the documented rule (GDD attribute table: sack attempt = rusher Tackling vs QB Agility) |
| **Strength** | Resist and break tackles | Broken tackles in the open 7 → 15 → 22% (neutral); QB Draw 0.07 → 0.14 → 0.31 broken tackles a carry, 3.3 → 3.4 → 4.2 yards. No effect on the sack attempt itself | **Works on runs and scrambles.** Not part of the in-pocket sack attempt, by the documented rule |

Scramble numbers on pass plays are small samples (scrambles are 2 to 6% of dropbacks, 60 to 200 plays per cell); the designed-run study is the reliable Speed and Strength measure.

## Findings

1. **No attribute is broken, reversed or inert where the rules say it acts.**
2. **Awareness is the main sack driver**, as the GDD intends: a 40-Awareness quarterback is sacked about four times as often as a 90.
3. **Owner question (not changed): should quarterback Strength resist the sack attempt itself?** Today the sack attempt reads only the rusher's Tackling and the quarterback's Agility (`engine.js` trySack; documented in the GDD attribute table). Ordinary tackles already use the carrier's Strength, so a scrambling quarterback's Strength counts, a pocket quarterback's does not. If wanted, the smallest correction is a Strength term in the trySack probability shaped like the ordinary tackle's (carrier Strength 0.5, Agility 0.3). It would lower sacks slightly for strong quarterbacks.
4. **Sack rate in this lab** (all 65s): 3.2% neutral, 4.3% with a stronger rush, against 1.7 to 2.0% in full games. The difference is the full-game opponents and abilities (see the candidate review: abilities add net defensive pressure but cut sacks). No sack rate was forced.

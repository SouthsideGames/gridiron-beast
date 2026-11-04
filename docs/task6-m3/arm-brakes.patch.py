# SCRATCH (proposal needing approval): the ordinary-club brakes (XP slowdown, runaway attrition) do not apply to a club that just had a losing season (win share <= 0.40).
import sys
p=sys.argv[1]+'/src/franchise/league-season.js'; s=open(p).read()
old="    c.strategy.slow = Math.max(0, ovr - (target + slowBand)); if (c.strategy.slow) out.slowed.push(club);"
assert old in s
s=s.replace(old,"    c.strategy.slow = !isGymClub(club) && club !== rival && (c.strategy.modeLastWin ?? 1) <= 0.4 ? 0 : Math.max(0, ovr - (target + slowBand)); if (c.strategy.slow) out.slowed.push(club); /* SCRATCH brakes */")
old2="    const runaway = (excessOf?.(club) || 0) > (isGymClub(club) ? BAND : ORDINARY_RUNAWAY_BAND);"
assert old2 in s
s=s.replace(old2,"    const runaway = !(!isGymClub(club) && (clubRecord(f, club).strategy?.modeLastWin ?? 1) <= 0.4) && (excessOf?.(club) || 0) > (isGymClub(club) ? BAND : ORDINARY_RUNAWAY_BAND); /* SCRATCH brakes */")
open(p,'w').write(s)

cd /home/claude/gb-impl
T=tools/balance-audit/pass-rush-study.mjs
for k in 1 1.75 2.5; do for aw in 30 50 70 95; do
  node $T --quality=62 --clubs=12 --n=2 --scenarios=avg,eliteDL,eliteOL --qbAware=$aw --qbk=$k --json=/tmp/claude-0/-home-claude/1937a85a-b150-5184-9ede-39d39e5f378f/scratchpad/cal/qb/main-k$k-aw$aw.json > /dev/null 2>&1
done; done
for k in 1 2.5; do for aw in 30 70 95; do
  node $T --quality=62 --clubs=12 --n=2 --scenarios=avg --qbAware=$aw --qbk=$k --defs=cover_0,zone_blitz,sam_fire,heavy_fire --json=/tmp/claude-0/-home-claude/1937a85a-b150-5184-9ede-39d39e5f378f/scratchpad/cal/qb/blitz-k$k-aw$aw.json > /dev/null 2>&1
  node $T --quality=62 --clubs=12 --n=2 --scenarios=avg --qbAware=$aw --qbk=$k --defs=cover_3,cover_2_zone,cover_4,tampa_2 --json=/tmp/claude-0/-home-claude/1937a85a-b150-5184-9ede-39d39e5f378f/scratchpad/cal/qb/zone-k$k-aw$aw.json > /dev/null 2>&1
  node $T --quality=62 --clubs=12 --n=2 --scenarios=avg --qbAware=$aw --qbk=$k --defs=cover_1,cover_2_man,two_man_press,double_bracket --json=/tmp/claude-0/-home-claude/1937a85a-b150-5184-9ede-39d39e5f378f/scratchpad/cal/qb/man-k$k-aw$aw.json > /dev/null 2>&1
done; done
echo done

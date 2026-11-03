# D5 experiment (scratch only): Rebuild clubs weight potential 0.20 (the standing weight) instead of 0.35.
import sys
p=sys.argv[1]+'/src/franchise/draft.js'; s=open(p).read()
old="export const POTENTIAL_WEIGHT = Object.freeze({ contend: 0.1, compete: 0.2, retool: 0.2, rebuild: 0.35 });"
assert old in s; s=s.replace(old,"export const POTENTIAL_WEIGHT = Object.freeze({ contend: 0.1, compete: 0.2, retool: 0.2, rebuild: 0.2 }); /* SCRATCH D5 0.20 arm */"); open(p,'w').write(s)

import { SPECIES_DEX as SPECIES } from '/home/claude/gridiron-beast/src/data/species.js';
import { regionSpecies } from '/home/claude/gridiron-beast/src/data/monsters.js';
import { REGIONS } from '/home/claude/gridiron-beast/src/data/staff.js';
const P=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const list = Array.isArray(SPECIES)?SPECIES:Object.values(SPECIES);
const nonleg=list.filter(s=>s.rarity!=='legendary');
const row={}; for(const p of P){ row[p]={primary:nonleg.filter(s=>s.position===p).length, viaSecondary:nonleg.filter(s=>s.secondary===p).length}; }
console.log('species total',list.length,'non-legendary',nonleg.length,'with secondary',list.filter(s=>s.secondary).length); console.table(row);
const gap={}; for (const rn of Object.keys(REGIONS)) { const pool=regionSpecies(rn, REGIONS[rn].types, 10); gap[rn]=P.filter(p=>!pool.some(s=>s.position===p)).join(',')||'-'; }
console.log('regions missing a primary species at position:', gap);

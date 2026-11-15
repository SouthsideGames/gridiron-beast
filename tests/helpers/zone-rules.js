// Ability contract fixtures explicitly choose Middle so their geometry assertions
// are independent of the coach's varied placement policy. AI variety and the
// full legal option set are tested separately against the production rules.
export * from '../../src/sim/rules.js';
import * as rules from '../../src/sim/rules.js';
import {ZONE_IDS,setZoneChoice,zoneKey} from '../../src/sim/t8/zone-planning.js';
export function runScrimmagePlay(state,teams,...args){
 const ids=new Set();
 for(const team of Object.values(teams))for(const m of [...Object.values(team.offense||{}),...Object.values(team.defense||{}),team.kicker,...(team.bench||[])])if(m?.id)ids.add(m.id);
 for(const p of state.t8?.fields?.pending||[])if(p.owner)ids.add(p.owner);
 for(const owner of ids)for(const ability of ZONE_IDS)for(const placementIndex of [0,1])setZoneChoice(state,zoneKey({owner,ability,placementIndex}),'middle');
 return rules.runScrimmagePlay(state,teams,...args);
}

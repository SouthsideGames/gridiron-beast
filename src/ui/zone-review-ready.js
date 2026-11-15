// Developer placement sandbox only. Rare natural triggers can be tested in the
// normal replay; this explicit ready fixture lets every form test placement.
import { queueField } from '../sim/t8/field-runtime.js';
import { SPLASH } from '../sim/abilities/tidepaw.js';
import { PERMAFROST } from '../sim/abilities/icehorn.js';
import { PATCH, STRENGTH, LIFETIME } from '../sim/abilities/shadowkit.js';
import { stageOf, byMastery } from '../sim/abilities/common.js';

export function stageZoneReadiness(G, family, form, mastery) {
  const owner = G.subject.id, t8 = G.state.t8;
  if ((t8.fields?.pending || []).some(p => p.owner === owner)) return false;
  let spec;
  const st = t8.ability[owner];
  if (family === 'tidepaw') {
    st.cd = SPLASH.cooldown;
    spec = { type: 'Water', offField: true, lbDepth: 5, width: SPLASH.width, length: SPLASH.length, lifetime: SPLASH.lifetime,
      strength: byMastery(SPLASH.slipByStage[stageOf(form)] || SPLASH.slipByStage[0], mastery), ability: 'WAT-01-F' };
  } else if (family === 'icehorn') {
    st.pending = true;
    spec = { type: 'Ice', place: 'backfield', ...PERMAFROST, strength: PERMAFROST.braking, ability: 'ICE-04-F' };
  } else if (family === 'shadowkit') {
    st.banked = true;
    spec = { type: 'Dark', ...PATCH, strength: STRENGTH[Math.min(1, stageOf(form))], lifetime: byMastery(LIFETIME, mastery), payload: { smokeConfusion: true }, ability: 'DAR-01-F' };
  } else return false;
  queueField(t8, { owner, ownerTeam: 'home', side: 'def', clock: 'ownerDefense', ...spec });
  return true;
}

// Task 8 readiness for the over-the-head charge / recharge bar (overhead.js): reads a contract's game-scope state (registry.js
// abilityState shape, per family) into { n, max, ready, cd, cdMax, spent }. Data only; the thresholds mirror the contract modules'
// constants (src/sim/abilities/*.js) and the Dex "Recharge / frequency" rows. Unknown families return null (no bar).
const CD_5432 = [5, 4, 3, 2], CD_6543 = [6, 5, 4, 3];
const byM = (arr, m) => arr[Math.max(0, Math.min(arr.length - 1, m || 0))];
const stageOf = (form) => Number(String(form).split(':')[1] || 0);

/** family -> (state, form, mastery) -> readiness | null */
const READ = {
  emberfox: (s) => ({ n: s.charges, max: 3, ready: !!s.ignited }),
  ashkit: (s) => ({ n: s.bar, max: 3, ready: !!s.queued || s.bar >= 3 }),
  firestorm: (s) => cd(s, 3), cinderclaw: (s) => cd(s, 3), pyroclast: (s) => (s.pending ? { n: 1, max: 1, ready: true } : null),
  tidepaw: (s) => cd(s, 3), mudcub: (s) => cd(s, 3), reefclaw: (s) => cd(s, 3), tidefin: (s, f, m) => cd(s, byM(CD_5432, m)), tsunarok: (s) => cd(s, 5),
  thornkit: (s, f, m) => tokenCd(s, byM(CD_5432, m)), mossclaw: (s, f, m) => cd(s, byM(CD_5432, m)), rootram: (s, f, m) => cd(s, byM(CD_5432, m)), thornback: (s) => tokenCd(s, 3), elderoot: (s) => cd(s, 5),
  flicker: (s, f, m) => cd(s, byM(CD_5432, m)), voltfin: (s, f, m) => tokenCd(s, byM(CD_5432, m)), voltfang: (s, f, m) => cd(s, byM(CD_5432, m)), stormlynx: (s, f, m) => cd(s, byM(CD_5432, m)), joltrex: (s, f, m) => cd(s, byM(CD_5432, m)), stormcrown: (s) => cd(s, 5),
  pebble: (s) => (s.banked ? { n: 1, max: 1, ready: true } : null), rockram: (s) => ({ n: s.bar, max: 3, ready: s.bar >= 3 }), boulderox: (s, f, m) => cd(s, byM(CD_5432, m)), stoneguard: (s) => once(s), terrabull: (s, f, m) => cd(s, byM(CD_5432, m)),
  hailfang: (s, f, m) => cd(s, byM(CD_5432, m)), frostclaw: (s) => ({ n: s.bar, max: 3, ready: s.bar >= 3 }), icehorn: (s, f, m) => (s.pending ? { n: 1, max: 1, ready: true } : cd(s, byM(CD_5432, m))), glaciron: (s, f, m) => cd(s, byM(CD_5432, m)), glacivern: (s) => once(s),
  gustling: (s, f, m) => cd(s, byM(CD_6543, m)), breezefang: (s, f) => ({ n: s.charges, max: stageOf(f) >= 1 ? 2 : 3, ready: s.charges >= (stageOf(f) >= 1 ? 2 : 3) }), skywarden: (s) => ({ n: s.charges, max: 3, ready: s.charges >= 3 }), windlynx: (s) => ({ n: s.charges, max: 2, ready: s.charges >= 2 }), zephyr: (s) => cd(s, 4), tempestra: (s) => ({ n: s.charges, max: 3, ready: s.charges >= 3 }),
  shadowkit: (s) => bankedCd(s, 5), duskrunner: (s) => cd(s, 5), mireclaw: (s) => ({ n: s.charges, max: 3, ready: s.charges >= 3 }), nocturne: (s) => bankedCd(s, 6), nyxshade: (s) => ({ n: s.charges, max: 2, ready: s.charges >= 2 }),
  glimmer: (s, f, m) => bankedCd(s, byM(CD_6543, m)), sunwhistle: (s) => (s.pending ? { n: 1, max: 1, ready: true } : null), lumen: (s) => cd(s, 5), prism: (s) => ({ n: s.charges, max: 3, ready: s.charges >= 3 }), halofang: (s, f, m) => ({ n: s.tackles, max: byM([3, 3, 2, 2], m), ready: !!s.armed }), aurelion: (s) => ({ n: s.mark, max: 2, ready: s.mark >= 2 }),
  ironcub: (s, f, m) => cd(s, byM(CD_5432, m)), gearwing: (s) => (s.banked ? { n: 1, max: 1, ready: true } : null), ironjaw: (s) => (s.token ? { n: 1, max: 1, ready: true } : null), metalhorn: (s, f, m) => bankedCd(s, byM(CD_6543, m)), aegistron: (s) => ({ n: s.count, max: 3, ready: !!s.armed }),
  mindwing: (s, f, m) => bankedCd(s, byM(CD_6543, m)), shadewisp: (s, f, m) => cd(s, byM(CD_5432, m)), cerebrix: (s, f, m) => cd(s, byM(CD_6543, m)), enigmane: (s) => ({ n: s.bar, max: 4, ready: s.bar >= 4 }), astralux: (s) => once(s),
  wyrmkit: (s) => ({ n: s.bar, max: 3, ready: s.bar >= 3 }), scaleguard: (s) => ({ n: s.bar, max: 3, ready: s.bar >= 3 }), vyrnax: (s) => once(s), aurodrax: (s) => ({ n: s.streak, max: 3, ready: !!s.charged, spent: !!s.used }),
};
function cd(s, max) { return s.cd > 0 ? { n: 0, max: 0, ready: false, cd: s.cd, cdMax: Math.max(max, s.cd) } : null; } // a repeatable ability that is simply ready shows no bar (nothing to read)
function tokenCd(s, max) { if (s.token) return { n: 1, max: 1, ready: true }; return cd(s, max); }
function bankedCd(s, max) { if (s.banked) return { n: 1, max: 1, ready: true }; return cd(s, max); }
function once(s) { return s.used ? { n: 0, max: 1, ready: false, spent: true } : null; } // once a game: only the spent tick is information

/** The bar data for one monster's game-scope ability state, or null when the family shows no bar (passives, auras). */
export function readiness(family, state, form = null, mastery = 0) {
  const r = READ[family]; if (!r || !state) return null;
  const out = r(state, form, mastery); if (!out) return null;
  return { n: Math.max(0, Math.min(out.max || 0, out.n || 0)), max: out.max || 0, ready: !!out.ready, cd: out.cd || 0, cdMax: out.cdMax || 0, spent: !!out.spent };
}

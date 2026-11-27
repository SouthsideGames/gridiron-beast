// Module-load hook for tools/balance-audit/clash-legendary-options.mjs (follow-up brief I-3, investigation only). Registered with
// node:module register() by that tool; never imported by the game. When CLASH_VARIANT names a variant, the hook rewrites the source
// text of the four legendary Clash ability modules AS THEY LOAD IN THIS PROCESS. No file on disk changes. Each rewrite asserts that its
// anchor text exists, so a variant can never silently measure the shipped behaviour.
//
// Variants (the options laid out for the owner; see the tool's header):
//   B  "cast in addition to the attack": after the signature's own effect, chooseAction returns null, so the engine continues with the
//      ordinary attack in the same turn (once per Clash, conditions unchanged).
//   C  "stronger effect, still replaces the attack": Eye of the Storm 2 → 4 restricted turns; Deep Winter 2 → 4 frozen turns; Root
//      Communion threshold 25% → 40%; Eclipse Theft, when its own slot is occupied, strips the foe's benefit instead of falling back to the
//      attack.
const V = process.env.CLASH_VARIANT || '';
const ONLY = (process.env.CLASH_VARIANT_ONLY || 'tempestra,glacivern,nyxshade,elderoot').split(',');
const sub = (src, from, to, file) => { if (!src.includes(from)) throw new Error(`clash-variant-hooks: anchor not found in ${file}: ${from}`); return src.split(from).join(to); };
const RULES = {
  B: {
    tempestra: [["api.restrictSignature(self, foeId, TURNS);\n      return { kind: 'done' };", 'api.restrictSignature(self, foeId, TURNS);\n      return null;']],
    glacivern: [["for (const v of targets) api.setFreeze(self, v.id, FREEZE);\n      return { kind: 'done' };", 'for (const v of targets) api.setFreeze(self, v.id, FREEZE);\n      return null;']],
    nyxshade: [["self.state.used = true; api.executed(self);\n      return { kind: 'done' };", 'self.state.used = true; api.executed(self);\n      return null;']],
    elderoot: [["'apportioned');\n      return { kind: 'done' };", "'apportioned');\n      return null;"]],
  },
  C: {
    tempestra: [['const TURNS = 2;', 'const TURNS = 4;']],
    glacivern: [['const FREEZE = 2;', 'const FREEZE = 4;']],
    elderoot: [['const LINE = 25;', 'const LINE = 40;']],
    nyxshade: [["if (me.status || !f.status || !STEALABLE.includes(f.status.id)) return null;",
      "if (!f.status || !STEALABLE.includes(f.status.id)) return null;\n      if (me.status) { self.state.used = true; api.activate(self, 'eclipse strips ' + f.status.id, { targetId: foeId }); api.removeStatus(self, foeId, 'stripped'); api.executed(self); return { kind: 'done' }; }"]],
  },
};
// CLASH_DISABLE=family[,family]: that family's Clash contract registers with NO hooks (initBattle and values kept), so it never acts
// and always uses the ordinary attack, while every other monster keeps its ability. Comparing a run with it against the shipped run on
// the same seeds isolates that ability's own contribution (the audit's on/off effect also switches every other monster's ability).
const DISABLE = (process.env.CLASH_DISABLE || '').split(',').filter(Boolean);
export async function load(url, context, next) {
  const r = await next(url, context);
  const dm = /\/src\/clash\/abilities\/([a-z0-9_]+)\.js$/.exec(url);
  if (dm && DISABLE.includes(dm[1])) {
    let src = typeof r.source === 'string' ? r.source : Buffer.from(r.source).toString('utf8');
    src = sub(src, 'export default registerClashAbility({', 'export default registerClashAbility(__noHooks({', dm[1]);
    const end = src.lastIndexOf('});'); if (end < 0) throw new Error(`clash-variant-hooks: no module end in ${dm[1]}`);
    src = src.slice(0, end) + '}));\nfunction __noHooks(m) { return { ...m, hooks: {} }; }\n' + src.slice(end + 3);
    return { ...r, source: src, shortCircuit: true };
  }
  const m = /\/src\/clash\/abilities\/(tempestra|glacivern|nyxshade|elderoot)\.js$/.exec(url);
  if (!V || !m || !ONLY.includes(m[1]) || !RULES[V]?.[m[1]]) return r;
  let src = typeof r.source === 'string' ? r.source : Buffer.from(r.source).toString('utf8');
  for (const [a, b] of RULES[V][m[1]]) src = sub(src, a, b, m[1]);
  return { ...r, source: src, shortCircuit: true };
}

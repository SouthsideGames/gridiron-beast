// Developer → Clash Ability Reviewer (Task 8 fx pass; spec §13 / §25 "Both ability reviewers"; docs/task8/FX_CLASH_MATRIX.md). Every Dex
// Clash ability, each form and mastery tier, each staged scenario of the engine-side reviewer (src/clash/t8/review.js): the scenario runs
// on the REAL t8 engine, and the record is played through the REAL arena (src/ui/clash/arena.js in t8 mode) with the ability's look
// (src/ui/clash/t8/looks). Before playback the sheet explains the staging, the controlled prerequisites and the checks; the phase strip
// (anticipation → activation → movement → impact → target → persistence → cleanup) is filled from the presentation descriptors.
// Scenarios marked provisional run with the PROVISIONAL readings on and are labelled; provisional readings are never enabled in normal
// play. Reviewer-local FX quality (full / low / min) and reduced-motion toggles are never written to settings. Nothing here writes to a
// franchise. `#crvhost.__crv` exposes { arena, prep, seek(t) } for tools/fx-clash-check.mjs.
import { esc, delegate, sheet, toast } from '../dom.js';
import '../../clash/abilities/index.js';
import { registeredClashAbilities } from '../../clash/t8/registry.js';
import { abilityById, familyById, formsOf } from '../../data/beast-dex.js';
import { runScenario, listScenarios, TIERS } from '../../clash/t8/review.js';
import { typeEdge } from '../../clash/types.js';
import { createArena } from '../clash/arena.js';
import { t8CuesFor } from '../clash/t8/timeline.js';
import { buildClashT8, PHASES } from '../clash/t8/fx-t8.js';
import { LOOKS } from '../clash/t8/looks/index.js';

const ELEMENTS = ['All', 'Fire', 'Water', 'Nature', 'Electric', 'Ice', 'Wind', 'Earth', 'Dark', 'Light', 'Metal', 'Psychic', 'Dragon'];

/** The catalogue: one row per Clash ability. */
export function clashReviewCatalog() {
  return registeredClashAbilities().map((id) => { const a = abilityById(id); const fam = familyById(a.familyId); return { abilityId: id, family: a.familyId, name: a.name, element: fam.element, forms: formsOf(a.familyId).map((f) => ({ id: f.id, stage: f.stage, name: f.name })), visual: a.details.find((d) => d.section === 'Visuals')?.rule || '', look: !!LOOKS[id] }; });
}
/** Phase evidence from the built descriptors (the same rule the tests use, in short). */
export function phaseEvidence(state, abilityId) {
  const look = LOOKS[abilityId]; const na = new Set(look?.na || []); const items = state.items.filter((it) => it.id === abilityId); const main = items.find((it) => it.main) || items[0]; const out = {};
  const log = state.result.log;
  out.anticipation = na.has('anticipation') ? 'n/a' : main && (main.start < main.t0 - 1e-6 || log.slice(0, main.seq).some((e) => e.abilityId === abilityId && ['trigger', 'ability_progress', 'provisional'].includes(e.kind)) || items.some((it) => it.look.until)) ? 'yes' : null;
  out.activation = na.has('activation') ? 'n/a' : main ? 'yes' : null;
  out.movement = na.has('movement') ? 'n/a' : items.some((it) => it.look.move) ? 'yes' : null;
  out.impact = na.has('impact') ? 'n/a' : items.some((it) => it.look.impact || ['damage', 'heal', 'status', 'status_end', 'hp_set', 'revive', 'redirect', 'survive', 'intercepted', 'raw_split', 'rotation', 'miss', 'clock_adjust', 'status_freeze', 'delayed_impact'].includes(it.kind)) ? 'yes' : null;
  out.target = na.has('target') ? 'n/a' : items.some((it) => (it.target && it.target !== it.owner && it.look.target !== false) || it.look.target) || state.pops.some((p) => p.abilityId === abilityId) ? 'yes' : null;
  out.persistence = na.has('persistence') ? 'n/a' : look?.persistVia || items.some((it) => it.look.until || it.look.persist) || state.indicators[main?.owner]?.length || log.some((e) => e.abilityId === abilityId && (e.kind === 'clock_start' || e.kind === 'clock_adjust')) ? 'yes' : null;
  out.cleanup = na.has('cleanup') ? 'n/a' : items.length ? 'yes' : null;
  return out;
}

export function registerClashReviewer(Router, app) {
  const cat = clashReviewCatalog();
  const st = { element: 'All', pick: {}, open: null, arena: null, quality: 'full', reducedMotion: false };
  const pickOf = (c) => (st.pick[c.abilityId] ||= { stage: 0, tier: 0, scenario: null });
  const stop = () => { if (st.arena) { st.arena.destroy(); st.arena = null; } if (st.sheet) { const sh = st.sheet; st.sheet = null; sh.el.remove(); } };

  Router.registerScreen('clash-reviewer', {
    title: 'Clash Ability Reviewer', tabs: false,
    render() {
      const list = cat.filter((c) => st.element === 'All' || c.element === st.element);
      return `<p class="muted">Every Beast Clash ability from the Dex, on the t8 engine. <b>▶ Scenario</b> runs the chosen staged scenario of the engine-side reviewer (controlled prerequisites are labelled; the ability's own result is never manufactured) and plays the record through the real arena with the ability's approved look. Scenarios marked <span class="crv-prov">PROVISIONAL</span> run with the provisional readings on, for review only; normal play never enables them. Nothing is written to any franchise.</p>
        <div class="chips" style="margin:0 0 8px">${ELEMENTS.map((e) => `<button class="chip ${st.element === e ? 'on accent' : ''}" data-action="element" data-v="${e}">${e}</button>`).join('')}</div>
        <div class="panel tight" style="font-size:12px;margin-bottom:8px"><b>Reviewer FX</b> (local, never saved): quality ${['full', 'low', 'min'].map((q) => `<button class="chip ${st.quality === q ? 'on accent' : ''}" data-action="quality" data-v="${q}">${q}</button>`).join('')} · <button class="chip ${st.reducedMotion ? 'on accent' : ''}" data-action="reduced">reduced motion ${st.reducedMotion ? 'on' : 'off'}</button></div>
        <div class="crv-list">${list.map((c) => { const p = pickOf(c); const scs = listScenarios(c.abilityId, p.stage, p.tier); const sc = scs.find((s) => s.id === p.scenario) || scs.find((s) => s.kind === 'valid') || scs[0]; return `<div class="panel tight crv-row" data-id="${c.abilityId}"><div><div><b>${esc(c.name)}</b> <span class="dim">${c.abilityId} · ${esc(c.family)} · ${esc(c.element)}</span>${sc?.provisional ? ' <span class="crv-prov">PROVISIONAL</span>' : ''}</div><div class="dim" style="font-size:11px">${esc(c.visual)}</div><div class="crv-sel"><select data-change="pick-stage" data-id="${c.abilityId}">${c.forms.map((f) => `<option value="${f.stage}" ${f.stage === p.stage ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select><select data-change="pick-tier" data-id="${c.abilityId}">${TIERS.map((t, i) => `<option value="${i}" ${i === p.tier ? 'selected' : ''}>${t}</option>`).join('')}</select><select data-change="pick-scenario" data-id="${c.abilityId}">${scs.map((s) => `<option value="${s.id}" ${s.id === sc?.id ? 'selected' : ''}>${s.provisional ? '⚠ ' : ''}${esc(s.kind)}: ${esc(s.title)}</option>`).join('')}</select></div></div><button class="btn primary small" data-action="scenario" data-id="${c.abilityId}">▶ Scenario</button></div>`; }).join('')}</div>`;
    },
    mount(root) {
      delegate(root, {
        element: (el) => { st.element = el.dataset.v; Router.render(); },
        quality: (el) => { st.quality = el.dataset.v; st.arena?.setQuality(st.quality); Router.render(); },
        reduced: () => { st.reducedMotion = !st.reducedMotion; Router.render(); },
        scenario: (el) => openScenario(el.dataset.id),
        'pick-stage': (sel) => { const p = pickOf(cat.find((c) => c.abilityId === sel.dataset.id)); p.stage = Number(sel.value); p.scenario = null; Router.render(); },
        'pick-tier': (sel) => { const p = pickOf(cat.find((c) => c.abilityId === sel.dataset.id)); p.tier = Number(sel.value); p.scenario = null; Router.render(); },
        'pick-scenario': (sel) => { pickOf(cat.find((c) => c.abilityId === sel.dataset.id)).scenario = sel.value; Router.render(); },
      });
    },
    unmount() { stop(); },
  });

  function openScenario(abilityId) {
    const c = cat.find((x) => x.abilityId === abilityId); const p = pickOf(c);
    const scs = listScenarios(abilityId, p.stage, p.tier); const sc = scs.find((s) => s.id === p.scenario) || scs.find((s) => s.kind === 'valid') || scs[0];
    let r; try { r = runScenario({ abilityId, stage: p.stage, tier: p.tier, scenarioId: sc.id }); } catch (e) { toast(`Scenario failed: ${e.message}`, 'bad'); return; }
    const cues = t8CuesFor(r.result); const state = buildClashT8(r.result, cues, { only: abilityId }); const ev = phaseEvidence(state, abilityId);
    const names = { a: 'Side A', b: 'Side B' };
    const html = `<div class="stack" style="gap:8px"><div><b>${esc(c.name)}</b> <span class="dim">${abilityId} · ${esc(r.meta.formName)} · ${esc(r.meta.tierName)} · ${esc(sc.kind)}</span>${r.meta.provisional ? `<div class="crv-prov">${esc(r.meta.label)}</div>` : ''}</div>
      <div class="dim" style="font-size:12px"><b>Dex visual:</b> ${esc(c.visual)}</div>
      <div style="font-size:12px">${esc(r.explain)}</div>
      ${r.controlled ? `<div class="dim" style="font-size:11px"><b>Controlled prerequisites:</b> ${esc(JSON.stringify(r.controlled))}</div>` : ''}
      <div class="crv-phase">${PHASES.map((ph) => `<span class="${ev[ph] ? 'on' : ''}" title="${ph}">${ph}${ev[ph] === 'n/a' ? ' (n/a)' : ev[ph] ? ' ✓' : ' ✗'}</span>`).join('')}</div>
      <div class="crv-checks">${r.checks.map((k) => `<div class="${k.ok ? 'ok' : 'bad'}">${k.ok ? '✓' : '✗'} ${esc(k.check)}${k.detail !== undefined ? ` <span class="dim">(${esc(String(k.detail))})</span>` : ''}</div>`).join('')}</div>
      <div id="crvhost"></div></div>`;
    stop();
    const { el, close } = sheet(html, { title: 'Clash scenario', onClose: stop }); st.sheet = { el, close };
    const host = el.querySelector('#crvhost');
    st.arena = createArena(host, r.result, { speed: 1, quality: st.quality, reducedMotion: st.reducedMotion, subject: abilityId, names, edge: typeEdge, onEnd: () => {} });
    host.__crv = { arena: st.arena, prep: { r, cues, state, ev }, seek: (t) => st.arena?.seek(t), close };
    void app;
  }
}

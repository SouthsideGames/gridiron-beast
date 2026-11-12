// Developer → Clash Ability Reviewer (Task 8 M4 S15 UI; spec §13 and §25 "Both ability reviewers"). Every Dex Clash ability, each
// form and each mastery tier (the engine's reviewMatrix: no silent missing entries). "▶ Scenario" runs the selected scenario on the
// REAL t8 engine through src/clash/t8/review.js: staged prerequisites and controlled outcomes are labelled, the ability's own result is
// never manufactured, and the run plays through later turns until the cleanup. Before playback the sheet explains the source, the
// targets, the expected result, how it is staged and any provisional label; the four-phase checklist (trigger met → ability activated →
// effect resolved → cleanup) ticks from the engine's own events as the arena reaches them; a failed check or a missing phase shows the
// failure panel (the unmet condition or the implementation error), never a silent ordinary battle. Controls: pause / play, replay,
// 0.25× / 0.5× / 1×, step by event, by turn and by exchange. The variant list adds the separately labelled blocked, failure and
// interaction scenarios. "▶ Natural battle" is the optional mode for ordinary activation frequency. The battle renders through the
// real arena in native t8 mode (src/ui/clash/arena.js: the t8 timeline, the ability looks of src/ui/clash/t8/looks and the two overlay
// layers), so every scenario plays with the ability's real look. Reconciled (task8-m4-reconcile): the fx branch's presentation check
// (the former Developer → clash-reviewer screen) is folded in: the sheet also shows the seven presentation phases (anticipation →
// activation → movement → impact → target → persistence → cleanup, from the look descriptors, src/ui/clash/t8/evidence.js), the list has
// reviewer-local FX quality (full / low / min) and reduced-motion toggles (never saved), and the host exposes `__crv`
// ({ arena, prep, seek(t), close }) for tools/fx-clash-check.mjs beside `__rv2` for tools/m4-integrate-check.mjs. Nothing here writes to
// a franchise: no XP, mastery, collection, reward or save writes; the owner's verdicts are review notes in the shared dev-review store
// ('clashability').
import { esc, delegate, sheet, toast } from '../dom.js';
import { abilityById, familyById, formsOf } from '../../data/beast-dex.js';
import { reviewMatrix, listScenarios, reviewMonster, TIERS } from '../../clash/t8/review.js';
import { reviewClashScenario, clashVariants, PHASE_LABELS } from '../../clash/t8/review-phases.js';
import { simulateByRuleset } from '../../clash/index.js';
import { typeEdge } from '../../clash/types.js';
import { createArena } from '../clash/arena.js';
import { nextTurnIndex, nextExchangeStart } from '../clash/t8-record.js';
import { PHASES } from '../clash/t8/fx-t8.js';
import { phaseEvidence, clashReviewCatalog } from '../clash/t8/evidence.js';
import { elementFx } from '../ability-fx.js';
import { syncReviews } from '../../franchise/review-store.js';
import { reviewHtml, reviewHandlers as sharedHandlers, abilityStatus, abilityStateBadge, takeReviewerFocus } from '../dev-review.js';
import { registerAbilityReviews, clashCatalog } from '../ability-review-inventory.js';
import { SPECIES_DEX } from '../../data/species.js';

export const NS = 'clashability';
export { clashReviewCatalog, phaseEvidence }; // the presentation catalogue and evidence rule (tools/fx-clash-check.mjs reads them from here)
const SPEEDS = [0.25, 0.5, 1];
const GROUP_CHIP = { main: '', blocked: '⛔ Blocked', failure: '✗ Failure / depletion', interaction: '⇄ Interaction' };
const ARCH_GLYPH = { Tank: '🛡', Striker: '⚔️', Support: '💚', Disruptor: '🌀', Balanced: '⚖️' };
const SP = new Map(SPECIES_DEX.map((s) => [s.id, s]));

export { clashCatalog }; // the catalog now lives with the review inventory (src/ui/ability-review-inventory.js)

export function registerClashAbilityReviewer(Router, app) {
  const cat = registerAbilityReviews().clash; // the inventory, from the engine's registry; registers every fingerprint
  const st = { element: 'All', status: 'all', pick: {}, notesOpen: new Set(), synced: false, arena: null, pb: null, quality: 'full', reducedMotion: false };
  const elements = ['All', ...new Set(cat.map((c) => c.element))];
  const pickOf = (c) => (st.pick[c.abilityId] ||= { stage: 0, tier: 1, variant: null });
  const variantsFor = (c, p) => clashVariants(c.abilityId, p.stage, p.tier);

  Router.registerScreen('clash-ability-reviewer', {
    title: 'Clash Ability Reviewer', tabs: false,
    render() {
      const fx = takeReviewerFocus(NS); if (fx) { st.status = fx.status || 'all'; st.element = 'All'; st.scrollTo = fx.anchor; } // opened from a review notification
      const state = Object.fromEntries(cat.map((c) => [c.abilityId, abilityStatus(NS, c.abilityId)])); // 'pending' | 'approved' | 'revision'
      const count = { approved: 0, revision: 0, pending: 0 }; for (const c of cat) count[state[c.abilityId]] += 1;
      const ok = (c) => (st.element === 'All' || c.element === st.element) && (st.status === 'all' || (st.status === 'outstanding' ? state[c.abilityId] !== 'approved' : state[c.abilityId] === st.status));
      const list = cat.filter(ok); const rows = reviewMatrix().length;
      return `<p class="muted">Every Beast Clash ability from the Beast Dex, each form and each mastery tier (${cat.length} abilities, ${rows} form × tier rows). <b>▶ Scenario</b> demonstrates the complete interaction on the first run: the engine stages the prerequisites (HP, statuses, ability state, sparring partners, a selected seed, all labeled), plays the real battle to the activation and on through later turns until the cleanup, and ticks each phase from its own events. The <b>variant</b> list adds the labeled blocked, failure and interaction scenarios; a scenario marked PROVISIONAL runs an unapproved reading that normal play never uses. <b>▶ Natural battle</b> plays ordinary AI battles for activation frequency. Nothing is written to any franchise.</p>
        <div class="panel tight review-summary"><div class="row between"><b>Your review</b><span class="dim">${cat.length} abilities · all on the t8 engine</span></div>
          <div class="row" style="gap:10px;font-size:13px;margin-top:4px;flex-wrap:wrap"><span class="dim">🔔 ${count.pending} pending review</span><span style="color:var(--good)">✓ ${count.approved} approved</span><span style="color:var(--warn)">✎ ${count.revision} need revision</span></div></div>
        <div class="chips" style="margin:8px 0 4px">${[['all', 'All'], ['pending', '🔔 Pending Review'], ['approved', '✓ Approved'], ['revision', '✎ Needs Revision']].map(([v, l]) => `<button class="chip ${v === st.status ? 'on' : ''}" data-action="st" data-v="${v}">${l}${v === 'all' ? '' : ` ${count[v]}`}</button>`).join('')}</div>
        <div class="panel tight" style="font-size:12px;margin:4px 0" data-rv2="fx"><b>Reviewer FX</b> (local, never saved): quality ${['full', 'low', 'min'].map((q) => `<button class="chip ${st.quality === q ? 'on accent' : ''}" data-action="quality" data-v="${q}">${q[0].toUpperCase() + q.slice(1)}</button>`).join('')} · <button class="chip ${st.reducedMotion ? 'on accent' : ''}" data-action="reduced">Reduced Motion ${st.reducedMotion ? 'On' : 'Off'}</button></div>
        <div class="chips" style="margin:4px 0 8px">${elements.map((el) => `<button class="chip ${el === st.element ? 'on' : ''}" data-action="el" data-v="${el}">${el === 'All' ? 'All' : elementFx(el).glyph + ' ' + el}</button>`).join('')}</div>
        <div class="stack">${list.length ? '' : '<p class="dim center">Nothing here with these filters.</p>'}${list.map((c) => {
          const L = elementFx(c.element); const p = pickOf(c); const rv = state[c.abilityId]; const vars = variantsFor(c, p); if (!vars.some((v) => v.id === p.variant)) p.variant = vars[0]?.id || null;
          return `<div class="panel tight audit-row ${rv === 'approved' ? 'rv-approved' : rv === 'revision' ? 'rv-needswork' : ''}" id="cl-${c.abilityId}" data-status="${rv}">
            <div class="row between"><b style="color:${L.a}">${esc(c.name)}</b> ${abilityStateBadge(NS, c.abilityId)}<span class="chip" style="border-color:${L.a};color:${L.a}">${L.glyph} ${esc(c.element)} · ${ARCH_GLYPH[c.archetype] || ''} ${esc(c.archetype)} · ${esc(c.rarity)}</span></div>
            <div class="dim" style="font-size:12px">${esc(c.abilityId)} · ${esc(c.familyName)} (${esc(c.family)}) · ${esc(c.category)}${c.activation ? ` · ${esc(c.activation)}` : ''}</div>
            ${c.mechanic ? `<div class="muted" style="font-size:12px;margin-top:2px">${esc(c.mechanic)}</div>` : ''}
            <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
              <select data-change="form" data-id="${c.abilityId}" aria-label="Form">${c.forms.map((f) => `<option value="${f.stage}" ${f.stage === p.stage ? 'selected' : ''}>${esc(f.name)} (stage ${f.stage + 1})</option>`).join('')}</select>
              <select data-change="tier" data-id="${c.abilityId}" aria-label="Mastery tier">${c.tiers.map((t) => `<option value="${t}" ${t === p.tier ? 'selected' : ''}>${TIERS[t]}</option>`).join('')}</select>
              <select data-change="variant" data-id="${c.abilityId}" aria-label="Scenario variant">${vars.map((v) => `<option value="${v.id}" data-kind="${esc(v.kind)}" data-prov="${v.provisional ? '1' : ''}" ${v.id === p.variant ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>
              <button class="btn small" data-action="scenario" data-id="${c.abilityId}">▶ Scenario</button>
              <button class="btn small ghost" data-action="natural" data-id="${c.abilityId}">▶ Natural Battle</button></div>
            ${reviewHtml(NS, c.abilityId, { open: st.notesOpen.has(`${NS}:${c.abilityId}`) })}</div>`; }).join('')}</div>`;
    },
    mount(root) {
      if (!st.synced) { st.synced = true; syncReviews(NS).then((ok) => { if (ok) Router.render(); }); }
      if (st.scrollTo) { const id = st.scrollTo; st.scrollTo = null; setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 30); }
      delegate(root, {
        el: (el) => { st.element = el.dataset.v; Router.render(); },
        st: (el) => { st.status = el.dataset.v; Router.render(); },
        quality: (el) => { st.quality = el.dataset.v; st.arena?.setQuality(st.quality); Router.render(); },
        reduced: () => { st.reducedMotion = !st.reducedMotion; Router.render(); },
        form: (el) => { pickOf(cat.find((c) => c.abilityId === el.dataset.id)).stage = Number(el.value); Router.render(); },
        tier: (el) => { pickOf(cat.find((c) => c.abilityId === el.dataset.id)).tier = Number(el.value); Router.render(); },
        variant: (el) => { pickOf(cat.find((c) => c.abilityId === el.dataset.id)).variant = el.value; },
        scenario: (el) => go(el, 'scenario'),
        natural: (el) => go(el, 'natural'),
        ...sharedHandlers(() => Router.render(), st.notesOpen, () => toast('Saved on this device; the cloud copy did not save.', 'bad')),
      });
    },
    unmount() { stop(); },
  });

  function go(el, mode) {
    const c = cat.find((x) => x.abilityId === el.dataset.id); const label = el.textContent; el.disabled = true; el.textContent = 'Running…';
    setTimeout(() => { try { if (mode === 'scenario') runScenarioSheet(c); else runNatural(c); } finally { el.disabled = false; el.textContent = label; } }, 20);
  }
  function stop() { if (st.arena) { st.arena.destroy(); st.arena = null; } st.pb = null; }
  const stateText = (x) => (x == null ? '—' : esc(JSON.stringify(x)));
  function bindReview(c, box) { if (box) delegate(box, sharedHandlers(() => { box.innerHTML = reviewHtml(NS, c.abilityId, { open: true }); Router.render(); }, st.notesOpen)); }

  // ---------------------------------------------------------------------------------- ▶ Scenario: the complete interaction
  function runScenarioSheet(c) {
    stop(); const p = pickOf(c); const scs = listScenarios(c.abilityId, p.stage, p.tier); const sc = scs.find((s) => s.id === p.variant) || scs[0]; if (!sc) { toast('No scenario for this form and tier.', 'bad'); return; }
    const r = reviewClashScenario({ abilityId: c.abilityId, stage: p.stage, tier: p.tier, scenarioId: sc.id });
    const form = formsOf(c.family).find((f) => f.stage === p.stage); const X = r.explain; const v = clashVariants(c.abilityId, p.stage, p.tier).find((x) => x.id === sc.id);
    const head = `${esc(c.name)} · ${esc(form?.name || '')} (stage ${p.stage + 1}) · ${TIERS[p.tier]} · ${esc(sc.title || sc.id)}`;
    const intro = X ? `<div class="panel tight rv2-explain" data-rv2="explain">
        <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:4px"><span class="chip">▶ Scenario: staged on the real t8 engine (${esc(X.engine)}, seed ${X.seed})</span>${v && v.group !== 'main' ? `<span class="chip warn">${GROUP_CHIP[v.group]}</span>` : ''}${X.controlled.length ? '<span class="chip warn" data-rv2="controlled">⚙ Controlled prerequisite</span>' : ''}${X.provisional ? `<span class="chip warn" data-rv2="provisional">⚠ ${esc(X.provisional)}</span>` : ''}</div>
        <div style="font-size:13px"><b>Source:</b> ${X.source ? `${esc(X.source.name)} (${esc(X.source.id)}, side ${X.source.side.toUpperCase()}, ${esc(X.source.archetype)} · ${esc(X.source.type)}, ${esc(X.source.form)} tier ${X.source.tier})` : '—'}</div>
        <div style="font-size:13px"><b>Targets in this run:</b> ${esc(X.targets)}</div>
        <div style="font-size:13px"><b>Expected result:</b> ${esc(X.expected || '—')}</div>
        ${X.contract ? `<div class="dim" style="font-size:11px;margin-top:2px"><b>Contract:</b> ${esc(X.contract)}</div>` : ''}
        ${X.kindRow ? `<div class="dim" style="font-size:11px;margin-top:2px">Kind: ${esc(X.kindRow.action || X.kindRow.kind || '')}${X.kindRow.repeat ? ` · ${esc(X.kindRow.repeat)}` : ''}${X.kindRow.undodgeable ? ' · undodgeable' : ''}</div>` : ''}
        ${X.staging.length ? `<div class="dim" style="font-size:11px;margin-top:4px"><b>How it is staged (labeled inputs, never the ability's result):</b><br>${X.staging.map((s) => `• ${esc(s)}`).join('<br>')}</div>` : '<div class="dim" style="font-size:11px;margin-top:4px">Nothing staged beyond the lineups and the seed.</div>'}
        ${X.controlled.map((x) => `<div class="chip warn" style="margin-top:4px;white-space:normal;font-size:11px">⚙ ${esc(x)}</div>`).join('')}
        <div class="dim" style="font-size:11px;margin-top:4px">A staged or controlled run shows the mechanism, not how often it happens in play; ▶ Natural battle shows frequency.</div></div>` : '';
    const failure = r.ok ? '' : `<div class="panel tight" data-rv2="failure" style="border-color:var(--bad);margin-top:6px"><b style="color:var(--bad)">${r.error ? '⚠ Implementation error' : '✗ Not demonstrated'}</b>
        <div style="font-size:13px;margin-top:2px">${esc(r.failure?.condition || 'unknown')}</div>${r.failure?.detail ? `<div class="dim" style="font-size:12px">${esc(r.failure.detail)}</div>` : ''}
        ${(r.failure?.unmet || []).map((u) => `<div class="dim mono" style="font-size:10px">#${u.seq} ex ${u.ex}: ${esc(u.unmet.map((x) => x.condition + (x.detail ? ` (${x.detail})` : '')).join('; '))}</div>`).join('')}
        ${r.error ? `<pre class="mono" style="font-size:10px;white-space:pre-wrap">${esc(r.error.stack || r.error.message)}</pre>` : ''}</div>`;
    if (!r.run) { const { el } = sheet(`<p class="muted">${head}</p>${failure}<div class="sheet-review" style="margin-top:10px">${reviewHtml(NS, c.abilityId, { open: true })}</div>`, { title: c.name }); bindReview(c, el.querySelector('.sheet-review')); return; }
    const checks = `<div class="dim" style="font-size:11px;margin-top:4px" data-rv2="checks">Scenario checks: ${r.run.checks.map((x) => `<span style="color:${x.ok ? 'var(--good)' : 'var(--bad)'}">${x.ok ? '✓' : '✗'} ${esc(x.check)}</span>`).join(' · ')}</div>`;
    openPlayer(c, { title: `${elementFx(c.element).glyph} ${c.name}`, head, intro: intro + checks + failure, result: r.run.result, phases: r.phases, ok: r.ok, abilityId: c.abilityId, owner: X?.source?.id || null, run: r.run });
  }

  // ------------------------------------------------------------------------------------------- ▶ Natural battle (optional)
  function runNatural(c) {
    stop(); const p = pickOf(c); const form = formsOf(c.family).find((f) => f.stage === p.stage);
    // Ordinary AI battles (policies ai / ai, nothing staged): the subject's family leads side A against a fixed opponent set; seeds are
    // tried in order until the ability executes, so this shows activation under ordinary play, not a demonstration.
    const foes = ['pebble', 'tidepaw', 'gustling', 'leafhorn', 'joltrex', 'emberfox'].filter((s) => SP.has(s) && s !== c.family).slice(0, 3);
    const allies = ['mudcub', 'glimmer', 'thornkit', 'wyrmkit'].filter((s) => SP.has(s) && s !== c.family).slice(0, 2);
    let found = null; let tried = 0;
    for (let seed = 1; seed <= 40 && !found; seed++) {
      tried += 1;
      const a = [reviewMonster({ species: c.family, stage: p.stage, overall: 75, tier: p.tier }, seed * 100), ...allies.map((s, i) => reviewMonster({ species: s, overall: 72 }, seed * 100 + 1 + i))];
      const b = foes.map((s, i) => reviewMonster({ species: s, overall: 72 }, seed * 100 + 50 + i));
      const r = simulateByRuleset({ a, b, seed, config: { ruleset: 't8', policies: { a: 'ai', b: 'ai' } } });
      if (r.log.some((e) => e.abilityId === c.abilityId && e.kind === 'execution')) found = r;
      else if (seed === 40) found = r;
    }
    const executed = found.log.some((e) => e.abilityId === c.abilityId && e.kind === 'execution');
    const head = `${esc(c.name)} · ${esc(form?.name || '')} (stage ${p.stage + 1}) · ${TIERS[p.tier]} · natural battle`;
    const intro = `<div class="panel tight" data-rv2="explain"><div class="chip" style="margin:0 0 6px">▶ Natural battle: ordinary AI battles (both sides on the AI policy, nothing staged), seeds tried until the ability executed</div>
      <div class="dim" style="font-size:12px">${executed ? `Executed in battle seed ${found.seed} after ${tried} seed${tried === 1 ? '' : 's'} tried` : `Did not execute in ${tried} seeds: this ability needs a rare situation. ▶ Scenario demonstrates it directly.`} · 3v3 · ${found.exchanges} exchanges · side ${found.winner?.toUpperCase()} won by ${esc(found.by || '')}</div></div>`;
    openPlayer(c, { title: `${elementFx(c.element).glyph} ${c.name}`, head, intro, result: found, phases: [], ok: executed, abilityId: c.abilityId, natural: true, owner: 'a0' });
  }

  // ------------------------------------------------------------------------------------------------------------- the player
  function openPlayer(c, { title, head, intro, result, phases, ok, abilityId, natural = false, owner = null, run = null }) {
    const checklist = phases.length ? `<div class="panel tight" data-rv2="phases" style="margin-top:6px"><b>Phases</b>${phases.map((ph, i) => `<div class="rv2-phase" data-phase="${ph.id}" data-i="${i}" style="font-size:13px;margin-top:3px"><span class="rv2-box">☐</span> ${esc(ph.label)}${ph.seq != null ? ` <span class="dim" style="font-size:11px">· event #${ph.seq}</span>` : ''}<div class="dim rv2-ev" style="font-size:11px;display:none">${esc(ph.evidence || 'no evidence in the engine events')}</div></div>`).join('')}
      <div class="dim" data-rv2="verdict" style="font-size:12px;margin-top:4px">${ok ? 'Playing…' : 'Not every phase was observed (see above).'}</div></div>` : '';
    const controls = `<div class="row rv2-controls" style="gap:4px;flex-wrap:wrap;margin:6px 0">
        <button class="btn small" data-pb="toggle" aria-label="Pause">⏸</button><button class="btn small ghost" data-pb="replay" aria-label="Replay">↺</button>
        ${SPEEDS.map((s) => `<button class="btn small ghost" data-pb="speed" data-v="${s}" aria-label="Speed ${s}x">${s}×</button>`).join('')}
        <button class="btn small ghost" data-pb="event" aria-label="Next event">▸ Event</button><button class="btn small ghost" data-pb="turn" aria-label="Next turn">⏭ Turn</button><button class="btn small ghost" data-pb="exchange" aria-label="Next exchange">⏭ Exchange</button><button class="btn small ghost" data-pb="end" aria-label="To the end">⏩ End</button></div>`;
    const html = `<p class="muted" style="margin:0 0 6px">${head}</p>${intro}${checklist}
      <div class="crv-phase" data-rv2="fxphases" style="margin-top:6px"></div>
      <div class="dim" data-rv2="playinfo" style="font-size:12px;margin-top:6px"></div>
      <div id="clreview" class="cl-review-host"></div>${controls}
      <div class="dim mono" data-rv2="state" style="font-size:11px"></div>
      <div class="log" data-rv2="log" style="margin-top:6px;max-height:200px;overflow:auto"></div>
      <div class="sheet-review" style="margin-top:10px">${reviewHtml(NS, c.abilityId, { open: true })}</div>`;
    const { el, close } = sheet(html, { title, onClose: stop });
    bindReview(c, el.querySelector('.sheet-review'));
    const host = el.querySelector('#clreview'); const info = el.querySelector('[data-rv2="playinfo"]'); const logBox = el.querySelector('[data-rv2="log"]'); const stateBox = el.querySelector('[data-rv2="state"]');
    // The arena renders the engine record natively (t8 timeline + the ability's look; `looks` stays an override point); the reviewer
    // drives it through the player API. `subject` makes the reviewed ability the subject of the presentation layer.
    let arena = null; arena = st.arena = createArena(host, result, { speed: 1, quality: st.quality, reducedMotion: st.reducedMotion || !!app.settings?.reducedMotion, subject: abilityId, names: { a: 'Side A', b: 'Side B' }, edge: typeEdge, controls: false, looks: app.clashLooks || null, onCursor: () => draw(), onEnd: () => draw() });
    const rec = arena.record; const n = rec.log.length; const pb = st.pb = { speed: 1 };
    // the seven presentation phases of the look (the folded presentation check): evidence from the descriptors the arena draws from
    const ev = arena.t8 ? phaseEvidence(arena.t8, abilityId) : null;
    const fxBox = el.querySelector('[data-rv2="fxphases"]'); if (fxBox) fxBox.innerHTML = ev ? `<b style="font-size:11px">Look</b> ${PHASES.map((ph) => `<span class="${ev[ph] ? 'on' : ''}" title="${ph}">${ph}${ev[ph] === 'n/a' ? ' (n/a)' : ev[ph] ? ' ✓' : ' ✗'}</span>`).join('')}${result.provisional ? ' <span class="crv-prov">PROVISIONAL</span>' : ''}` : '';
    const ownerLine = owner ? [...result.lines.a, ...result.lines.b].find((x) => x.id === owner) : null;
    const ticked = (ph) => ph.ok && ph.seq != null && arena.cursor >= ph.seq;
    function draw() {
      if (!arena || !el.isConnected || st.arena !== arena) return; const i = arena.cursor; const e = rec.log[i]; const t8 = e?.t8 || e;
      info.innerHTML = `<b>Event ${i + 1} / ${n}</b> · exchange ${t8?.ex ?? 0} · turn ${t8?.turnIndex ?? 0} · ${esc(t8?.phase || '')} · ${pb.speed}×${arena.playing ? '' : ' · paused'}${t8?.abilityId === abilityId ? ' · <b>ability event</b>' : ''}`;
      const win = 18; const lo = Math.max(0, i - 6), hi = Math.min(n, lo + win);
      logBox.innerHTML = rec.log.slice(lo, hi).map((x, k) => { const j = lo + k; const mine = x.abilityId === abilityId; return `<div class="entry${j <= i ? '' : ' dim'}" style="${mine ? 'font-weight:700;' : ''}${j === i ? 'background:rgba(255,255,255,0.08);' : ''}${j <= i ? '' : 'opacity:0.45'}"><span class="t">#${j}</span><span>${x.t8?.stage ? `<span class="chip" style="font-size:9px;padding:0 4px">${esc(x.t8.stage)}</span> ` : ''}${esc(x.text || x.kind)}</span></div>`; }).join('');
      if (ownerLine) { const cur = result.ruleset === 't8' ? stateOfOwner(result, owner, i) : null; stateBox.innerHTML = `Subject ${esc(ownerLine.name)} (${esc(owner)}) · ability state now: ${stateText(cur?.ability)} · HP ${cur?.hp ?? '—'}${cur?.status ? ` · ${esc(cur.status.id)} (${cur.status.remaining})` : ''} · final: ${stateText(ownerLine.ability)}`; }
      el.querySelectorAll('.rv2-phase').forEach((row) => { const ph = phases[Number(row.dataset.i)]; const on = ticked(ph); row.querySelector('.rv2-box').textContent = on ? '✓' : ph.ok ? '☐' : '✗'; row.classList.toggle('ticked', on); row.querySelector('.rv2-ev').style.display = on || !ph.ok ? '' : 'none'; row.style.color = on ? 'var(--good)' : ph.ok ? '' : 'var(--bad)'; });
      const v = el.querySelector('[data-rv2="verdict"]'); if (v && ok && phases.length) { const all = phases.every(ticked); v.textContent = all ? 'Validated: every phase observed in the engine\'s events for this run (trigger, activation, resolution, cleanup).' : 'Playing… phases tick as playback reaches their engine events.'; v.dataset.done = all ? '1' : '0'; }
      el.querySelector('[data-pb="toggle"]').textContent = arena.playing ? '⏸' : '▶';
      el.querySelectorAll('[data-pb="speed"]').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === pb.speed));
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pb]'); if (!b) return; const a = b.dataset.pb; const cur = arena.cursor;
      if (a === 'toggle') { if (arena.playing) arena.pause(); else { if (cur >= n - 1) arena.setCursor(0); arena.play(); } }
      else if (a === 'replay') { arena.pause(); arena.setCursor(0); arena.play(); }
      else if (a === 'speed') { pb.speed = Number(b.dataset.v); arena.setSpeed(pb.speed); }
      else if (a === 'event') { arena.pause(); if (cur < n - 1) arena.playTo(cur + 1); }
      else if (a === 'turn') { arena.pause(); arena.playTo(nextTurnIndex(rec, cur)); }
      else if (a === 'exchange') { arena.pause(); arena.playTo(nextExchangeStart(rec, cur)); }
      else if (a === 'end') { arena.pause(); arena.setCursor(n - 1); }
      draw();
    });
    // Test hooks (browser checks, no gameplay use). __rv2 (tools/m4-integrate-check.mjs): seek the playback to an event index and draw
    // at once. __crv (tools/fx-clash-check.mjs): seek to a playback time t (seconds at 1x) to frame one presentation phase. Either seek
    // cancels the pending autoplay, so a check's frame is not overwritten by playback.
    let auto = 0; const noAuto = () => { if (auto) { clearTimeout(auto); auto = 0; } };
    host.__rv2 = { arena, phases, result, seek: (i) => { noAuto(); arena.pause(); arena.setCursor(Math.max(0, Math.min(n - 1, i))); draw(); }, natural };
    host.__crv = { arena, prep: { r: run || { result, meta: { provisional: !!result.provisional, scenarioId: natural ? 'natural' : null }, ok }, cues: arena.cues, state: arena.t8, ev }, seek: (t) => { noAuto(); arena.seek(t); draw(); }, close };
    draw(); auto = setTimeout(() => { auto = 0; if (st.arena === arena) arena.play(); }, 250);
  }
}

/** The subject's state after event i, from the engine's own per-event snapshots (ability state is only in the final line; HP and status come from the log). */
function stateOfOwner(result, id, i) {
  let hp = null, status = null; const line = [...result.lines.a, ...result.lines.b].find((x) => x.id === id);
  for (let k = 0; k <= i && k < result.log.length; k++) { const e = result.log[k]; if (e.actor === id && e.actorState) { hp = e.actorState.hp; status = e.actorState.status || null; } if (e.target === id && e.targetState) { hp = e.targetState.hp; status = e.targetState.status || null; } }
  return { hp: hp ?? line?.maxHp ?? null, status, ability: i >= result.log.length - 1 ? line?.ability ?? null : undefined };
}

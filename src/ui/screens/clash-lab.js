// Clash Lab: the Phase 1 developer area for Beast Clash. Reachable only from Developer Tools.
// Monsters here are generated from species data at a chosen overall; nothing is read from a save,
// and nothing here writes to one. Five views: Lineup, Replay, Batch, Load, Moves.
import { esc, delegate, toast } from '../dom.js';
import { monsterSprite } from '../pixel-monster.js';
import * as Clash from '../../clash/index.js';
import { runFamily, mergeRuns, gateBFamilies, syntheticMonster, ARCHETYPES } from '../../clash/batch.js';
import { createArena } from '../clash/arena.js';
import { GATE_PATCHES, gateConfig } from '../../clash/balance-manifest.js';

const V = Clash.CLASH_VALUES;
const COND_GLYPH = { burn: '🔥', chill: '❄️', daze: '💫', shock: '⚡' };
const ARCH_GLYPH = { Tank: '🛡', Striker: '⚔️', Support: '💚', Disruptor: '🌀', Balanced: '⚖️' };
const pct = (x) => `${Math.round(x * 1000) / 10}%`;

export function registerClashLab(Router, app) {
  const species = Clash.speciesList();
  const st = {
    view: 'lineup', seed: 1, overall: 65, a: ['emberfox', 'tidepaw', 'stormlynx'], b: ['pebble', 'ironjaw', 'glimmer'],
    config: { ruleset: V.rulesets.default, backRow: V.backRow.default, duration: V.duration.default, O1: false, O2: false, policies: { a: 'none', b: 'none' } },
    result: null, i: 0, speed: 1, fxQuality: 'full', arena: null, pickFor: null,
    batch: { family: 'Random mixed 3v3', n: 300, running: false, progress: 0, rows: [] },
    load: { fatigue: 20, battles: 2, plays: true, durability: 0.6, opening: false, profile: 'starter3' },
    moves: { filter: 'All', arch: 'All' },
  };
  const monstersFor = (ids, side) => ids.map((id, i) => syntheticMonster(id, { seed: st.seed * 97 + (side === 'a' ? 0 : 50) + i, overall: st.overall }));
  const run = () => {
    try { st.result = Clash.simulateClash({ a: monstersFor(st.a, 'a'), b: monstersFor(st.b, 'b'), seed: st.seed, config: st.config }); st.i = 0; stop(); st.view = 'replay'; }
    catch (e) { toast(e.message, 'error'); }
  };
  // The arena (src/ui/clash/arena.js) plays the record; the Lab only mounts it and keeps the cursor across re-renders.
  const stop = () => { if (st.arena) { st.i = st.arena.cursor; st.arena.destroy(); st.arena = null; } };
  const mountArena = (host) => { if (!st.result || !host) return; st.arena = createArena(host, st.result, { speed: st.speed, quality: st.fxQuality, reducedMotion: app.settings?.reducedMotion, onCursor: (i) => { st.i = i; }, onQuality: (q) => { st.fxQuality = q; } }); if (st.i) st.arena.setCursor(st.i); };
  // ---------- views
  const header = () => {
    const tabs = [['lineup', 'Lineup'], ['replay', 'Replay'], ['batch', 'Batch'], ['load', 'Load'], ['moves', 'Moves']];
    const exp = Clash.activeExperiments(st.config);
    const inForce = settingsInForce(exp);
    // In the replay view the arena owns the screen: the settings line moves into the collapsed "Stats and settings" panel.
    return `<div class="chips" style="margin:0 0 8px">${tabs.map(([v, l]) => `<button class="chip ${st.view === v ? 'on accent' : ''}" data-action="view" data-v="${v}">${l}</button>`).join('')}</div>${st.view === 'replay' && st.result ? '' : inForce}`;
  };
  const settingsInForce = (exp) => `<div class="panel tight ${exp.length ? 'warn' : ''}" style="margin-bottom:8px;font-size:12px"><b>Settings in force:</b> back row ${esc(st.config.backRow)} · duration ${esc(st.config.duration)} · Shock ${Math.round(V.shock.chance[0] * 100)}–${Math.round(V.shock.chance[1] * 100)}% every ${V.shock.every}nd strike · cap ${V.battle.exchangeCap} · values ${V.version} · ruleset ${esc(V.rulesets[st.config.ruleset || V.rulesets.default].label)}${exp.length ? `<br><b>Lab experiments ON (not part of the permanent game):</b> ${esc(exp.join(', '))}` : (st.config.ruleset === 'v1.0.0' ? '<br>No experiments on (historical values 1.0.0 game).' : '<br>No experiments on: this is the permanent game (values 1.1.0).')}</div>`;
  const chip = (key, v, label, cur) => `<button class="chip ${cur === v ? 'on accent' : ''}" data-action="${key}" data-v="${v}">${esc(label)}</button>`;
  const settings = () => `<div class="panel" style="margin-top:8px"><b>Lab switches</b><div class="dim" style="font-size:11px">The permanent game is values 1.1.0 with no switch on. Every switch below is an inactive Lab experiment (or a historical replay) unless marked approved; none changes the game's defaults. The log says when one changes a number.</div>
      <div style="margin-top:6px;font-size:12px">Ruleset</div><div class="chips">${['current', 'v1.0.0'].map((k) => chip('ruleset', k, V.rulesets[k].label, st.config.ruleset || V.rulesets.default)).join('')}</div>
      <div style="margin-top:6px;font-size:12px">Back row (provisional, Test E is the Gate A baseline)</div><div class="chips">${Object.keys(V.backRow.tests).map((k) => chip('backRow', k, k, st.config.backRow)).join('')}</div>
      <div class="dim" style="font-size:11px">${esc(V.backRow.tests[st.config.backRow].label)}</div>
      <div style="margin-top:6px;font-size:12px">Defensive duration (approved: C6 is permanent; F was the values 1.0.0 rule; R2 is an inactive experiment)</div><div class="chips">${Object.keys(V.duration.models).map((k) => chip('duration', k, k, st.config.duration)).join('')}</div>
      <div class="dim" style="font-size:11px">${esc(V.duration.models[st.config.duration].label)}</div>
      <div style="margin-top:6px;font-size:12px">5v5 structural options (experimental, all OFF by default)</div><div class="chips">${chip('o', 'none', 'None', st.config.O1 ? (st.config.O2 ? 'O3' : 'O1') : st.config.O2 ? 'O2' : 'none')}${chip('o', 'O1', 'O1 heal stacking', st.config.O1 && !st.config.O2 ? 'O1' : '')}${chip('o', 'O2', 'O2 Tank HP +6%', st.config.O2 && !st.config.O1 ? 'O2' : '')}${chip('o', 'O3', 'O3 both', st.config.O1 && st.config.O2 ? 'O3' : '')}</div>
      <div style="margin-top:6px;font-size:12px">Voluntary swap cost (approved: half is permanent; action was the values 1.0.0 rule; free is an inactive experiment)</div><div class="chips">${Object.keys(V.experiments.swapCost.options).map((k) => chip('swapCost', k, k, st.config.swapCost || V.experiments.swapCost.default)).join('')}</div>
      <div style="margin-top:6px;font-size:12px">Gate B.1 investigation: Model E sudden-death start (experimental, default 12)</div><div class="chips">${V.experiments.sdFromE.options.map((k) => chip('sdFromE', String(k), k === 99 ? 'never' : String(k), String(st.config.sdFromE || V.experiments.sdFromE.default))).join('')}</div>
      <div style="margin-top:6px;font-size:12px">Historical gate configurations (balance manifest; loads the values 1.0.0 ruleset, duration, swap cost and patches exactly as each gate was measured; Lab only)</div><div class="chips">${chip('gatePreset', 'defaults', 'Permanent game (1.1.0)', '')}${Object.keys(GATE_PATCHES).map((g) => chip('gatePreset', g, `${g} (${GATE_PATCHES[g].length})`, '')).join('')}</div>
      <div style="margin-top:6px;font-size:12px">Candidate move patches (inactive Lab experiments, none on by default; tap to toggle). ✓ = implemented in values 1.1.0 (already in the permanent table); ✕ = declined (history replay only)</div><div class="chips">${Object.entries(V.movePatches).filter(([, v]) => v && typeof v === 'object').map(([k, v]) => `<button class="chip ${(st.config.patches || []).includes(k) ? 'on accent' : ''}" data-action="patch" data-v="${k}" title="${esc(v.label)}">${v.implemented ? '✓ ' : v.declined ? '✕ ' : ''}${esc(k)}</button>`).join('')}</div>
      <div class="dim" style="font-size:11px">${(st.config.patches || []).map((k) => esc(V.movePatches[k].label)).join('; ') || 'No patches on.'}</div>
      <div style="margin-top:6px;font-size:12px">Swap policies (closed list)</div><div class="row" style="gap:6px;flex-wrap:wrap">A: ${Clash.POLICIES.map((p) => chip('polA', p, p, st.config.policies.a)).join('')}</div><div class="row" style="gap:6px;flex-wrap:wrap">B: ${Clash.POLICIES.map((p) => chip('polB', p, p, st.config.policies.b)).join('')}</div></div>`;

  function lineupView() {
    const side = (key) => { const ids = st[key]; const ms = monstersFor(ids, key); const cs = ms.map((m, i) => { try { return Clash.buildCombatant(m, { perSide: Math.max(st.a.length, st.b.length), config: Clash.battleConfig(st.config), slot: i, side: key }); } catch { return null; } });
      return `<div class="panel"><div class="row between"><b>Side ${key.toUpperCase()}</b><span class="dim">${ids.length} of 5</span></div><div class="list" style="margin-top:6px">${ms.map((m, i) => { const c = cs[i]; return `<div class="item static" style="min-height:0;padding:6px 8px">${monsterSprite(m, 34)}<div class="grow" style="font-size:12px"><div><b>${esc(m.name)}</b> <span class="dim">${esc(c?.speciesName || m.species)} · ${ARCH_GLYPH[c?.archetype]} ${esc(c?.archetype)} · ${esc(c?.type)}</span></div><div class="dim">HP ${c?.hp} · ATK ${c?.atk} · SPD ${c?.spd} · OVR ${c?.overall} · <i>${esc(c?.move.name)}</i></div></div><button class="btn small" data-action="stats" data-side="${key}" data-i="${i}">Stats</button><button class="btn small ghost" data-action="remove" data-side="${key}" data-i="${i}">✕</button></div>`; }).join('')}</div>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">${ids.length < 5 ? `<button class="btn small" data-action="pick" data-side="${key}">+ Add species</button>` : ''}<button class="btn small" data-action="auto" data-side="${key}">Auto lineup</button><button class="btn small ghost" data-action="clear" data-side="${key}">Clear</button></div></div>`; };
    return `<p class="muted">Pick 1–5 species per side, an overall and a seed, then run. Monsters are generated from species data; nothing is loaded from a save.</p>
      <div class="grid2"><label class="field">Overall<input type="number" min="40" max="90" value="${st.overall}" data-change="overall" style="min-height:36px"></label><label class="field">Seed<input type="number" value="${st.seed}" data-change="seed" style="min-height:36px"></label></div>
      ${side('a')}${side('b')}
      ${st.pickFor ? picker() : ''}
      <button class="btn primary big block" data-action="run" style="margin-top:8px">▶ Run the battle</button>
      <div class="row" style="gap:6px;margin-top:6px"><button class="btn small" data-action="paste">Paste a replay key</button><button class="btn small" data-action="swapSides">Swap sides</button></div>
      ${settings()}`;
  }
  function picker() {
    return `<div class="panel" style="margin-top:8px"><div class="row between"><b>Add to side ${st.pickFor.toUpperCase()}</b><button class="btn small ghost" data-action="pickClose">Close</button></div>
      <div class="chips" style="margin:6px 0">${['All', ...ARCHETYPES].map((a) => chip('pickArch', a, a, st.moves.arch)).join('')}</div>
      <div class="list" style="max-height:320px;overflow:auto">${species.filter((s) => st.moves.arch === 'All' || s.archetype === st.moves.arch).map((s) => `<button class="item" style="min-height:0;padding:6px 8px" data-action="pickOne" data-id="${s.id}"><div class="grow" style="font-size:12px"><b>${esc(s.name)}</b> <span class="dim">${esc(s.id)} · ${ARCH_GLYPH[s.archetype]} ${esc(s.archetype)} · ${esc(s.element)} · ${esc(s.rarity)}${s.position === 'K' ? ' · kicker' : ''}</span><div class="dim"><i>${esc(s.move)}</i></div></div></button>`).join('')}</div></div>`;
  }
  function statsSheet(key, i) {
    const m = monstersFor(st[key], key)[i]; const c = Clash.buildCombatant(m, { perSide: Math.max(st.a.length, st.b.length), config: Clash.battleConfig(st.config), slot: i, side: key }); const b = c.breakdown;
    const row = (k, v) => `<tr><td>${esc(k)}</td><td class="mono" style="text-align:right">${esc(String(v))}</td></tr>`;
    return `<div class="panel" style="margin-top:8px"><div class="row between"><b>${esc(m.name)}: how the engine builds its stats</b><button class="btn small ghost" data-action="statsClose">Close</button></div>
      <table class="compare" style="font-size:12px;width:100%"><tbody>
      ${row('1. Overall from effective attributes (nature + fatigue once)', `${b.overall} (fatigue ${c.fatigue}, nature ${c.nature}, stage ${c.stage})`)}
      ${row('2. Base HP = 28 + 0.85 × overall', b.hpBase.toFixed(2))}${row('   Durability tilt', b.durabilityTilt.toFixed(3))}${row('   Archetype HP ×', b.archetype.hp)}${row('   O2 Tank HP ×', b.o2)}${row('   Battle HP', c.hp)}
      ${row('3. Base attack = 6 + 0.22 × overall', b.atkBase.toFixed(2))}${row('   Strength tilt', b.strengthTilt.toFixed(3))}${row('   Archetype attack ×', b.archetype.atk)}${row('   Battle attack', c.atk)}
      ${row('4. Speed', c.spd)}${row('5. Guard in front (Tank 0.88 unless pierced)', c.guard)}${row('Move', `${c.move.name} (${c.move.kind})`)}</tbody></table>
      <div class="dim" style="font-size:11px">These are the engine's own numbers for this battle; the Lab reads them from the combatant it fights with.</div></div>`;
  }

  function replayView() {
    const r = st.result; if (!r) return `<p class="muted">No battle yet. Set a lineup and press Run.</p>${lineupView()}`;
    return `<div id="cl-arena-host"></div>
      <details class="panel tight" style="margin-top:8px"><summary class="muted">Result and replay key</summary><div style="font-size:12px;margin-top:4px"><b>${esc(r.log[r.log.length - 1].text)}</b> Decided by ${r.by === 'knockout' ? 'knockout' : r.by === 'hp' ? `HP share (${pct(r.hpShare.a)} v ${pct(r.hpShare.b)})` : 'a seeded coin flip after an exact HP tie'}.${r.capped ? ' Reached the exchange cap.' : ''}</div>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn small" data-action="copyKey">Copy replay key</button><button class="btn small" data-action="copyLog">Copy log</button><button class="btn small" data-action="xp">XP for this battle</button><button class="btn small ghost" data-action="view" data-v="lineup">Back to lineup</button></div>${st.xpOpen ? xpPanel() : ''}</details>
      <details class="panel tight" style="margin-top:6px"><summary class="muted">Full log (${r.log.length} events)</summary><div style="font-size:11px;max-height:300px;overflow:auto;margin-top:4px">${r.log.map((ev) => `<div><span class="dim">${ev.ex}</span> ${esc(ev.text)}</div>`).join('')}</div></details>
      <details class="panel tight" style="margin-top:6px"><summary class="muted">Stats and settings</summary><div style="margin-top:6px">${settingsInForce(Clash.activeExperiments(st.config))}</div>${r.lines.a.concat(r.lines.b).map((x) => `<div class="row between" style="font-size:12px"><span>${esc(x.name)} <span class="dim">${esc(x.archetype)} · ${esc(x.type)}</span></span><span class="mono">HP ${x.maxHp} · ATK ${x.combatant.atk} · SPD ${x.combatant.spd}</span></div>`).join('')}${settings()}</details>`;
  }
  function xpPanel() { const r = st.result; const xa = Clash.battleXp(r, 'a'), xb = Clash.battleXp(r, 'b'); const row = (L, X) => L.map((x) => `<div class="row between" style="font-size:12px"><span>${esc(x.name)}</span><span class="mono">${X[x.id]} XP</span></div>`).join('');
    return `<div class="panel" style="margin-top:8px"><b>Arena XP, Model C2 (P1 formula; nothing is awarded)</b><div class="dim" style="font-size:11px">9 × (0.4 + 0.6 × share) × win 1.15 / loss 0.85 × overall gap. Session battle k earns ×${V.xp.diminishing.join(', ×')}; last game's starters earn one-third.</div><div style="margin-top:4px"><b>Side A</b>${row(r.lines.a, xa)}<b>Side B</b>${row(r.lines.b, xb)}</div></div>`; }

  function batchView() {
    const B = st.batch; const fams = batchFamilies();
    return `<p class="muted">Runs many seeded battles with the settings in force and shows win rates with 95% intervals. Same seeds, lineups and settings give the same numbers as <code>npm run clash:balance</code>.</p>
      <label class="field">Family<select data-change="family">${fams.map((f) => `<option value="${f.label}" ${B.family === f.label ? 'selected' : ''}>${esc(f.label)}</option>`).join('')}</select></label>
      <div class="grid2"><label class="field">Battles<input type="number" min="20" max="5000" value="${B.n}" data-change="batchN" style="min-height:36px"></label><button class="btn primary big" data-action="runBatch" ${B.running ? 'disabled' : ''}>${B.running ? `Running… ${B.progress}%` : '▶ Run batch'}</button></div>
      ${settings()}
      ${B.rows.map((r) => batchRow(r)).join('')}`;
  }
  const batchRow = (r) => { const A = (k) => (r.archetypes[k] ? `${r.archetypes[k].rate[0]}% <span class="dim">(${r.archetypes[k].rate[1]}–${r.archetypes[k].rate[2]})</span>` : '–'); const p = new Proxy(r.perBattle || {}, { get: (o, k) => (k in o ? o[k] : '–') }); const flag = (k) => r.archetypes[k] && (r.archetypes[k].rate[1] > 55 || r.archetypes[k].rate[2] < 45) ? ' style="color:var(--warn)"' : '';
    return `<div class="panel" style="margin-top:8px;font-size:12px"><div class="row between"><b>${esc(r.label)}</b><span class="dim">${r.family.n} battles · back row ${esc(r.family.config.backRow || V.backRow.default)} · ${esc(r.family.config.duration || V.duration.default)}${r.family.config.O1 || r.family.config.O2 ? ` · ${r.family.config.O1 && r.family.config.O2 ? 'O3' : r.family.config.O1 ? 'O1' : 'O2'}` : ''}</span></div>
      <div class="row between"><span>Side A wins</span><span class="mono">${r.aWin[0]}% (${r.aWin[1]}–${r.aWin[2]})</span></div>
      ${ARCHETYPES.map((k) => `<div class="row between"${flag(k)}><span>${ARCH_GLYPH[k]} ${k}</span><span class="mono">${A(k)}</span></div>`).join('')}
      <div class="row between"><span>Exchanges mean / median / p90 / p95</span><span class="mono">${r.length.mean} / ${r.length.median} / ${r.length.p90} / ${r.length.p95}</span></div>
      <div class="row between"><span>Reached the cap</span><span class="mono">${r.capPct}%</span></div>
      <div class="row between"><span>Decided by knockout / HP share / coin</span><span class="mono">${r.by.knockout} / ${r.by.hp} / ${r.by.coin}</span></div>
      <div class="row between"><span>Bench actions per battle: attempts / landed / blocked</span><span class="mono">${p.benchActs} / ${p.benchHits} / ${p.benchBlocked}</span></div>
      <div class="row between"><span>Forced swaps / refused / arrival damage</span><span class="mono">${p.forcedSwaps} / ${p.swapRefused} / ${p.arrivalDamage}</span></div>
      <div class="row between"><span>Shock attempts / landed / refreshed / actions skipped</span><span class="mono">${p.shockAttempts} / ${p.shockApplied} / ${p.shockReplaced} / ${p.shockSkips}</span></div>
      <div class="row between"><span>Reached sudden death · resolved there by KO / HP</span><span class="mono">${r.suddenDeath ? `${r.suddenDeath.reachedPct}% · ${r.suddenDeath.resolvedKo} / ${r.suddenDeath.resolvedHp}` : '–'}</span></div>
      <div class="row between"><span>Healing + shields per battle</span><span class="mono">${p.heal} + ${p.shield}</span></div>
      <div class="row between"><span>Knockouts per battle${r.family.config.duration === 'C6' ? ' · stalemate exchanges' : ''}</span><span class="mono">${p.kos}${r.family.config.duration === 'C6' ? ` · ${p.stalemate}` : ''}</span></div>
      <div class="dim" style="font-size:11px">Orange: the whole 95% interval is outside 45–55%. Phase 1 engine result on synthetic monsters; targets are judged at Gate B.</div></div>`; };
  // The Batch screen offers the Gate A families plus every Gate B plan family (same labels, same chunked seeds as
  // tools/clash-gateb.mjs), so a number in the Gate B report can be reproduced here with the matching switches.
  function batchFamilies() { const T5 = Array(5).fill('Tank'), S5 = Array(5).fill('Support'); const seen = new Set(); return [
    { label: 'Random mixed 3v3', a: 'random', b: 'random', size: 3, overall: 62, overallSpread: 7 }, { label: 'Random mixed 5v5', a: 'random', b: 'random', size: 5, overall: 62, overallSpread: 7 },
    { label: 'Strikers v Supports 3v3', a: 'Striker', b: 'Support', size: 3 }, { label: 'Tanks v Strikers 3v3', a: 'Tank', b: 'Striker', size: 3 }, { label: 'Disruptors v Tanks 5v5', a: 'Disruptor', b: 'Tank', size: 5 }, { label: 'Supports v Tanks 5v5', a: 'Support', b: 'Tank', size: 5 },
    { label: '5 Supports mirror', a: S5, b: S5, size: 5 }, { label: '5 Tanks mirror', a: T5, b: T5, size: 5 }, { label: '3 Tanks + 2 Supports mirror', a: ['Tank', 'Tank', 'Tank', 'Support', 'Support'], b: ['Tank', 'Tank', 'Tank', 'Support', 'Support'], size: 5 },
    { label: 'Mixed defense v 5 Strikers', a: 'mixedDefense', b: 'Striker', size: 5 }, { label: 'Mixed defense v 5 Disruptors', a: 'mixedDefense', b: 'Disruptor', size: 5 },
    ...gateBFamilies().map(({ configs, section, label, ...f }) => ({ ...f, label: `Gate B · ${section} · ${label}`, gateB: true })).filter((f) => !seen.has(f.label) && seen.add(f.label)),
    { label: 'Current lineup A v B', a: null, b: null, size: 0 }]; }
  async function runBatch() {
    const B = st.batch; const f = batchFamilies().find((x) => x.label === B.family); if (!f || B.running) return; B.running = true; B.progress = 0; Router.render();
    const n = Math.max(20, Math.min(5000, Number(B.n) || 300)); const chunk = 50; const parts = [];
    // Run in chunks that yield to the screen; the seed per chunk is derived from the batch seed so the total equals one headless run of the same chunks.
    for (let done = 0; done < n; done += chunk) {
      const k = Math.min(chunk, n - done);
      const fam = f.size ? { ...f, n: k, seed: 4242 + done, config: st.config, overall: f.overall || st.overall } : null;
      const r = fam ? runFamily(fam) : runCurrent(k, 4242 + done);
      parts.push(r); B.progress = Math.round((done + k) / n * 100); Router.render();
      await new Promise((res) => setTimeout(res, 0));
    }
    B.rows.unshift({ label: B.family, ...merge(parts) }); B.running = false; Router.render();
  }
  function runCurrent(n, seed) { // the lineup on screen, sides alternated, seeds from `seed`
    const rng = { seed: (() => { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0); })() };
    let aWins = 0, capped = 0; const lengths = []; const by = { knockout: 0, hp: 0, coin: 0 }; const arch = {};
    for (let i = 0; i < n; i++) { const swap = i % 2 === 1; const A = monstersFor(st.a, 'a'), Bm = monstersFor(st.b, 'b'); const r = Clash.simulateClash({ a: swap ? Bm : A, b: swap ? A : Bm, seed: rng.seed(), config: st.config }); if ((swap ? r.winner === 'b' : r.winner === 'a')) aWins++; lengths.push(r.exchanges); if (r.capped) capped++; by[r.by]++;
      for (const [side, L] of [['a', r.lines.a], ['b', r.lines.b]]) for (const x of L) { const o = (arch[x.archetype] ||= [0, 0]); o[1]++; if (r.winner === side) o[0]++; } }
    lengths.sort((p, q) => p - q); const q = (p) => lengths[Math.min(n - 1, Math.floor(n * p))];
    const hist = {}; for (const L of lengths) hist[L] = (hist[L] || 0) + 1;
    return { family: { n, config: st.config }, aWin: wilsonLocal(aWins, n), aWins, n, species: {}, tallies: {}, suddenDeath: { reachedPct: 0, resolvedKo: 0, resolvedHp: 0 }, archetypes: Object.fromEntries(Object.entries(arch).map(([k, [w, t]]) => [k, { rate: wilsonLocal(w, t), wins: w, n: t }])), length: { mean: Math.round(lengths.reduce((s, x) => s + x, 0) / n * 10) / 10, median: q(0.5), p90: q(0.9), p95: q(0.95), hist }, capPct: Math.round(capped / n * 1000) / 10, by, perBattle: {} };
  }
  const wilsonLocal = (w, n) => { if (!n) return [0, 0, 0]; const p = w / n, z = 1.96, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d; return [100 * p, 100 * (c - h), 100 * (c + h)].map((v) => Math.round(v * 10) / 10); };
  // Chunks are merged by the same mergeRuns the Gate B tool uses, so the Lab's row equals the headless report's row.
  const merge = (parts) => mergeRuns(parts);


  function loadView() {
    const L = st.load; const w = Clash.battleWarning({ fatigue: L.fatigue, battlesPlayed: L.battles, plays: L.plays, durability: L.durability, opening: L.opening });
    const profiles = { starter0: { label: 'Starter, football only', battles: 0, plays: true }, backup3: { label: 'Backup, 3 Arena battles', battles: 3, plays: false }, starter3: { label: 'Starter, 3 battles + Sunday', battles: 3, plays: true }, starter7: { label: 'Starter, 7 battles + Sunday', battles: 7, plays: true }, open5: { label: 'Arena 5 + opening Clash', battles: 5, plays: false, opening: true }, all: { label: 'Arena 3 + opening + Sunday + overtime', battles: 3, plays: true, opening: true, overtime: true }, inj: { label: 'Starter, 3 battles, injured weeks 4-5', battles: 3, plays: true, injuredWeeks: [4, 5] }, bye4: { label: 'Starter, 3 battles, bye in week 4', battles: 3, plays: true, byeWeek: 4 } };
    const rows = Clash.projectSeason(profiles[L.profile]);
    const lvl = { calm: 'good', caution: 'warn', high: 'bad' }[w.level];
    return `<p class="muted">Fatigue projections, injury chances and the player warning, from synthetic inputs (P1 formula). Nothing here touches a franchise.</p>
      <div class="panel"><b>Before the next Arena battle</b>
        <div class="grid2" style="margin-top:6px"><label class="field">Fatigue now<input type="number" min="0" max="100" value="${L.fatigue}" data-change="lf" style="min-height:36px"></label><label class="field">Battles played today<input type="number" min="0" max="7" value="${L.battles}" data-change="lb" style="min-height:36px"></label></div>
        <div class="row" style="gap:10px;flex-wrap:wrap;font-size:12px"><label class="row" style="gap:4px"><input type="checkbox" data-change="lplays" ${L.plays ? 'checked' : ''} style="width:auto;min-height:0"> Starts Sunday</label><label class="row" style="gap:4px"><input type="checkbox" data-change="lopen" ${L.opening ? 'checked' : ''} style="width:auto;min-height:0"> Opening Clash</label><label class="row" style="gap:4px">Durability <input type="number" min="0" max="1" step="0.05" value="${L.durability}" data-change="ldur" style="width:64px;min-height:32px"></label></div>
        <div class="panel tight" style="margin-top:8px;border-color:var(--${lvl})"><span class="chip ${lvl}">${esc(w.level)}</span> <span style="font-size:13px">${esc(w.text)}</span>
          <div class="dim" style="font-size:11px;margin-top:4px">Kickoff fatigue ${w.kickoffWithout} → ${w.kickoffWith} · Sunday injury ${pct(w.sundayInjuryWithout)} → ${pct(w.sundayInjuryWith)} · this battle ${pct(w.thisBattleInjury)} · ${w.allowed ? `${w.maxBattles - w.battlesPlayed} of ${w.maxBattles} battles left` : 'no battles left today'}${w.confirm ? ' · asks once per monster per session' : ''}</div></div></div>
      <div class="panel" style="margin-top:8px"><b>Ten-week projection</b><select data-change="lprofile" style="margin-top:4px">${Object.entries(profiles).map(([k, p]) => `<option value="${k}" ${L.profile === k ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select>
        <div style="overflow:auto;margin-top:6px"><table class="compare" style="font-size:11px;width:100%"><thead><tr><th>Wk</th><th>Mon</th><th>Arena</th><th>Practice</th><th>Sat</th><th>Kickoff</th><th>Sun</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.week}${r.bye ? ' bye' : ''}${r.injured ? ' inj' : ''}</td><td>${r.monday}</td><td>${r.afterArena}</td><td>${r.afterPractice}</td><td>${r.afterSaturday ?? '–'}</td><td>${r.kickoff ?? '–'}</td><td>${r.afterSunday}</td></tr>`).join('')}</tbody></table></div>
        <div class="dim" style="font-size:11px">Monday −${V.load.monday}; Arena +${V.load.battle} per battle; practice +${V.load.practice}; Saturday −(${V.load.saturdayBase} + ${V.load.saturdayExtra} × excess); game +${V.load.game}; bye −${V.load.bye}. Phase 2b compares these to the real day functions.</div></div>`;
  }

  function movesView() {
    const M = st.moves; const problems = Clash.validateMoves();
    const list = species.filter((s) => (M.arch === 'All' || s.archetype === M.arch) && (M.filter === 'All' || s.element === M.filter));
    const elements = ['All', ...new Set(species.map((s) => s.element))];
    return `<p class="muted">All 72 moves: ID, display name, archetype, card text and the numbers the engine uses. ${problems.length ? `<b style="color:var(--bad)">${problems.length} validation problems.</b>` : '<b style="color:var(--good)">72 of 72 validate; every card matches its numbers.</b>'}</p>
      ${problems.length ? `<div class="panel tight warn" style="font-size:12px">${problems.map((p) => esc(p)).join('<br>')}</div>` : ''}
      <div class="chips" style="margin:6px 0">${['All', ...ARCHETYPES].map((a) => chip('march', a, a, M.arch)).join('')}</div>
      <div class="chips" style="margin:0 0 8px">${elements.map((e) => chip('mel', e, e, M.filter)).join('')}</div>
      <div class="list">${list.map((s) => { const m = Clash.CLASH_MOVES[s.id]; const nums = Object.entries(m).filter(([k, v]) => !['name', 'archetype', 'text', 'kind', 'trigger'].includes(k)).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
        return `<div class="item static" style="min-height:0;padding:6px 8px;align-items:flex-start"><div class="grow" style="font-size:12px"><div><b>${esc(m.name)}</b> <span class="dim">${esc(s.name)} (${esc(s.id)}) · ${ARCH_GLYPH[m.archetype]} ${esc(m.archetype)} · ${esc(s.element)}${s.position === 'K' ? ' · kicker' : ''}</span></div><div>${esc(m.text)}</div><div class="dim" style="font-size:11px">${esc(m.kind)} · ${esc(m.trigger.kind)}${m.trigger.n ? ` ${m.trigger.n}` : ''} · ${esc(nums)}</div></div></div>`; }).join('')}</div>`;
  }

  // ---------- screen
  Router.registerScreen('clash-lab', {
    title: 'Clash Lab', tabs: false,
    render() { const body = { lineup: lineupView, replay: replayView, batch: batchView, load: loadView, moves: movesView }[st.view](); return header() + body + (st.statsOpen ? statsSheet(st.statsOpen.side, st.statsOpen.i) : ''); },
    mount(root) {
      delegate(root, {
        view: (el) => { stop(); st.view = el.dataset.v; st.statsOpen = null; if (el.dataset.v !== 'replay') st.i = 0; Router.render(); },
        backRow: (el) => { stop(); st.config.backRow = el.dataset.v; Router.render(); }, duration: (el) => { st.config.duration = el.dataset.v; Router.render(); },
        swapCost: (el) => { stop(); st.config.swapCost = el.dataset.v; Router.render(); }, sdFromE: (el) => { stop(); st.config.sdFromE = Number(el.dataset.v); Router.render(); },
        gatePreset: (el) => { stop(); const g = el.dataset.v; if (g === 'defaults') { st.config = { ruleset: V.rulesets.default, backRow: V.backRow.default, duration: V.duration.default, O1: false, O2: false, policies: st.config.policies }; } else { const c = gateConfig(g); st.config = { ruleset: c.ruleset, backRow: c.backRow, duration: c.duration, O1: c.O1, O2: c.O2, policies: st.config.policies, swapCost: c.swapCost, sdFromE: c.sdFromE, patches: [...c.patches] }; } toast(g === 'defaults' ? 'Permanent game (values 1.1.0) loaded' : `${g} configuration loaded`); Router.render(); },
        ruleset: (el) => { stop(); const r = el.dataset.v; const rs = V.rulesets[r]; st.config = { ...st.config, ruleset: r, duration: rs.duration, swapCost: rs.swapCost, patches: (st.config.patches || []).filter((k) => r === 'v1.0.0' || !V.movePatches[k].declined) }; toast(`${rs.label} loaded`); Router.render(); },
        patch: (el) => { stop(); if (V.movePatches[el.dataset.v]?.declined && (st.config.ruleset || V.rulesets.default) !== 'v1.0.0') { toast('Declined by the owner: it can only be replayed under the values 1.0.0 ruleset'); return; } const set = new Set(st.config.patches || []); if (set.has(el.dataset.v)) set.delete(el.dataset.v); else set.add(el.dataset.v); st.config.patches = [...set].sort(); Router.render(); },
        o: (el) => { const v = el.dataset.v; st.config.O1 = v === 'O1' || v === 'O3'; st.config.O2 = v === 'O2' || v === 'O3'; Router.render(); },
        polA: (el) => { stop(); st.config.policies.a = el.dataset.v; Router.render(); }, polB: (el) => { st.config.policies.b = el.dataset.v; Router.render(); },
        pick: (el) => { st.pickFor = el.dataset.side; Router.render(); }, pickClose: () => { st.pickFor = null; Router.render(); }, pickArch: (el) => { st.moves.arch = el.dataset.v; Router.render(); },
        pickOne: (el) => { if (st[st.pickFor].length < 5) st[st.pickFor].push(el.dataset.id); st.pickFor = null; Router.render(); },
        remove: (el) => { st[el.dataset.side].splice(Number(el.dataset.i), 1); Router.render(); }, clear: (el) => { st[el.dataset.side] = []; Router.render(); },
        auto: (el) => { const side = el.dataset.side; const seedRng = makeRng(st.seed * 31 + (side === 'a' ? 1 : 2)); const pool = species.map((s) => ({ species: s.id, archetype: s.archetype, type: s.element, overall: st.overall + seedRng.int(6) })); const n = Math.max(1, st[side].length || 3); st[side] = Clash.chooseLineup(pool, n, seedRng).map((x) => x.species); Router.render(); },
        swapSides: () => { [st.a, st.b] = [st.b, st.a]; Router.render(); },
        run: () => { if (!st.a.length || !st.b.length) { toast('Each side needs at least one monster', 'error'); return; } run(); Router.render(); },
        stats: (el) => { st.statsOpen = { side: el.dataset.side, i: Number(el.dataset.i) }; Router.render(); }, statsClose: () => { st.statsOpen = null; Router.render(); },
        copyKey: async () => { try { await navigator.clipboard.writeText(st.result.replayKey); toast('Replay key copied'); } catch { toast('Copy failed; the key is in the log panel', 'error'); } },
        copyLog: async () => { try { await navigator.clipboard.writeText(st.result.log.map((e) => `${e.ex}\t${e.kind}\t${e.text}`).join('\n')); toast('Log copied'); } catch { toast('Copy failed', 'error'); } },
        paste: async () => { let line = ''; try { line = await navigator.clipboard.readText(); } catch { line = prompt('Paste the replay key') || ''; } if (!line) return; try { const k = Clash.parseReplayKey(line.trim()); st.result = Clash.simulateClash({ a: k.a, b: k.b, seed: k.seed, config: k.config }); st.config = { ...k.config, policies: { ...k.config.policies } }; st.a = k.a.map((m) => m.species); st.b = k.b.map((m) => m.species); st.seed = k.seed; st.i = 0; st.view = 'replay'; toast('Battle rebuilt from the key'); } catch (e) { toast(e.message, 'error'); } Router.render(); },
        xp: () => { st.xpOpen = !st.xpOpen; Router.render(); },
        runBatch: () => runBatch(), march: (el) => { st.moves.arch = el.dataset.v; Router.render(); }, mel: (el) => { st.moves.filter = el.dataset.v; Router.render(); },
      });
      root.addEventListener('change', (ev) => { const k = ev.target.dataset.change; if (!k) return; const v = ev.target.value;
        if (k === 'overall') st.overall = Math.max(40, Math.min(90, Number(v) || 65)); if (k === 'seed') st.seed = Number(v) || 1; if (k === 'family') st.batch.family = v; if (k === 'batchN') st.batch.n = Number(v) || 300;
        if (k === 'lf') st.load.fatigue = Number(v) || 0; if (k === 'lb') st.load.battles = Number(v) || 0; if (k === 'lplays') st.load.plays = ev.target.checked; if (k === 'lopen') st.load.opening = ev.target.checked; if (k === 'ldur') st.load.durability = Number(v) || 0.6; if (k === 'lprofile') st.load.profile = v;
        if (k !== 'scrub') Router.render(); });
      root.classList.toggle('cl-wide', st.view === 'replay');
      if (st.view === 'replay') mountArena(root.querySelector('#cl-arena-host'));
    },
    unmount() { stop(); st.i = 0; },
  });
}
// A tiny seeded generator for Lab-only choices (Auto lineup), separate from the engine's.
function makeRng(seed) { let s = seed >>> 0; const next = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; return { next, int: (n) => Math.floor(next() * n) }; }

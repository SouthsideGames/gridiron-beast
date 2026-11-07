// Developer → Task 8 test tools (private test build only). A separate screen of shortcuts for the M1 systems; normal gameplay
// never reaches it. Every franchise-changing button marks the franchise developer-assisted. See src/franchise/t8-dev.js.
import { esc, delegate, toast, confirmSheet } from '../dom.js';
import { monsterOverall, resolveSpecies } from '../../data/monsters.js';
import { ATTR_NAME } from '../../data/stat-guide.js';
import * as T from '../../franchise/t8-dev.js';
import { LEGACY_ABILITY_EFFECTS_TRANSITIONAL } from '../../data/monsters.js';

export function registerT8Lab(Router, app) {
  const V = { channel: 'roster', quality: 58, veterans: false, sample: null, pick: null, kind: 'basic', position: '' };
  const pct = (x) => `${Math.round(x * 1000) / 10}%`;
  function sampleHtml() {
    const s = V.sample; if (!s) return '<p class="dim">Run a sample to see the channel\'s Basic share, Temper spread and Apex count.</p>';
    const tempers = Object.entries(s.tempers).sort((a, b) => b[1] - a[1]);
    return `<div class="panel tight"><b>${s.n} from the ${esc(s.channel)} channel at quality ${s.quality}</b>
      <div class="muted">Basics ${pct(s.basicShare)} (approved share: roster 25%, scouting 25%, encounter 30%, draft 35%, arrival 40%) · Apex ${s.apex}${s.apex ? ` (Tempers: ${s.apexTempers.map(esc).join(', ')})` : ''} · OVR p10 ${s.ovr.p10}, median ${s.ovr.p50}, p90 ${s.ovr.p90} (min ${s.ovr.min}, max ${s.ovr.max}) · mean level ${s.meanLevel.toFixed(1)}</div>
      <div class="dim" style="font-size:12px;margin-top:4px">Tempers (${tempers.length} of ${T.TEMPER_COUNT} seen): ${tempers.map(([k, n]) => `${esc(k)} ${n}`).join(' · ')}</div></div>`;
  }
  function inspectHtml(m) {
    const d = T.devInspect(m); if (!d) return '';
    return `<div class="panel tight"><b>${esc(m.name)}</b> <span class="dim">${esc(resolveSpecies(m).rarity)} · ${esc(d.form)} · ${m.position} · age ${m.age} · ${monsterOverall(m)} OVR</span>
      <div class="muted">Temper <b>${esc(d.temper.name)}</b>: ${esc(d.temper.text)}${d.apex ? ' · <b>APEX</b> (ageless; ceilings 99; neutral Temper)' : ''}</div>
      <div class="muted">Level ${d.level} · XP ${d.xp}/${d.next === Infinity ? '—' : d.next} · banked training points ${d.bank}</div>
      <div style="overflow-x:auto;margin-top:6px"><table class="mono" style="font-size:12px;border-collapse:collapse;width:100%"><tr class="dim"><th align="left">Attribute</th><th>Now</th><th>Ceiling</th><th>Start</th><th>Natural</th><th>Trained</th><th>Decline</th><th>Temper ×</th></tr>
      ${d.attrs.map((r) => `<tr><td>${esc(ATTR_NAME?.[r.a] || r.a)}</td><td align="center"><b>${r.cur}</b></td><td align="center">${r.pot}</td><td align="center">${r.ref}</td><td align="center">${r.natural}</td><td align="center">${r.trained}</td><td align="center">${r.loss}</td><td align="center">${r.eff}</td></tr>`).join('')}</table></div></div>`;
  }
  Router.registerScreen('t8-lab', {
    title: 'Task 8 test tools', tabs: false,
    render() {
      if (!T.t8ToolsEnabled()) return '<p>These tools exist only in the private Task 8 test build.</p>';
      const f = app.f; const m = f && (f.roster.find((x) => x.id === V.pick) || f.roster[0]);
      return `<div class="panel tight" style="border-color:var(--warn)"><b>🧪 Task 8 test tools (test build only)</b><div class="muted">Shortcuts for checking the new monster system without playing seasons. Buttons that change your franchise mark it developer-assisted. ${LEGACY_ABILITY_EFFECTS_TRANSITIONAL ? 'Football abilities of the 72 original families are still the <b>legacy, transitional</b> effects until M3; Basics have no unique ability.' : ''}</div></div>
        <h3>Generation sampler <span class="dim" style="font-size:12px">(changes nothing)</span></h3>
        <div class="lab-setup"><label class="field">Channel<select data-change="t8-channel">${T.T8_CHANNELS.map((c) => `<option ${c === V.channel ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field">Quality<input class="input" type="number" min="40" max="75" value="${V.quality}" data-change="t8-quality"></label>
        <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="t8-vets" ${V.veterans ? 'checked' : ''}> with prior careers (veterans)</label></div>
        <button class="btn block" data-action="t8-sample">Sample 1,000 monsters</button>${sampleHtml()}
        ${f ? `<h3>Your roster</h3>
        <div class="lab-setup"><label class="field">Add a level-1 test monster<select data-change="t8-kind">${['basic', 'ordinary', 'apex'].map((k) => `<option ${k === V.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label class="field">Position<select data-change="t8-pos"><option value="">any</option>${T.T8_POSITIONS.map((p) => `<option ${p === V.position ? 'selected' : ''}>${p}</option>`).join('')}</select></label></div>
        <button class="btn block" data-action="t8-add">+ Add to roster</button>
        <label class="field" style="margin-top:8px">Monster<select data-change="t8-pick">${f.roster.map((x) => `<option value="${esc(x.id)}" ${m && x.id === m.id ? 'selected' : ''}>${esc(x.name)} · ${x.position} · ${monsterOverall(x)} OVR · Lv ${x.dev?.level ?? '?'}${x.dev?.apex ? ' · APEX' : ''}</option>`).join('')}</select></label>
        ${m ? inspectHtml(m) : ''}
        <div class="grid2" style="margin-top:6px">
          <button class="btn" data-action="t8-lv" data-n="1">Level up ×1</button><button class="btn" data-action="t8-lv" data-n="10">Level up ×10</button>
          <button class="btn" data-action="t8-evo">To next evolution level</button><button class="btn" data-action="t8-bank">Bank 5 training points</button>
          <button class="btn" data-action="t8-age">Run one offseason (age, decline, +2 points)</button><button class="btn" data-action="t8-open">Open monster page</button>
        </div>
        <h3>Encounters and saving</h3>
        <div class="grid2"><button class="btn" data-action="t8-basic-prospect">Make prospect 1 a Basic (Tuesday)</button><button class="btn" data-action="t8-save">Save round-trip check</button></div>` : '<p class="dim">Open or start a franchise (it is the preview\'s own fresh save) to use the roster tools.</p>'}
        <button class="btn block" data-action="go" data-screen="developer" style="margin-top:10px">← Return to Developer Tools</button>`;
    },
    mount(root) {
      const re = () => Router.render(); const save = () => app.save?.();
      delegate(root, {
        't8-channel': (el) => { V.channel = el.value; }, 't8-quality': (el) => { V.quality = Number(el.value) || 58; }, 't8-vets': (el) => { V.veterans = el.checked; },
        't8-sample': () => { V.sample = T.generationSample({ channel: V.channel, quality: V.quality, veterans: V.veterans, metric: V.channel === 'draft' ? 'potential' : 'current' }); re(); },
        't8-kind': (el) => { V.kind = el.value; }, 't8-pos': (el) => { V.position = el.value; }, 't8-pick': (el) => { V.pick = el.value; re(); },
        't8-add': async () => { if (!(await confirmSheet(`Add a level-1 ${V.kind} monster for testing? The franchise is marked developer-assisted.`, { title: 'Test tools', okLabel: 'Add' }))) return; const r = T.devAddMonster(app.f, { kind: V.kind, position: V.position || null }); if (!r.ok) return toast(r.reason, 'bad'); V.pick = r.monster.id; save(); toast(`${r.monster.name} joined (${r.label}).`, 'good'); re(); },
        't8-lv': (el) => { const r = T.devLevelUp(app.f, V.pick || app.f.roster[0].id, Number(el.dataset.n)); if (!r.ok) return toast(r.reason, 'bad'); save(); toast(`Level ${r.from.level} → ${r.to.level} · OVR ${r.from.ovr} → ${r.to.ovr}`, 'good'); re(); },
        't8-evo': () => { const r = T.devToEvolutionLevel(app.f, V.pick || app.f.roster[0].id); if (!r.ok) return toast(r.reason, 'bad'); save(); toast(r.already ? 'Already at the evolution level: Evolve is on the monster page.' : `Now level ${r.to.level}. Evolve from the monster page.`, 'good'); re(); },
        't8-bank': () => { const r = T.devBankPoints(app.f, V.pick || app.f.roster[0].id, 5); if (!r.ok) return toast(r.reason, 'bad'); save(); toast('5 points banked. Spend them on the monster page.', 'good'); re(); },
        't8-age': () => { const r = T.devAgeOneSeason(app.f, V.pick || app.f.roster[0].id); if (!r.ok) return toast(r.reason, 'bad'); save(); toast(`Age ${r.from.age} → ${r.to.age} · OVR ${r.from.ovr} → ${r.to.ovr}${r.changed.length ? ` · ${r.changed.length} attributes changed` : ''}`, 'info', 5000); re(); },
        't8-open': () => Router.go('monster', { id: V.pick || app.f.roster[0].id }),
        't8-basic-prospect': () => { const r = T.devBasicProspect(app.f); if (!r.ok) return toast(r.reason, 'bad'); save(); toast(`${r.monster.name} (Basic) is now prospect 1. Win the encounter for the +25% level XP bonus.`, 'good', 5000); },
        't8-save': () => { const r = T.devSaveRoundTrip(app.f); toast(r.ok ? `Saved and re-read: schema ${r.schemaVersion}, ${r.monsters} monsters, every development record identical.` : `Round-trip differences: ${(r.diffs || []).join(', ') || (r.ledger === false ? 'reward ledger' : r.reason)}`, r.ok ? 'good' : 'bad', 6000); },
        go: (el) => Router.go(el.dataset.screen),
      });
    },
  });
}

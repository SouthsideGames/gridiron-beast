// Main menu, settings, developer tools, about.

import { esc, delegate, toast, confirmSheet, sheet } from '../dom.js';
import { yearOf } from '../../data/calendar.js';
import * as Save from '../../franchise/save.js';
import { cloudStatus } from '../../franchise/cloud-save.js';
import { buildLabel } from '../../version.js';
import { summary, hireDefaultStaff, DIFFICULTY, dexCounts } from '../../franchise/franchise.js';
import * as F from '../../franchise/franchise.js';
import { BACKGROUNDS } from '../../data/staff.js';
import { GYM_BY_CLUB } from '../../data/gyms.js';
import { resetDex } from '../../franchise/dex-store.js';
import { hallOfFame } from '../../franchise/hall-of-fame.js';
import { resetTutorial, primerHtml } from '../tutorial.js';
import { DIFFICULTY as DIFF } from '../../franchise/franchise.js';
import { monsterSprite } from '../pixel-monster.js';
import { portraitSprite } from '../pixel-monster.js';

export function registerMenuScreens(Router, app) {
  Router.registerScreen('menu', {
    title: 'Gridiron Beast', back: false, tabs: false,
    render({ f }) {
      const legacy = Save.legacySummary(Save.readLegacy());
      const s = f ? summary(f) : null;
      return `
        <div class="hero"><div class="logo">GRIDIRON BEAST</div><div class="muted">Monster football franchise · 7-on-7</div></div>
        ${f ? `<div class="panel"><div class="row"><span>${portraitSprite(f.owner.portrait + '|' + f.owner.first, 44)}</span><div class="grow"><div><b>${esc(f.owner.first)} ${esc(f.owner.last)}</b> · ${esc(s.club)}</div><div class="muted">Beast League · ${yearOf(s.year)} · Week ${s.week} · ${s.record}</div></div></div>
          <div class="stack" style="margin-top:12px"><button class="btn primary big block" data-action="continue">▶ Continue Franchise</button></div></div>` : ''}
        <div class="stack">
          <button class="btn ${f ? '' : 'primary big'} block" data-action="new">${f ? 'Start a New Franchise' : '🏆 New Franchise'}</button>
          ${legacy && !f ? `<button class="btn block" data-action="import-legacy">Import ${esc(legacy.owner)}'s ${esc(legacy.club)} (previous version)</button>` : ''}
          <button class="btn block" data-action="go" data-screen="dex">📖 Beast Dex <span class="dim mono">${dexCounts(f).seen}/72</span></button>
          ${hallOfFame().length ? `<button class="btn block" data-action="go" data-screen="hof">🏛️ Hall of Fame <span class="dim mono">${hallOfFame().length}</span></button>` : ''}
          <div class="grid2"><button class="btn block" data-action="go" data-screen="settings">⚙️ Settings</button><button class="btn block" data-action="go" data-screen="developer">🛠️ Developer</button></div>
        </div>
        <p class="center dim" style="margin-top:16px">Gridiron Beast · build ${esc(buildLabel())} · Southside Games</p>`;
    },
    mount(root, ctx) {
      delegate(root, {
        continue: () => Router.go('hq', {}, { reset: true }),
        new: async () => { if (app.f && !(await confirmSheet('Starting a new franchise replaces your current save. Export it first from Settings if you want to keep it.', { title: 'New franchise', okLabel: 'Start new', danger: true }))) return; Router.go('onboarding', { fresh: true }); },
        'import-legacy': async () => { try { const f = Save.importLegacy(Save.readLegacy()); app.setFranchise(f); toast('Imported your previous franchise. Your old save is untouched.', 'good'); if (Object.keys(f.staff).length < 5) hireDefaultStaff(f); app.save(); Router.go('hq', {}, { reset: true }); } catch (e) { toast(e.message, 'bad'); } },
        soon: (el) => toast(`${el.dataset.what} is planned for a later release.`),
        go: (el) => Router.go(el.dataset.screen),
      });
    },
  });

  Router.registerScreen('settings', {
    title: 'Settings',
    render({ app }) {
      const s = app.settings;
      return `
        <div class="panel">
          <label class="field">Game length<select data-change="quarter"><option value="180" ${s.quarterLength === 180 ? 'selected' : ''}>Standard — 3-minute quarters, ~25 plays, 3–5 min (default)</option><option value="300" ${s.quarterLength === 300 ? 'selected' : ''}>Long — 5-minute quarters, ~45 plays, 6–10 min</option><option value="420" ${s.quarterLength === 420 ? 'selected' : ''}>Full — 7-minute quarters, ~60 plays, 10–15 min</option></select></label>
          ${app.f ? `<div class="field"><span>Difficulty</span><div class="muted"><b>${esc(DIFFICULTY[s.difficulty]?.label || 'Pro')}</b> — set when the franchise was created and locked for its life. Start a new franchise to play another difficulty.</div></div>` : ''}
          <label class="field">Coaching mode<select data-change="mode"><option value="key" ${s.mode === 'key' ? 'selected' : ''}>Key Moments — you coach the big downs (recommended)</option><option value="full" ${s.mode === 'full' ? 'selected' : ''}>Full Coaching — call every play</option></select></label>
          <p class="dim">Times assume Key Moments; Full Coaching roughly doubles them.</p>
          <label class="field">Animation speed<select data-change="speed"><option value="0.7" ${s.speed === 0.7 ? 'selected' : ''}>Slow</option><option value="1" ${s.speed === 1 ? 'selected' : ''}>Normal</option><option value="1.6" ${s.speed === 1.6 ? 'selected' : ''}>Fast</option></select></label>
          <label class="field">Players on the field<select data-change="markers"><option value="sprites" ${s.fieldMarkers !== 'simple' ? 'selected' : ''}>Monster art</option><option value="simple" ${s.fieldMarkers === 'simple' ? 'selected' : ''}>Simple circles and squares</option></select></label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="hints" ${s.hints !== false ? 'checked' : ''}> Coaching hints (recommended plays after scouting)</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="autopoints" ${s.autoPoints ? 'checked' : ''}> Trainer spends attribute points for me (off: you spend them on the monster card)</label>
          ${app.f ? `<label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="tutorial" ${s.tutorial !== false ? 'checked' : ''}> Tutorial tips (first-week walkthrough)</label><div class="row"><button class="btn small" data-action="tutreset">Show all tips again</button><button class="btn small" data-action="primer">How football works</button></div>` : ''}
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="reduced" ${s.reducedMotion ? 'checked' : ''}> Reduce motion</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="liveclock" ${s.liveClock ? 'checked' : ''}> Live 40-second play clock (off by default — not recommended on mobile)</label>
        </div>
        ${app.f ? `<div class="panel"><h3>Save data</h3><p class="muted">${(() => { const c = cloudStatus(); return c.state === 'on' ? `☁️ Cloud save on${c.at ? ' · last synced ' + new Date(c.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}` : 'Saved on this device. (Cloud save is available when playing inside Claude.)'; })()}</p><div class="stack">${Save.loadBackup() ? '<button class="btn block" data-action="restore">Restore last week’s backup</button>' : ''}<button class="btn block" data-action="export">Export save as JSON</button><label class="btn block" style="cursor:pointer">Import save JSON<input type="file" accept="application/json,.json" data-change="import" class="sr-only"></label><button class="btn danger block" data-action="reset">Delete franchise</button></div></div>` : ''}
        <p class="dim">The previous version's save (if any) is never modified by this build.</p>
        <p class="center dim">Build ${esc(buildLabel())}. If this does not match the latest build, close the app fully and reopen it.</p>`;
    },
    mount(root, ctx) {
      const set = (k, v) => { if (app.f) { app.f.settings[k] = v; app.save(); } else app.defaultSettings[k] = v; document.documentElement.dataset.reducedMotion = app.settings.reducedMotion ? '1' : '0'; };
      delegate(root, {
        quarter: (el) => set('quarterLength', Number(el.value)), mode: (el) => set('mode', el.value), speed: (el) => set('speed', Number(el.value)),
        reduced: (el) => set('reducedMotion', el.checked), markers: (el) => set('fieldMarkers', el.value), hints: (el) => set('hints', el.checked), autopoints: (el) => set('autoPoints', el.checked), tutorial: (el) => set('tutorial', el.checked), liveclock: (el) => set('liveClock', el.checked),
        tutreset: () => { resetTutorial(app.f); app.f.settings.tutorial = true; app.save(); toast('Tips will show again on each screen.', 'good'); Router.render(); },
        primer: () => sheet(primerHtml(), { title: 'How football works' }),
        export: () => { const blob = new Blob([Save.exportJson(app.f)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `gridiron-beast-${app.f.club.replace(/\s+/g, '-').toLowerCase()}-s${app.f.season.year}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Save exported.', 'good'); },
        import: async (el) => { const file = el.files?.[0]; if (!file) return; try { const f = Save.importJson(await file.text()); app.setFranchise(f); toast('Save imported.', 'good'); Router.go('hq', {}, { reset: true }); } catch (e) { toast('Import failed: ' + e.message, 'bad'); } el.value = ''; },
        restore: async () => { const b = Save.loadBackup(); if (!b) return; if (await confirmSheet(`Roll back to ${yearOf(b.season.year)}, Week ${b.season.week} (saved after last Sunday)? Anything since then is lost.`, { title: 'Restore backup', okLabel: 'Restore' })) { app.setFranchise(b); toast('Backup restored.', 'good'); Router.go('hq', {}, { reset: true }); } },
        reset: async () => { if (await confirmSheet('Delete this franchise permanently? Export first if you want a backup.', { title: 'Delete franchise', okLabel: 'Delete', danger: true })) { app.reset(); toast('Franchise deleted.'); Router.go('menu', {}, { reset: true }); } },
      });
    },
  });

  Router.registerScreen('developer', {
    title: 'Developer Tools',
    render() {
      return `<p class="muted">Inspection tools that work without a franchise.</p><div class="stack">
        <button class="btn block" data-action="go" data-screen="audit">🔎 Playbook Audit</button>
        <button class="btn block" data-action="go" data-screen="practice">🎯 Practice Field</button>
        <button class="btn block" data-action="dexall">📖 Beast Dex (everything revealed)</button>
        <button class="btn block danger" data-action="dexreset">Reset my Beast Dex</button>
        <button class="btn block" data-action="go" data-screen="about">ℹ️ About this build</button></div>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen), dexall: () => Router.go('dex', { all: true }), dexreset: async () => { if (await confirmSheet('Wipe every species you have discovered, across all franchises?', { title: 'Reset Beast Dex', okLabel: 'Reset', danger: true })) { resetDex(); toast('Beast Dex reset.'); } } }); },
  });

  Router.registerScreen('hof', {
    title: 'Hall of Fame',
    render() {
      const cards = hallOfFame();
      if (!cards.length) return '<div class="panel"><p>No careers enshrined yet. Hit every mark on the Campaign checklist and retire.</p></div>';
      return `<div class="stack">${cards.map((c) => `<div class="panel hof-card"><div class="row">${portraitSprite(`${c.portrait}|${c.owner.split(' ')[0]}`, 48)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(c.owner)}</div><div class="muted">${esc(c.club)} · ${esc(DIFF[c.difficulty]?.label || c.difficulty)} · ${c.seasons} season${c.seasons === 1 ? '' : 's'}</div></div><span class="chip accent">🏛️</span></div>
        <div class="kv" style="margin-top:8px"><b>Record</b><span class="mono">${c.record.w}–${c.record.l}</span><b>Beast Bowls</b><span>${c.titles}</span><b>Badges</b><span>${c.badges.length} / 8</span><b>League awards</b><span>${c.awards}</span><b>Species discovered</b><span>${c.dexSeen} / 72</span>${c.rival ? `<b>Rival</b><span>${esc(c.rival)} ${c.rivalRecord ? `(${c.rivalRecord.w}–${c.rivalRecord.l})` : ''}</span>` : ''}</div>
        ${c.bestMonsters?.length ? `<div class="muted" style="margin-top:8px;font-size:12px">BEST MONSTERS</div><div class="row" style="flex-wrap:wrap;gap:8px">${c.bestMonsters.map((m) => `<span class="row" style="gap:4px">${monsterSprite({ id: m.name, name: m.name, species: m.species }, 28)}<span style="font-size:13px">${esc(m.name)} <span class="dim">${m.position} ${m.ovr}</span></span></span>`).join('')}</div>` : ''}
        <details style="margin-top:8px"><summary class="muted" style="cursor:pointer">Season by season</summary>${(c.seasonsList || []).map((h) => `<div class="row between sub"><span>${yearOf(h.year)}</span><span class="mono">${h.w}–${h.l}${h.champion ? ' 🏆' : h.playoffs ? ' · playoffs' : ''}</span></div>`).join('')}</details>
        <div class="dim" style="margin-top:6px;font-size:12px">Retired ${new Date(c.retiredAt).toLocaleDateString()}</div></div>`).join('')}</div>`;
    },
  });

  Router.registerScreen('about', {
    title: 'About',
    render() { return `<div class="panel"><p><b>Gridiron Beast v6</b> — a mobile-first 7-on-7 monster football franchise game.</p><p class="muted">Engine, playbook, coaching AI and franchise systems are shared by matches, practice and the simulated league. Every play is reproducible from its seed.</p><p class="muted">16 clubs, two conferences, a 10-week season and a three-round playoff.</p></div>`; },
  });

  // ---------------------------------------------------------------- My office (GDD §18.6): the GM's own page
  Router.registerScreen('office', {
    title: 'My office',
    render({ f }) {
      const b = f.board || { confidence: 0, goal: null, history: [] }; const g = b.goal; const p = g ? F.goalProgress(f) : null;
      const hof = F.hallOfFameProgress(f); const diff = DIFFICULTY[f.settings.difficulty] || DIFFICULTY.pro;
      const seasons = f.history.length; const wins = f.history.reduce((a, h) => a + h.record.w, 0) + F.record(f).w, losses = f.history.reduce((a, h) => a + h.record.l, 0) + F.record(f).l;
      const badges = Object.entries(f.campaign?.badges || {});
      const bg = BACKGROUNDS[f.owner.background];
      return `<div class="panel"><div class="row" style="gap:12px">${portraitSprite(f.owner.portrait, 72)}<div class="grow"><div style="font-size:18px;font-weight:900">${esc(f.owner.first)} ${esc(f.owner.last)}</div><div class="muted">General manager, ${esc(f.club)} · ${yearOf(f.season.year)} · ${esc(diff.label)}</div>${bg ? `<div class="dim">${esc(bg.label)} — ${esc(bg.text)}</div>` : ''}</div></div></div>
        <div class="panel ${F.onHotSeat(f) ? 'hotseat' : ''}"><div class="row between"><b>Board</b><span class="chip ${F.onHotSeat(f) ? 'bad' : b.confidence > 0 ? 'good' : ''}">${F.confidenceLabel(b.confidence)} (${b.confidence >= 0 ? '+' : ''}${b.confidence})</span></div>
          ${g ? `<div style="margin-top:6px">🎯 This season: <b>${esc(g.label)}</b>${p ? ` · ${esc(p.text)}` : ''}</div><div class="bar" style="margin:6px 0 0"><i style="width:${Math.round((p?.pct || 0) * 100)}%"></i></div>` : '<div class="dim" style="margin-top:6px">No goal committed yet.</div>'}
          ${b.history.length ? `<div class="dim" style="margin-top:6px">Past: ${b.history.map((h) => `${yearOf(h.year)} ${h.met ? '✅' : '❌'} ${esc(h.label)}`).join(' · ')}</div>` : ''}</div>
        <div class="panel"><b>Career</b><div class="kv" style="margin-top:6px"><b>Seasons</b><span>${seasons + 1}</span><b>Record</b><span>${wins}–${losses}</span><b>Beast Bowls</b><span>${f.campaign?.titles || 0}</span><b>League awards</b><span>${f.campaign?.awards || 0}</span><b>Badges</b><span>${badges.length} / 8</span><b>Career wins (HoF)</b><span>${f.campaign?.wins || 0}</span></div>
          ${badges.length ? `<div class="row" style="flex-wrap:wrap;gap:4px;margin-top:6px">${badges.map(([club, x]) => `<span class="chip accent">${esc(GYM_BY_CLUB[club]?.badge || club)} · ${yearOf(x.year)}</span>`).join('')}</div>` : ''}</div>
        <div class="panel"><b>Hall of Fame</b> <span class="dim">${esc(diff.hof)}</span><div class="hof" style="margin-top:6px">${hof.rows.map((r) => `<div class="row between ${r.done ? 'done' : ''}"><span>${r.done ? '✓' : '○'} ${r.key}</span><span class="mono">${r.have} / ${r.goal}</span></div>`).join('')}</div>${hof.eligible ? '<p class="muted">Eligible: retire from HQ whenever you choose.</p>' : ''}</div>
        <div class="panel"><b>Franchises</b><div class="dim">Selling this club and starting another is coming (GDD §18.7). Sold franchises will sit here as cards; facing an old club will be a big day.</div></div>`;
    },
  });
  Router.registerScreen('more', {
    title: 'More',
    render({ f }) {
      return `<div class="stack">
        <button class="btn block" data-action="go" data-screen="office">🪪 My office <span class="dim">${esc(f.owner.first)} ${esc(f.owner.last)}</span></button>
        <button class="btn block" data-action="go" data-screen="dex">📖 Beast Dex <span class="dim mono">${dexCounts(f).seen}/72</span></button>
        <button class="btn block" data-action="go" data-screen="settings">⚙️ Settings</button>
        <button class="btn block" data-action="menu">🏠 Main Menu</button></div>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen), menu: () => Router.go('menu', {}, { reset: true }) }); },
  });
}

// Main menu, settings, developer tools, about.

import { esc, delegate, toast, confirmSheet, sheet } from '../dom.js';
import * as Save from '../../franchise/save.js';
import { cloudStatus } from '../../franchise/cloud-save.js';
import { summary, hireDefaultStaff, DIFFICULTY } from '../../franchise/franchise.js';
import { portraitSprite } from '../pixel-monster.js';

export function registerMenuScreens(Router, app) {
  Router.registerScreen('menu', {
    title: 'Gridiron Beast', back: false, tabs: false,
    render({ f }) {
      const legacy = Save.legacySummary(Save.readLegacy());
      const s = f ? summary(f) : null;
      return `
        <div class="hero"><div class="logo">GRIDIRON BEAST</div><div class="muted">Monster football franchise · 7-on-7</div></div>
        ${f ? `<div class="panel"><div class="row"><span>${portraitSprite(f.owner.portrait + '|' + f.owner.first, 44)}</span><div class="grow"><div><b>${esc(f.owner.first)} ${esc(f.owner.last)}</b> · ${esc(s.club)}</div><div class="muted">Beast League · Season ${s.year} · Week ${s.week} · ${s.record}</div></div></div>
          <div class="stack" style="margin-top:12px"><button class="btn primary big block" data-action="continue">▶ Continue Franchise</button></div></div>` : ''}
        <div class="stack">
          <button class="btn ${f ? '' : 'primary big'} block" data-action="new">${f ? 'Start a New Franchise' : '🏆 New Franchise'}</button>
          ${legacy && !f ? `<button class="btn block" data-action="import-legacy">Import ${esc(legacy.owner)}'s ${esc(legacy.club)} (previous version)</button>` : ''}
          <div class="grid2"><button class="btn block" data-action="go" data-screen="settings">⚙️ Settings</button><button class="btn block" data-action="go" data-screen="developer">🛠️ Developer</button></div>
        </div>
        <p class="center dim" style="margin-top:16px">v6.0 rebuild · Southside Games</p>`;
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
          <label class="field">Difficulty<select data-change="difficulty">${Object.entries(DIFFICULTY).map(([id, d]) => `<option value="${id}" ${(s.difficulty || 'pro') === id ? 'selected' : ''}>${d.label} — ${d.text}</option>`).join('')}</select></label>
          <label class="field">Coaching mode<select data-change="mode"><option value="key" ${s.mode === 'key' ? 'selected' : ''}>Key Moments — you coach the big downs (recommended)</option><option value="full" ${s.mode === 'full' ? 'selected' : ''}>Full Coaching — call every play</option></select></label>
          <p class="dim">Times assume Key Moments; Full Coaching roughly doubles them.</p>
          <label class="field">Animation speed<select data-change="speed"><option value="0.7" ${s.speed === 0.7 ? 'selected' : ''}>Slow</option><option value="1" ${s.speed === 1 ? 'selected' : ''}>Normal</option><option value="1.6" ${s.speed === 1.6 ? 'selected' : ''}>Fast</option></select></label>
          <label class="field">Players on the field<select data-change="markers"><option value="sprites" ${s.fieldMarkers !== 'simple' ? 'selected' : ''}>Monster art</option><option value="simple" ${s.fieldMarkers === 'simple' ? 'selected' : ''}>Simple circles and squares</option></select></label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="hints" ${s.hints !== false ? 'checked' : ''}> Coaching hints (recommended plays after scouting)</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="reduced" ${s.reducedMotion ? 'checked' : ''}> Reduce motion</label>
          <label class="field row"><input type="checkbox" style="width:auto;min-height:0" data-change="liveclock" ${s.liveClock ? 'checked' : ''}> Live 40-second play clock (off by default — not recommended on mobile)</label>
        </div>
        ${app.f ? `<div class="panel"><h3>Save data</h3><p class="muted">${(() => { const c = cloudStatus(); return c.state === 'on' ? `☁️ Cloud save on${c.at ? ' · last synced ' + new Date(c.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}` : 'Saved on this device. (Cloud save is available when playing inside Claude.)'; })()}</p><div class="stack">${Save.loadBackup() ? '<button class="btn block" data-action="restore">Restore last week’s backup</button>' : ''}<button class="btn block" data-action="export">Export save as JSON</button><label class="btn block" style="cursor:pointer">Import save JSON<input type="file" accept="application/json,.json" data-change="import" class="sr-only"></label><button class="btn danger block" data-action="reset">Delete franchise</button></div></div>` : ''}
        <p class="dim">The previous version's save (if any) is never modified by this build.</p>`;
    },
    mount(root, ctx) {
      const set = (k, v) => { if (app.f) { app.f.settings[k] = v; app.save(); } else app.defaultSettings[k] = v; document.documentElement.dataset.reducedMotion = app.settings.reducedMotion ? '1' : '0'; };
      delegate(root, {
        quarter: (el) => set('quarterLength', Number(el.value)), mode: (el) => set('mode', el.value), difficulty: (el) => set('difficulty', el.value), speed: (el) => set('speed', Number(el.value)),
        reduced: (el) => set('reducedMotion', el.checked), markers: (el) => set('fieldMarkers', el.value), hints: (el) => set('hints', el.checked), liveclock: (el) => set('liveClock', el.checked),
        export: () => { const blob = new Blob([Save.exportJson(app.f)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `gridiron-beast-${app.f.club.replace(/\s+/g, '-').toLowerCase()}-s${app.f.season.year}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Save exported.', 'good'); },
        import: async (el) => { const file = el.files?.[0]; if (!file) return; try { const f = Save.importJson(await file.text()); app.setFranchise(f); toast('Save imported.', 'good'); Router.go('hq', {}, { reset: true }); } catch (e) { toast('Import failed: ' + e.message, 'bad'); } el.value = ''; },
        restore: async () => { const b = Save.loadBackup(); if (!b) return; if (await confirmSheet(`Roll back to Season ${b.season.year}, Week ${b.season.week} (saved after last Sunday)? Anything since then is lost.`, { title: 'Restore backup', okLabel: 'Restore' })) { app.setFranchise(b); toast('Backup restored.', 'good'); Router.go('hq', {}, { reset: true }); } },
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
        <button class="btn block" data-action="go" data-screen="about">ℹ️ About this build</button></div>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen) }); },
  });

  Router.registerScreen('about', {
    title: 'About',
    render() { return `<div class="panel"><p><b>Gridiron Beast v6</b> — a mobile-first 7-on-7 monster football franchise game.</p><p class="muted">Engine, playbook, coaching AI and franchise systems are shared by matches, practice and the simulated league. Every play is reproducible from its seed.</p><p class="muted">16 clubs, two conferences, a 10-week season and a three-round playoff.</p></div>`; },
  });

  Router.registerScreen('more', {
    title: 'More',
    render({ f }) {
      return `<div class="stack">
        <button class="btn block" data-action="go" data-screen="settings">⚙️ Settings</button>
        <button class="btn block" data-action="menu">🏠 Main Menu</button></div>`;
    },
    mount(root) { delegate(root, { go: (el) => Router.go(el.dataset.screen), menu: () => Router.go('menu', {}, { reset: true }) }); },
  });
}

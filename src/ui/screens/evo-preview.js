// Evolution Preview (Developer Tools → Preview Evolution). Pick any species that evolves and one of its real transitions, then
// open the game's own evolution scene (openEvolutionScene, the same call the roster's Evolve button makes) on a temporary monster
// built by src/lab/evo-preview.js. Start, Replay and Return; previews can be repeated without leaving. Strictly visual: nothing
// is saved or written (the loaded franchise's display settings and current week are only read, so the scene looks as it does in a
// game), and the scene's sound button only changes this preview, never a saved setting.
import { esc, delegate } from '../dom.js';
import { monsterSprite } from '../pixel-monster.js';
import { openEvolutionScene, stageLabel } from '../evolution-scene.js';
import { previewSpecies, previewTransitions, buildPreview } from '../../lab/evo-preview.js';

export function registerEvoPreview(Router, app) {
  const V = { species: null, fromStage: 0, last: null, count: 0, sound: null };
  const species = () => previewSpecies();
  const transitionsOf = (sp) => previewTransitions().filter((t) => t.species === sp);
  const current = () => { const sp = V.species || species()[0]?.species; const ts = transitionsOf(sp); return ts.find((t) => t.fromStage === V.fromStage) || ts[0] || null; };

  function start() {
    const t = current(); if (!t || document.querySelector('.evo-scene')) return;
    const p = buildPreview(t.species, t.fromStage); if (!p) return;
    V.last = { species: t.species, fromStage: t.fromStage }; V.count++;
    // The same settings the roster's Evolve button passes (the franchise's, Reduced Motion from either), read only.
    const fs = app.f?.settings || app.settings || {}; if (V.sound == null) V.sound = !!fs.evoSound;
    const p2 = app.f?.season ? buildPreview(t.species, t.fromStage, { when: { year: app.f.season.year, week: app.f.season.week } }) : p;
    openEvolutionScene({ report: p2.report, beforeMon: p2.beforeMon, afterMon: p2.afterMon, settings: { reducedMotion: fs.reducedMotion || app.settings?.reducedMotion, screenShake: fs.screenShake, evoSound: V.sound }, onSound: (on) => { V.sound = on; }, onClose: () => Router.render() });
  }
  Router.registerScreen('evo-preview', {
    title: 'Preview Evolution', tabs: false,
    render() {
      const list = species(); const t = current(); const p = t ? buildPreview(t.species, t.fromStage) : null; const ts = t ? transitionsOf(t.species) : [];
      const r = p?.report;
      return `<p class="muted">Play any monster's real evolution scene on a temporary copy. Nothing is saved: no roster, level, XP, collection, achievement or franchise changes.</p>
        <div class="lab-setup">
          <label class="field">Monster<select data-change="evp-species">${list.map((x) => `<option value="${x.species}" ${t?.species === x.species ? 'selected' : ''}>${esc(x.name)} · ${esc(x.element)} · ${esc(x.rarity)}${x.stages > 1 ? ' · 2 evolutions' : ''}</option>`).join('')}</select></label>
          ${ts.length > 1 ? `<div class="seg" role="radiogroup" aria-label="Evolution">${ts.map((x) => `<button class="btn small ${x.fromStage === t.fromStage ? 'primary' : ''}" data-action="evp-stage" data-v="${x.fromStage}" role="radio" aria-checked="${x.fromStage === t.fromStage}">${esc(x.fromName)} → ${esc(x.toName)}</button>`).join('')}</div>` : ''}
        </div>
        ${p ? `<div class="panel evp-card">
          <div class="evp-forms">
            <div class="evp-form">${monsterSprite(p.beforeMon, 96)}<b>${esc(r.fromName)}</b><span class="dim">${esc(stageLabel(r.fromStage))}</span></div>
            <div class="evp-arrow" aria-hidden="true">→</div>
            <div class="evp-form">${monsterSprite(p.afterMon, 96)}<b>${esc(r.toName)}</b><span class="dim">${r.next ? esc(stageLabel(r.toStage)) : 'Final form'}</span></div>
          </div>
          <ul class="evp-facts">
            <li>Evolves at level <b>${t.level}</b> · ${esc(t.position)} · ${esc(t.element)} · ${esc(t.rarity)}</li>
            <li>Overall ${r.overall.from} → ${r.overall.to} (${r.overall.delta >= 0 ? '+' : ''}${r.overall.delta}) on this preview copy</li>
            ${r.ability ? `<li>New ${r.ability.kind === 'trait' ? 'trait' : 'ability'}: <b>${esc(r.ability.to)}</b></li>` : ''}
            <li>${r.next ? `Next: ${esc(r.next.name)} at level ${r.next.level}` : 'Final form after this evolution'}</li>
          </ul>
        </div>` : '<p class="warn">No evolution to preview.</p>'}
        <div class="stack">
          <button class="btn primary big block" data-action="evp-start" ${p ? '' : 'disabled'}>▶ Start Preview</button>
          <button class="btn block" data-action="evp-replay" ${V.last ? '' : 'disabled'}>↺ Replay Evolution${V.last ? ` (${esc(transitionsOf(V.last.species).find((x) => x.fromStage === V.last.fromStage)?.toName || '')})` : ''}</button>
          <button class="btn block" data-action="go" data-screen="developer">← Return to Developer Tools</button>
        </div>
        <p class="dim">${previewTransitions().length} evolutions across ${list.length} monsters. Legendaries and monsters without an evolution are not listed.</p>`;
    },
    mount(root) {
      delegate(root, {
        'evp-species': (el) => { V.species = el.value; V.fromStage = 0; Router.render(); },
        'evp-stage': (el) => { V.fromStage = Number(el.dataset.v); Router.render(); },
        'evp-start': () => start(), go: (el) => Router.go(el.dataset.screen),
        'evp-replay': () => { if (!V.last) return; V.species = V.last.species; V.fromStage = V.last.fromStage; start(); },
      });
    },
  });
}

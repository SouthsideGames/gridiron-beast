// The full-screen evolution sequence (GDD §51). It takes over the screen, plays five stages and ends on a results panel:
//   A  Evolution begins: darkened scene, the monster centred and large, its name, a soft pulse, sparks gathering
//   B  Energy buildup: the glow climbs, energy rings pulse, the body brightens, sparks spiral faster, a controlled shake
//   C  Transformation: the body becomes a bright silhouette that morphs between the two real shapes (old form and the
//      evolved form's own sprite, at most ~2 swaps a second), then one soft flash
//   D  Reveal: the evolved form, large and in colour, its name, type and the "X EVOLVED INTO Y!" banner, a burst of its type
//   E  Results: previous form → new form, overall, potential, the attribute comparison, what comes next, the contract rule
//      and the Career Timeline milestone; Replay and Continue
// The evolution has ALREADY been performed and saved (franchise.evolveMonster) before this opens: the scene only presents a
// report of two snapshots, so skipping, replaying, closing, navigating away or reloading cannot change or repeat anything.
// Reduced motion (the game setting or the system's): no particles, shake, rings, flash or silhouette swaps; a gentle
// cross-fade from one form to the other, then the reveal and the results.
import { esc } from './dom.js';
import { monsterSprite } from './pixel-monster.js';
import { yearOf } from '../data/calendar.js';
import { attributeHelps } from '../data/stat-guide.js';
import { createEvolutionFx, themeFor } from './evolution-fx.js';
import { unlockSound, playCue } from './evolution-sound.js';

/** Stage start times (ms from the start). Full motion: about ten seconds to the results; reduced: about five. */
export const TIMING = Object.freeze({
  full: { B: 1800, C: 4300, swaps: [800, 1350, 1800], flash: 2250, D: 7000, E: 10400 },
  reduced: { B: null, C: 1300, swaps: [], flash: null, D: 2500, E: 5600 },
});
export const STAGES = ['A', 'B', 'C', 'D', 'E'];
/** Plain words for a form's stage (the game has no stage names of its own). */
export const stageLabel = (n) => ['Base form', 'First evolution', 'Second evolution', 'Third evolution'][n] || `Evolution ${n}`;
const CAPTION = { A: (r) => `${r.fromName} is evolving!`, B: () => 'Energy is surging…', C: () => 'Transforming…', D: (r) => `${r.fromName} evolved into ${r.toName}!` };

/** Sprite size for the stage: as large as the screen allows, in whole multiples of 16 so every art pixel stays crisp. */
export function stageSpriteSize(vw = window.innerWidth, vh = window.innerHeight) {
  const s = Math.min(vw * 0.66, vh * 0.38, 320);
  return Math.max(128, Math.floor(s / 16) * 16);
}

/** Results panel HTML (stage E). Exported for tests. */
export function evolutionResultsHtml(r, { beforeSprite, afterSprite }) {
  const delta = (d) => (d > 0 ? `+${d}` : d < 0 ? `${d}` : '±0');
  const key = r.changed.filter((a) => attributeHelps(r.position, a.key) && a.delta > 0); // what this position uses
  const other = r.changed.filter((a) => !key.includes(a));
  const row = (a, i) => `<tr class="${a.delta > 0 ? 'up' : a.delta < 0 ? 'down' : 'same'}" style="--i:${i}"><th scope="row">${esc(a.label)}</th><td class="mono">${a.from}</td><td class="mono"><b>${a.to}</b>${a.delta ? ` <span class="evo-d">(${delta(a.delta)})</span>` : ''}</td><td class="evo-bar" aria-hidden="true"><span class="base" style="width:${Math.max(0, Math.min(100, a.from))}%"></span><span class="gain" style="left:${Math.max(0, Math.min(100, a.from))}%;width:${Math.max(0, Math.min(100, a.to) - Math.min(100, a.from))}%"></span></td></tr>`;
  const allRows = r.all.map((a, i) => (a.delta ? row(a, i) : `<tr class="same"><th scope="row">${esc(a.label)}</th><td class="mono">${a.from}</td><td class="mono">${a.to} <span class="dim">(no change)</span></td><td></td></tr>`)).join('');
  const tile = (label, v) => v ? `<div class="evo-tile"><span class="lbl">${label}</span><span class="val mono">${v.from} <span class="arrow">→</span> <b>${v.to}</b></span>${v.delta ? `<span class="evo-d">${delta(v.delta)}</span>` : '<span class="dim">no change</span>'}</div>` : '';
  const when = r.milestone.year != null ? `${yearOf(r.milestone.year)}${r.milestone.week ? `, week ${r.milestone.week}` : ''}` : '';
  return `<div class="evo-res-inner">
    <div class="evo-eyebrow">Evolution complete</div>
    <div class="evo-pair">
      <div class="evo-form before">${beforeSprite}<span class="nm">${esc(r.fromName)}</span><span class="dim">${stageLabel(r.fromStage)}</span></div>
      <span class="evo-arrow" aria-label="evolved into">➜</span>
      <div class="evo-form after">${afterSprite}<span class="nm">${esc(r.toName)}</span><span class="dim">${r.next ? stageLabel(r.toStage) : 'Final form'}</span></div>
    </div>
    <div class="evo-tiles">${tile('Overall', r.overall)}${tile('Potential', r.potential)}</div>
    <section class="evo-attrs" aria-label="Attribute comparison">
      <h3>Attribute improvements</h3>
      ${key.length ? `<table class="evo-table"><thead><tr><th scope="col">Attribute</th><th scope="col">Before</th><th scope="col">After</th><th aria-hidden="true"></th></tr></thead><tbody>${key.map(row).join('')}</tbody></table>` : '<p class="dim">No change to the attributes a ' + esc(r.position) + ' uses.</p>'}
      ${other.length ? `<p class="dim evo-other">${other.every((a) => a.delta === other[0].delta) ? `${delta(other[0].delta)} to ${other.length} other attribute${other.length === 1 ? '' : 's'}.` : `${other.length} other attribute${other.length === 1 ? '' : 's'} changed.`}</p>` : ''}
      <details class="evo-all"><summary>Show all ${r.all.length} attributes</summary><table class="evo-table full"><thead><tr><th scope="col">Attribute</th><th scope="col">Before</th><th scope="col">After</th><th aria-hidden="true"></th></tr></thead><tbody>${allRows}</tbody></table></details>
    </section>
    <ul class="evo-facts">
      ${r.ability ? `<li><span class="ic" aria-hidden="true">⚡</span><span>New ${r.ability.kind === 'trait' ? 'trait' : 'ability'}: <b>${esc(r.ability.to)}</b></span></li>` : ''}
      <li><span class="ic" aria-hidden="true">${r.next ? '🔮' : '👑'}</span><span>${r.next ? `Next evolution at level ${r.next.level}.` : 'Final form reached.'}</span></li>
      ${r.salary.unchanged ? '<li><span class="ic" aria-hidden="true">📝</span><span>Salary unchanged until contract renewal.</span></li>' : ''}
      <li><span class="ic" aria-hidden="true">📜</span><span>Career Timeline: <b>Evolved into ${esc(r.toName)}</b>${when ? ` · ${esc(when)}` : ''}</span></li>
    </ul>
  </div>`;
}

/**
 * Open the scene. `report` from evolutionReport(); `beforeMon` / `afterMon` render the two forms (same id, so the same
 * individual tint); `settings` = { reducedMotion, screenShake, evoSound }; `onSound(on)` persists the sound choice;
 * `onClose()` runs once when the owner continues. Returns a controller (used by the UI check).
 */
export function openEvolutionScene({ report: r, beforeMon, afterMon, settings = {}, onSound = null, onClose = null }) {
  const sysReduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reduced = !!settings.reducedMotion || sysReduced; const shake = !reduced && settings.screenShake !== false;
  let sound = !!settings.evoSound; const T = reduced ? TIMING.reduced : TIMING.full; const th = themeFor(r.type);
  const size = stageSpriteSize(); const small = Math.max(64, Math.floor(size * 0.36 / 16) * 16), big = Math.max(96, Math.floor(size * 0.5 / 16) * 16);
  const el = document.createElement('div');
  el.className = `evo-scene${reduced ? ' reduced' : ''}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Evolution: ${r.fromName} into ${r.toName}`);
  el.style.setProperty('--evo-glow', th.glow); el.style.setProperty('--evo-c1', th.colors[0]); el.style.setProperty('--evo-c2', th.colors[1]); el.style.setProperty('--evo-c3', th.colors[2]); el.style.setProperty('--evo-size', `${size}px`);
  el.dataset.type = r.type || 'Light';
  el.innerHTML = `<div class="evo-bg" aria-hidden="true"></div><div class="evo-rays" aria-hidden="true"></div><canvas class="evo-fx" aria-hidden="true"></canvas>
    <div class="evo-top"><button class="evo-btn ghost evo-sound" data-evo="sound" aria-pressed="${sound}">${sound ? '🔊 Sound on' : '🔇 Sound off'}</button><button class="evo-btn ghost evo-skip" data-evo="skip">Skip ⏭</button></div>
    <div class="evo-show">
      <div class="evo-head"><div class="evo-kicker">Evolution</div><div class="evo-name">${esc(r.fromName)}</div></div>
      <div class="evo-figure"><div class="evo-rings" aria-hidden="true"><i></i><i></i><i></i></div><div class="evo-glow" aria-hidden="true"></div>
        <div class="evo-sprite from">${monsterSprite(beforeMon, size)}</div><div class="evo-sprite to">${monsterSprite(afterMon, size)}</div></div>
      <div class="evo-banner" aria-hidden="true"><div class="evo-banner-main">${esc(r.fromName.toUpperCase())} EVOLVED INTO <span>${esc(r.toName.toUpperCase())}</span>!</div><div class="evo-banner-sub"><span class="evo-type">${esc(r.type || '')}</span><span>${esc(r.position)}</span><span>${esc(stageLabel(r.toStage))}</span></div></div>
      <p class="evo-caption" aria-live="polite"></p>
    </div>
    <div class="evo-flash" aria-hidden="true"></div>
    <div class="evo-results" tabindex="-1">${evolutionResultsHtml(r, { beforeSprite: monsterSprite(beforeMon, small), afterSprite: monsterSprite(afterMon, big) })}</div>
    <div class="evo-bottom"><button class="evo-btn ghost evo-next" data-evo="results">See results ▸</button><button class="evo-btn ghost evo-replay" data-evo="replay">↺ Replay</button><button class="evo-btn primary evo-continue" data-evo="continue">Continue</button></div>`;
  document.body.appendChild(el); document.documentElement.classList.add('evo-open');
  const $ = (s) => el.querySelector(s); const fig = $('.evo-figure'); const cap = $('.evo-caption');
  const fx = createEvolutionFx($('.evo-fx'), () => { const b = fig.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: size / 2 }; }, { type: r.type, reduced });
  let timers = []; let stage = null; let closed = false; const log = [];
  const at = (ms, fn) => { if (ms != null) timers.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  function setStage(s) {
    stage = s; el.dataset.stage = s; log.push(s); fig.classList.remove('swap-to', 'shake'); el.classList.remove('flashing');
    cap.textContent = CAPTION[s]?.(r) || '';
    if (s === 'A') { fx.clear(); fx.phase('gather'); }
    if (s === 'B') { fx.phase('build'); if (shake) fig.classList.add('shake'); playCue('buildup', sound); }
    if (s === 'C') { fx.phase(reduced ? 'off' : 'build'); T.swaps.forEach((ms, i) => at(ms, () => fig.classList.toggle('swap-to', i % 2 === 0))); at(T.flash, () => { el.classList.add('flashing'); fx.burst(); playCue('transform', sound); }); }
    if (s === 'D') { fx.phase('celebrate'); if (!reduced) fx.burst(); playCue('reveal', sound); }
    if (s === 'E') { fx.phase('off'); fx.clear(); /* the results stay clean: no sparks over the numbers */ const res = $('.evo-results'); res.scrollTop = 0; }
  }
  function play() {
    clearTimers(); setStage('A');
    if (T.B != null) at(T.B, () => setStage('B'));
    at(T.C, () => { setStage('C'); });
    at(T.D, () => setStage('D'));
    at(T.E, () => setStage('E'));
  }
  /** Jump to a stage (Skip → E; the UI check visits each). Inside C, `sub` = 'silhouette' | 'morph' | 'flash'. */
  function goto(s, sub = null) {
    clearTimers(); setStage(s);
    if (s === 'C' && sub) { clearTimers(); if (sub === 'morph') fig.classList.add('swap-to'); if (sub === 'flash') { fig.classList.add('swap-to'); el.classList.add('flashing'); } }
    if (s === 'D') at(T.E - T.D, () => setStage('E'));
  }
  function close() {
    if (closed) return; closed = true; clearTimers(); fx.stop(); el.remove(); document.documentElement.classList.remove('evo-open');
    window.removeEventListener('popstate', close); document.removeEventListener('keydown', onKey); onClose?.();
  }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); if (stage === 'E') close(); else goto('E'); } }
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-evo]')?.dataset.evo;
    if (a === 'skip' || a === 'results') goto('E');
    else if (a === 'replay') play();
    else if (a === 'continue') close();
    else if (a === 'sound') { sound = !sound; if (sound) unlockSound(); const b = $('.evo-sound'); b.textContent = sound ? '🔊 Sound on' : '🔇 Sound off'; b.setAttribute('aria-pressed', String(sound)); onSound?.(sound); }
    else if (!a && stage === 'D' && !e.target.closest('.evo-results')) goto('E'); // a tap on the reveal moves on
  });
  window.addEventListener('popstate', close); document.addEventListener('keydown', onKey);
  el.tabIndex = -1; el.focus({ preventScroll: true }); // focus the dialog itself (keyboard users tab to Skip / Continue; no ring on a phone)
  play();
  const api = { el, goto, play, close, get stage() { return stage; }, get log() { return log.slice(); }, fx, reduced };
  el.__evo = api; // for the UI check (tools/evolution-ui-check.py)
  return api;
}

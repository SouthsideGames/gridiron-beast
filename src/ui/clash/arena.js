// Beast Clash arena: the battle screen. A player of the engine's record: it reads result.log through the
// choreographer and animates exactly what each event says. It never calls the engine and holds no battle
// logic. Monsters are the game's own 16x16 sprites (integer-scaled, crisp), on a pixel floor with shadows
// and ground pads; side B faces side A. Portrait: B top, A bottom. Landscape: A left, B right.
import { esc } from '../dom.js';
import { monsterSprite } from '../pixel-monster.js';
import { stateAt, cuesFor, nextExchangeIndex, DURATION } from './choreographer.js';
import { floorFor, padSvg, SHADOW_SVG, shieldRingSvg, COND_ICON, COND_COLOR, TYPE_COLOR } from './arena-art.js';

// Slot maps: percent of the arena box, [x, y] of the feet. [front, bench1, bench2, ...] in lineup order; a bench
// slot nearer the front is "next up". Landscape: side B mirrors x. Portrait: side B has its own map (sprites hang
// below their feet point, so a plain mirror would push the top row off the box); its HP bars sit above the head.
const PORTRAIT = {
  1: [[50, 72]], 2: [[50, 72], [26, 88]], 3: [[50, 72], [24, 88], [76, 88]],
  4: [[50, 70], [22, 84], [78, 84], [50, 94]], 5: [[50, 70], [20, 82], [80, 82], [34, 93], [66, 93]],
};
const PORTRAIT_B = {
  1: [[50, 40]], 2: [[50, 40], [74, 22]], 3: [[50, 40], [76, 22], [24, 22]],
  4: [[50, 42], [78, 26], [22, 26], [50, 15]], 5: [[50, 42], [80, 26], [20, 26], [66, 15], [34, 15]],
};
const LANDSCAPE = {
  1: [[34, 58]], 2: [[34, 58], [16, 40]], 3: [[34, 58], [16, 36], [16, 80]],
  4: [[35, 58], [19, 34], [19, 82], [7, 58]], 5: [[36, 58], [21, 32], [21, 84], [7, 42], [7, 74]],
};
/** Sprite pixel sizes (multiples of 16 for crisp integer scaling). */
const SIZES = { portrait: { small: { front: 96, bench: 64 }, big: { front: 80, bench: 48 } }, landscape: { small: { front: 96, bench: 64 }, big: { front: 80, bench: 48 } } };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mount the arena into `root` for `result`. Options: { speed, reducedMotion, onCursor(i), onEnd() }.
 * Returns the player API; call destroy() on unmount.
 */
export function createArena(root, result, opts = {}) {
  const cues = cuesFor(result); const n = result.log.length;
  const perSide = Math.max(result.lines.a.length, result.lines.b.length);
  const sizeKey = perSide <= 3 ? 'small' : 'big';
  const floor = floorFor(result.lines.a[0]?.type);
  let speed = opts.speed || 1, cursor = 0, playing = false, token = 0; const live = new Set();
  const reduced = () => !!opts.reducedMotion || document.documentElement.dataset.reducedMotion === '1';
  const isLandscape = () => window.matchMedia('(orientation: landscape) and (min-width: 600px)').matches;
  const all = [...result.lines.a, ...result.lines.b];
  const byId = Object.fromEntries(all.map((x) => [x.id, x]));
  // Where a knocked-out monster lies: the slot it held just before its KO event, read from the record, so Watch,
  // Step, Skip and scrubbing all leave it in the same place.
  const koIndex = {}; result.log.forEach((e, k) => { if (e.kind === 'ko' && e.target && koIndex[e.target] == null) koIndex[e.target] = k; });
  const koSlotCache = { p: {}, l: {} };
  const koSlotFor = (id) => { const c = koSlotCache[isLandscape() ? 'l' : 'p']; if (!(id in c)) c[id] = koIndex[id] == null ? null : slotsFor(id[0], stateAt(result, koIndex[id] - 1))[id] || null; return c[id]; };

  root.innerHTML = `<div class="cl-arena ${sizeKey}">
    <div class="cl-hud"><span class="cl-ex">Exchange <b>0</b> / ${result.exchanges}</span><span class="cl-sd"></span><span class="cl-exp">${result.experiments.length ? `⚠ ${esc(result.experiments.join(', '))}` : ''}</span><div class="cl-exbar"><i></i></div></div>
    <div class="cl-viewport"><div class="cl-stage" style="background-color:${floor.base};background-image:${floor.tile}"><div class="cl-mid" style="background:${floor.line}"></div>
      ${all.map((x) => monsterHtml(x)).join('')}
      <div class="cl-layer"></div>
    </div><div class="cl-dim"></div></div>
    <div class="cl-strips ${Math.max(result.lines.a.length, result.lines.b.length) >= 4 ? 'compact' : ''}">${['a', 'b'].map((s) => `<div class="cl-strip cl-strip-${s}">${result.lines[s].map((x) => `<div class="cl-card" data-card="${x.id}" title="${esc(x.name)}">${monsterSprite(mon(x), 32, { flip: s === 'b' })}<div class="cl-card-body"><div class="cl-card-name">${esc(x.name)}</div><div class="bar"><i></i></div><div class="cl-card-sub"><span class="cl-card-hp"></span><span class="cl-card-sh"></span><span class="cl-card-cond"></span></div></div></div>`).join('')}</div>`).join('')}</div>
    <div class="cl-controls">
      <div class="cl-btnrow"><button class="btn primary" data-cl="watch">▶ Watch</button><button class="btn" data-cl="step">⏭ Step</button><button class="btn" data-cl="nextex">Next ex.</button><button class="btn" data-cl="skip">Skip</button></div>
      <div class="row cl-speedrow"><span class="muted">Speed</span>${[1, 2, 4].map((s) => `<button class="btn small ${s === speed ? 'primary' : ''}" data-cl="speed" data-v="${s}">${s}×</button>`).join('')}<input type="range" min="0" max="${n - 1}" value="0" data-cl="scrub" aria-label="Replay position"></div>
      <div class="cl-caption"></div>
    </div></div>`;
  const $ = (sel) => root.querySelector(sel); const $$ = (sel) => Array.from(root.querySelectorAll(sel));
  const stage = $('.cl-stage'), viewport = $('.cl-viewport'), layer = $('.cl-layer'), dimEl = $('.cl-dim'), caption = $('.cl-caption');
  const monEl = Object.fromEntries(all.map((x) => [x.id, $(`.cl-mon[data-id="${x.id}"]`)]));

  function mon(x) { return { species: x.species, name: x.name, stage: x.combatant.stage, id: x.combatant.monsterId }; }
  function monsterHtml(x) {
    const side = x.id[0]; const size = SIZES.portrait[sizeKey].front;
    return `<div class="cl-mon side-${side}" data-id="${x.id}" style="--size:${size}px"><div class="cl-ground">${SHADOW_SVG}${padSvg(false)}</div><div class="cl-ring-wrap"></div><div class="cl-body">${monsterSprite(mon(x), 16, { flip: side === 'b' })}</div>
      <div class="cl-bar"><span class="cl-cond"></span><div class="cl-hp"><i class="cl-hp-ghost"></i><i class="cl-hp-fill"></i><i class="cl-hp-shield"></i></div><span class="cl-sh"></span></div></div>`;
  }

  // ---- state
  function slotsFor(side, st) {
    const land = isLandscape(); const map = (land ? LANDSCAPE : side === 'b' ? PORTRAIT_B : PORTRAIT)[Math.max(1, Math.min(5, result.lines[side].length))];
    const alive = st.order[side].filter((id) => !st.S[side][id].ko); const out = {};
    alive.forEach((id, i) => { const [x, y] = map[Math.min(i, map.length - 1)]; out[id] = { x: side === 'b' && land ? 100 - x : x, y, front: i === 0, row: i === 0 ? 0 : i <= 2 ? 1 : 2 }; });
    return out;
  }
  function applyState(st, { instant = false } = {}) {
    const sizes = SIZES[isLandscape() ? 'landscape' : 'portrait'][sizeKey];
    for (const side of ['a', 'b']) {
      const slots = slotsFor(side, st);
      for (const id of st.order[side]) {
        const s = st.S[side][id]; const el = monEl[id]; const slot = slots[id] || (s.ko && koSlotFor(id)) || { x: 50, y: 50, front: false, row: 1 };
        el.classList.toggle('no-move', instant);
        el.style.left = `${slot.x}%`; el.style.top = `${slot.y}%`; el.style.zIndex = String(Math.round(slot.y));
        const size = slot.front ? sizes.front : slot.row === 2 ? sizes.bench - 16 : sizes.bench;
        el.style.setProperty('--size', `${Math.max(32, size)}px`);
        el.classList.toggle('front', !!slot.front); el.classList.toggle('ko', !!s.ko); el.classList.toggle('bench', !slot.front && !s.ko);
        el.querySelector('.cl-ground').innerHTML = SHADOW_SVG + padSvg(!!slot.front && !s.ko);
        const pct = Math.max(0, s.hp / s.maxHp * 100); const sh = Math.min(100, s.shield / s.maxHp * 100);
        el.querySelector('.cl-hp-fill').style.width = `${pct}%`; el.querySelector('.cl-hp-fill').className = `cl-hp-fill ${pct < 30 ? 'low' : pct < 60 ? 'mid' : ''}`;
        if (instant) el.querySelector('.cl-hp-ghost').style.width = `${pct}%`;
        el.querySelector('.cl-hp-shield').style.width = `${sh}%`;
        el.querySelector('.cl-sh').textContent = s.shield ? `🛡${s.shield}` : '';
        const cond = s.cond || s.paused; const condEl = el.querySelector('.cl-cond'); condEl.textContent = cond ? COND_ICON[cond] : ''; condEl.title = cond ? `${cond}${s.paused && !s.cond ? ' (paused)' : ''}` : ''; condEl.style.opacity = s.paused && !s.cond ? '0.6' : '1';
        el.querySelector('.cl-ring-wrap').innerHTML = s.shield > 0 && !s.ko ? shieldRingSvg(s.shield / s.maxHp) : '';
        el.dataset.cond = cond || '';
        const card = $(`.cl-card[data-card="${id}"]`); card.classList.toggle('ko', !!s.ko); card.classList.toggle('front', !!slot.front && !s.ko);
        card.querySelector('.bar > i').style.width = `${pct}%`; card.querySelector('.bar').className = `bar ${pct < 30 ? 'bad' : pct < 60 ? 'warn' : ''}`;
        card.querySelector('.cl-card-hp').textContent = `${s.hp}/${s.maxHp}`; card.querySelector('.cl-card-sh').textContent = s.shield ? `🛡${s.shield}` : ''; card.querySelector('.cl-card-cond').textContent = cond ? COND_ICON[cond] : '';
      }
    }
    $('.cl-ex b').textContent = String(st.ex); $('.cl-exbar i').style.width = `${Math.min(100, st.ex / 30 * 100)}%`;
    $('.cl-sd').textContent = st.ramp > 1 ? `⚡ Sudden death ×${st.ramp.toFixed(2)}` : ''; viewport.classList.toggle('sudden', st.ramp > 1);
    $('[data-cl="scrub"]').value = String(st.i);
    caption.textContent = result.log[st.i]?.text || '';
  }

  // ---- animation helpers (Web Animations API; every duration is divided by the speed; reduced motion skips motion)
  const dur = (ms) => (reduced() ? 0 : ms / speed);
  function anim(el, frames, ms, easing = 'ease-out') { if (!el || dur(ms) <= 0) return Promise.resolve(); const a = el.animate(frames, { duration: dur(ms), easing, fill: 'none' }); live.add(a); return a.finished.catch(() => {}).finally(() => live.delete(a)); }
  const body = (id) => monEl[id]?.querySelector('.cl-body');
  const towards = (from, to) => { if (!from || !to) return { dx: 0, dy: 0 }; const a = monEl[from].getBoundingClientRect(), b = monEl[to].getBoundingClientRect(); return { dx: b.left + b.width / 2 - (a.left + a.width / 2), dy: b.top + b.height / 2 - (a.top + a.height / 2) }; };
  function floatText(id, text, cls, ms = 900, at = 0.6) {
    const el = monEl[id]; if (!el) return; const f = document.createElement('div'); f.className = `cl-float ${cls}`; f.textContent = text;
    // Pops at chest height on the target and rises past the head, so it reads as that monster's number.
    f.style.left = el.style.left; f.style.top = `calc(${el.style.top} - ${el.style.getPropertyValue('--size') || '64px'} * ${at})`; layer.appendChild(f);
    anim(f, [{ transform: 'translate(-50%, -40%) scale(0.6)', opacity: 0 }, { transform: 'translate(-50%, -90%) scale(1.15)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%, -170%) scale(1)', opacity: 0 }], ms).then(() => f.remove());
    if (dur(ms) <= 0) setTimeout(() => f.remove(), 600);
  }
  function banner(text, cls = '', ms = 1200) {
    const b = document.createElement('div'); b.className = `cl-banner ${cls}`; b.textContent = text; viewport.appendChild(b);
    anim(b, [{ transform: 'translate(-50%, -50%) scale(0.7)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1.05)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%, -60%) scale(1)', opacity: 0 }], ms).then(() => b.remove());
    if (dur(ms) <= 0) setTimeout(() => b.remove(), 800);
  }
  function camera(c) {
    if (!c || reduced()) { stage.style.transform = ''; return; }
    const land = isLandscape(); const z = c.zoom && c.zoom > 1 ? (land ? c.zoom : 1 + (c.zoom - 1) * 0.6) : 1;
    const ids = (c.focus || []).filter((id) => id && monEl[id]);
    if (z > 1 && ids.length) { const xs = ids.map((id) => parseFloat(monEl[id].style.left)), ys = ids.map((id) => parseFloat(monEl[id].style.top)); stage.style.transformOrigin = `${xs.reduce((s, v) => s + v, 0) / xs.length}% ${ys.reduce((s, v) => s + v, 0) / ys.length}%`; stage.style.transform = `scale(${z})`; }
    else stage.style.transform = '';
    dimEl.classList.toggle('on', !!c.dim);
    if (c.shake) anim(viewport, [{ transform: 'translate(0,0)' }, { transform: `translate(${c.shake}px, ${-c.shake / 2}px)` }, { transform: `translate(${-c.shake}px, ${c.shake / 2}px)` }, { transform: `translate(${c.shake / 2}px, 0)` }, { transform: 'translate(0,0)' }], 320, 'linear');
  }
  const settle = () => { stage.style.transform = ''; dimEl.classList.remove('on'); };

  // ---- one cue
  async function playCue(cue) {
    const e = cue.event; const D = cue.duration; const st = stateAt(result, cue.i);
    camera(cue.camera);
    const name = (() => { const c = e.actor && byId[e.actor]?.combatant; return c && e.text.includes(c.move.name) ? c.move.name : null; })();
    switch (cue.move) {
      case 'lunge': case 'lunge-heavy': {
        const heavy = cue.move === 'lunge-heavy' || cue.tier === 'major'; const A = body(e.actor), T = body(e.target); const { dx, dy } = towards(e.actor, e.target);
        const back = heavy ? 0.16 : 0.08, reach = heavy ? 0.72 : 0.55;
        if (name && (heavy || cue.tier !== 'routine')) banner(name, cue.tier === 'major' ? 'major' : 'power', D * 0.9);
        await anim(A, [{ transform: 'translate(0,0) scale(1,1)' }, { transform: `translate(${-dx * back}px, ${-dy * back}px) scale(1.08, 0.9)` }], D * (heavy ? 0.3 : 0.2), 'ease-in');
        await anim(A, [{ transform: `translate(${-dx * back}px, ${-dy * back}px) scale(1.08, 0.9)` }, { transform: `translate(${dx * reach}px, ${dy * reach}px) scale(0.95, 1.08)` }], D * 0.18, 'cubic-bezier(.2,.8,.3,1)');
        // impact: the state carries the real numbers
        applyState(st); floatText(e.target, cue.number.absorbed && cue.number.value ? `-${cue.number.value}` : `-${cue.number.value}`, 'dmg' + (heavy ? ' big' : ''));
        if (cue.number.absorbed) floatText(e.target, `${cue.number.absorbed} absorbed`, 'shield', 1000, 0.15);
        anim(T, [{ filter: 'brightness(3)', transform: `translate(${dx > 0 ? 10 : -10}px, 0)` }, { filter: 'brightness(1)', transform: 'translate(0,0)' }], D * 0.35, 'ease-out');
        await anim(A, [{ transform: `translate(${dx * reach}px, ${dy * reach}px) scale(0.95, 1.08)` }, { transform: 'translate(0,0) scale(1,1)' }], D * 0.3, 'ease-out');
        break;
      }
      case 'burst': { applyState(st); floatText(e.target, `-${cue.number.value}`, 'dmg'); await anim(body(e.target), [{ filter: 'brightness(2.5)' }, { filter: 'brightness(1)' }], D * 0.6); break; }
      case 'burn-tick': { applyState(st); floatText(e.target, `-${cue.number.value}`, 'dmg burn', 700); await anim(body(e.target), [{ filter: 'sepia(1) saturate(4) hue-rotate(-20deg)' }, { filter: 'none' }], D); break; }
      case 'mend': { applyState(st); if (cue.number.value > 0) floatText(e.target, `+${cue.number.value}`, 'heal'); else floatText(e.target, 'full', 'note', 600); await anim(body(e.target), [{ filter: 'brightness(1)' }, { filter: 'brightness(1.6) drop-shadow(0 0 6px #4ade80)' }, { filter: 'brightness(1)' }], D); break; }
      case 'shield': { applyState(st); floatText(e.target, `🛡+${cue.number.value}`, 'shield'); await anim(monEl[e.target]?.querySelector('.cl-ring-wrap'), [{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], D); break; }
      case 'shatter': { const r = monEl[e.target]?.querySelector('.cl-ring-wrap'); await anim(r, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], D * 0.7); applyState(st); floatText(e.target, 'shield broken', 'shield', 700); break; }
      case 'dodge': { const { dx } = towards(e.actor, e.target); const T = body(e.target); floatText(e.target, cue.label || 'miss', 'note', 700); anim(body(e.actor), [{ transform: 'translate(0,0)' }, { transform: `translate(${dx * 0.4}px,0)` }, { transform: 'translate(0,0)' }], D * 0.7); await anim(T, [{ transform: 'translate(0,0)', filter: 'blur(0)' }, { transform: `translate(${dx > 0 ? 18 : -18}px,0)`, filter: 'blur(1px)' }, { transform: 'translate(0,0)', filter: 'blur(0)' }], D * 0.7); applyState(st); break; }
      case 'afflict': { applyState(st); const col = COND_COLOR[e.condition] || '#fff'; floatText(e.target, `${COND_ICON[e.condition] || ''} ${cue.label}`, 'cond', 900); await anim(body(e.target), [{ filter: `drop-shadow(0 0 0 ${col})` }, { filter: `drop-shadow(0 0 10px ${col}) brightness(1.4)` }, { filter: 'none' }], D); break; }
      case 'resist': { applyState(st); floatText(e.target || e.actor, cue.label || 'resisted', 'note', 600); await anim(body(e.target || e.actor), [{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], D); break; }
      case 'clear': { applyState(st); floatText(e.target, cue.label, 'note', 600); await wait(dur(D)); break; }
      case 'skip': { applyState(st); floatText(e.actor, cue.label, 'cond', 900); await anim(body(e.actor), [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,0)' }, { transform: 'translate(4px,0)' }, { transform: 'translate(-3px,0)' }, { transform: 'translate(0,0)' }], D * 0.6, 'linear'); break; }
      case 'yank': { const out = e.out; banner(e.text.split(':')[0], 'power', D * 0.8); await anim(body(out), [{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(0,-30px) rotate(-25deg)' }], D * 0.3, 'ease-in'); applyState(st); await wait(dur(D * 0.7)); break; }
      case 'walk': case 'enter': case 'walk-back': { applyState(st); if (cue.move === 'enter' && e.ex > 0) { await anim(body(e.actor), [{ transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], D * 0.8); } else await wait(dur(D)); break; }
      case 'ko': {
        const T = body(e.target); await anim(T, [{ filter: 'brightness(1)' }, { filter: 'brightness(4)' }, { filter: 'brightness(1)' }, { filter: 'brightness(4)' }, { filter: 'brightness(1)' }], D * 0.3, 'linear');
        if (cue.tier === 'major') banner('Knockout!', 'major', D * 0.9);
        await anim(T, [{ transform: 'rotate(0) translateY(0)', opacity: 1 }, { transform: 'rotate(80deg) translateY(12px)', opacity: 0.9, offset: 0.6 }, { transform: 'rotate(80deg) translateY(30px) scale(0.6)', opacity: 0 }], D * 0.6, 'ease-in');
        applyState(st); break;
      }
      case 'sudden-death': { banner('Sudden death!', 'sd', D); applyState(st); await wait(dur(D * 0.8)); break; }
      case 'cap': case 'coin': { banner(cue.label, 'major', D); applyState(st); await wait(dur(D * 0.8)); break; }
      case 'victory': {
        applyState(st); const side = e.winner; banner(`Side ${side.toUpperCase()} wins!`, 'major win', D * 1.4);
        const hop = (id) => anim(body(id), [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }], D, 'ease-in-out');
        await Promise.all(st.order[side].filter((id) => !st.S[side][id].ko).map(hop)); break;
      }
      case 'buff': case 'debuff': { applyState(st); const t = e.target || e.actor; floatText(t, e.text.split(':').slice(1).join(':').trim().slice(0, 28) || cue.kind, 'note', 800); await wait(dur(D)); break; }
      case 'refused': { applyState(st); floatText(e.target || e.actor, 'held', 'note', 600); await wait(dur(D * 0.6)); break; }
      case 'dim': { dimEl.classList.add('on'); applyState(st); await wait(dur(D)); dimEl.classList.remove('on'); break; }
      case 'coin-small': { applyState(st); floatText(e.actor, 'coin flip', 'note', 500); await wait(dur(D)); break; }
      default: { applyState(st); await wait(dur(D)); }
    }
    if (cue.camera?.zoom > 1 || cue.camera?.dim) { await wait(dur(120)); settle(); }
  }

  // ---- playback
  function cancelAll() { for (const a of live) a.cancel(); live.clear(); settle(); }
  function setCursor(i, { animate = false } = {}) { cancelAll(); cursor = Math.max(0, Math.min(n - 1, i)); applyState(stateAt(result, cursor), { instant: !animate }); opts.onCursor?.(cursor); const sc = $('[data-cl="scrub"]'); if (sc) sc.value = String(cursor); setButtons(); }
  async function runTo(target) {
    if (playing) return; playing = true; const my = ++token; setButtons();
    while (playing && my === token && cursor < target) { cursor += 1; await playCue(cues[cursor]); opts.onCursor?.(cursor); $('[data-cl="scrub"]').value = String(cursor); }
    if (my === token) { playing = false; setButtons(); if (cursor >= n - 1) opts.onEnd?.(); }
  }
  function pause() { playing = false; token++; cancelAll(); applyState(stateAt(result, cursor), { instant: true }); setButtons(); }
  function setButtons() { const w = $('[data-cl="watch"]'); if (w) w.textContent = playing ? '⏸ Pause' : cursor >= n - 1 ? '↻ Replay' : '▶ Watch'; }
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-cl]'); if (!b) return; const k = b.dataset.cl;
    if (k === 'watch') { if (playing) pause(); else { if (cursor >= n - 1) setCursor(0); runTo(n - 1); } }
    if (k === 'step') { if (playing) pause(); else if (cursor < n - 1) runTo(cursor + 1); }
    if (k === 'nextex') { if (playing) pause(); else if (cursor < n - 1) runTo(Math.max(cursor + 1, nextExchangeIndex(result, cursor + 1))); }
    if (k === 'skip') { pause(); setCursor(n - 1); if (cursor >= n - 1) opts.onEnd?.(); }
    if (k === 'speed') { speed = Number(b.dataset.v) || 1; for (const s of $$('[data-cl="speed"]')) s.classList.toggle('primary', Number(s.dataset.v) === speed); }
  });
  $('[data-cl="scrub"]').addEventListener('input', (ev) => { const to = Number(ev.target.value) || 0; pause(); setCursor(to); }); // read before pause() re-syncs the slider
  const onResize = () => applyState(stateAt(result, cursor), { instant: true }); window.addEventListener('resize', onResize);
  setCursor(0);
  return {
    get cursor() { return cursor; }, get playing() { return playing; }, cues,
    setCursor, play: () => runTo(n - 1), pause, step: () => runTo(cursor + 1), skip: () => { pause(); setCursor(n - 1); },
    setSpeed(s) { speed = s; }, destroy() { playing = false; token++; cancelAll(); window.removeEventListener('resize', onResize); root.innerHTML = ''; },
  };
}
export { DURATION };

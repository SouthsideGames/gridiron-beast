// Beast Clash arena: the battle screen. A player of the engine's record: it reads result.log through the
// choreographer and animates exactly what each event says. It never calls the engine and holds no battle
// logic. Monsters are the game's own 16x16 sprites (rasterised once as <img>, integer-scaled, crisp) on a
// themed pixel floor with shadows, ground pads and props; side B faces side A. Portrait: B top, A bottom.
// Landscape: A left, B right. Phase 3 adds the effects canvas (fx.js), elemental attacks, hit-stop,
// knockback, knockout exits, entrances, name tags, tap-to-inspect and a low-effects mode.
// Task 8 (t8 mode): a result from the t8 engine (result.ruleset === 't8') is played through the t8 timeline (./t8/timeline.js) and the
// ability presentation layer (./t8/fx-t8.js: two SVG layers, under and over the monsters, redrawn per frame from a playback clock), with
// the shared status badge, the ability icons and the turn markers in the information layer. The legacy path is unchanged.
// Reconciled (task8-m4-reconcile): one arena for both Task 8 branches. Native t8 mode is the primary presentation; the M4 player API
// (playTo, record, length, controls: false, the silent tier, revive, the looks override point, the status glyphs) works in every mode.
import { frameGate } from '../frame-rate.js';
import { esc } from '../dom.js';
import { monsterSprite } from '../pixel-monster.js';
import { stateAt, cuesFor, nextExchangeIndex, DURATION } from './choreographer.js';
import { themeFor, decorSvg, padSvg, SHADOW_SVG, shieldRingSvg, COND_ICON as LEGACY_COND_ICON, COND_COLOR as LEGACY_COND_COLOR } from './arena-art.js';
import { createFx } from './fx.js';
import { reducedFlash as flashPref } from '../flash-pref.js';
import { toArenaRecord, isT8Result, T8_STATUS_ICON, T8_STATUS_COLOR } from './t8-record.js';
import { t8StateAt, t8CuesFor, t8NextExchangeIndex, STATUS_NAME } from './t8/timeline.js';
import { buildClashT8, drawClashT8, t8Live } from './t8/fx-t8.js';
import { STATUS_GLYPH } from '../fx/overhead.js';
import { t as $t } from '../../text/index.js';

// Condition glyphs: the legacy conditions and the Task 8 shared statuses (the translated path's functional cues; in native t8 mode the
// status badge of the information layer carries the status, and the strips use STATUS_GLYPH with T8_STATUS_ICON as the fallback).
const COND_ICON = { ...LEGACY_COND_ICON, ...T8_STATUS_ICON }; const COND_COLOR = { ...LEGACY_COND_COLOR, ...T8_STATUS_COLOR };
const t8Glyph = (id) => STATUS_GLYPH[id] || T8_STATUS_ICON[id] || '•';

/**
 * Which presentation path a result takes (pure; the arena's dispatch, exported for the tests):
 *   'native'     a t8 result (ruleset 't8'): the t8 timeline, the ability looks and the two overlay layers (the primary presentation);
 *   'translated' a t8 result with opts.t8 === 'translated': translated to the legacy record shape (toArenaRecord) and played through
 *                the legacy cue system with functional cues only (kept for legacy-shaped consumers and as a fallback);
 *   'legacy'     a pre-M4 record (ruleset 'current' / 'v1.0.0' / none): the legacy cue path, unchanged (D19).
 */
export function arenaMode(result, opts = {}) { return isT8Result(result) ? (opts.t8 === 'translated' ? 'translated' : 'native') : 'legacy'; }

// Slot maps: percent of the arena box, [x, y] of the feet. [front, bench1, bench2, ...] in lineup order; a bench
// slot nearer the front is "next up". Landscape: side B mirrors x. Portrait: side B has its own map (sprites hang
// above their feet point, so a plain mirror would push the top row off the box). Tags always hang below the feet.
// The two actives sit on a slight diagonal so they engage across the midline without stacking.
const PORTRAIT = {
  1: [[36, 72]], 2: [[36, 72], [12, 90]], 3: [[36, 72], [12, 90], [72, 91]],
  4: [[36, 70], [60, 88], [14, 88], [86, 88]], 5: [[36, 70], [60, 88], [14, 88], [86, 88], [38, 93]],
};
const PORTRAIT_B = {
  1: [[64, 48]], 2: [[64, 48], [88, 27]], 3: [[64, 48], [88, 27], [28, 25]],
  4: [[64, 48], [68, 18], [38, 17], [89, 17]], 5: [[64, 48], [66, 18], [38, 17], [90, 17], [12, 18]],
};
const LANDSCAPE = {
  1: [[36, 60]], 2: [[36, 60], [16, 40]], 3: [[36, 60], [15, 36], [15, 80]],
  4: [[37, 60], [20, 34], [20, 82], [7, 58]], 5: [[38, 60], [21, 32], [21, 82], [7, 42], [7, 76]],
};
const LANDSCAPE_TIGHT = { // landscape stages narrower than 420 px (small phones): slots pulled in from the rim
  1: [[38, 62]], 2: [[38, 62], [18, 40]], 3: [[38, 62], [17, 38], [17, 84]],
  4: [[39, 62], [22, 36], [22, 86], [10, 60]], 5: [[40, 62], [22, 34], [22, 88], [10, 46], [10, 78]],
};
/** Sprite pixel sizes (multiples of 16 for crisp integer scaling), by lineup size and stage height. No reserve is drawn below 48 px. */
function sizesFor(sizeKey, stageH, land) {
  const t = land ? [300, 240] : [400, 320]; // landscape stages are wide, so a shorter box still fits the larger tiers
  if (sizeKey === 'small') return stageH >= t[0] ? { front: 112, bench: 64 } : stageH >= t[1] ? { front: 96, bench: 64 } : { front: 80, bench: 48 };
  return stageH >= t[0] ? { front: 96, bench: 48 } : stageH >= t[1] ? { front: 80, bench: 48 } : { front: 64, bench: 48 };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const spriteImg = (svg) => `<img class="cl-sprite" alt="" draggable="false" src="data:image/svg+xml;utf8,${encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}">`;

/**
 * Mount the arena into `root` for `result`. Options: { speed, reducedMotion, reducedFlash (soften flashes; the saved setting applies anyway), onCursor(i), onEnd(), onQuality(q),
 *   names: { a, b } (team names for the strips, the matchup line and the victory banner; default 'Side A' / 'Side B'),
 *   edge: (attackerType, defenderType) => 'strong' | 'weak' | 'even' (the matchup line's type edge; the arena itself never imports the engine),
 *   simple: true (franchise battles: Watch / Speed / Skip only, no step, scrubber or FX toggle),
 *   controls: false (no control row at all: the host drives playback through the API, as the Clash reviewer does),
 *   quality: 'full' | 'low' | 'min' (the starting effects quality; 'min' only in native t8 mode), subject: abilityId (native t8: the
 *     reviewer's subject ability, see buildClashT8 `only`),
 *   t8: 'native' (default) | 'translated' (play a t8 result through the translated legacy record and functional cues instead),
 *   looks: (cue, api) => Promise | falsy (the Clash looks hook, an OVERRIDE POINT: called before every cue in every mode; a truthy return
 *     takes that cue over and the arena then only applies the state after it; falsy lets the arena present the cue. In native t8 mode the
 *     built-in looks (src/ui/clash/t8/looks) already draw every Clash ability from the playback clock, so no consumer needs the hook: the
 *     clock is moved to the cue before the hook runs, so the ability layers keep drawing under an override. `cue.event` is the raw t8
 *     event in native mode and the translated event (raw one in `cue.event.t8`) in translated mode; the api adds { mode, t8, time(), redraw() }) }.
 * Dispatch (arenaMode): a t8 result plays natively (t8 timeline + looks + the two overlay layers); a pre-M4 record plays through the
 * legacy cue path unchanged (D19). Returns the player API; call destroy() on unmount.
 */
export function createArena(root, result, opts = {}) {
  const passed = result; const mode = arenaMode(result, opts);
  if (mode === 'translated') result = toArenaRecord(result);
  const t8 = mode === 'native';
  const cues = t8 ? t8CuesFor(result) : cuesFor(result); const n = result.log.length;
  const t8state = t8 ? buildClashT8(result, cues, { only: opts.subject || null }) : null;
  /** t8 state in the legacy arena shape ({ S: { a: { id: {...} } }, order, front, ramp, ex, i }); shield = the Shielded pool, statuses in `t8status`. */
  const t8Legacy = (st) => { const S = { a: {}, b: {} }; for (const id of Object.keys(st.S)) { const x = st.S[id]; S[id[0]][id] = { ...x, shield: x.status?.id === 'shielded' ? x.status.pool || 0 : 0, cond: null, paused: null, t8status: x.status }; } return { S, order: st.order, front: st.front, ramp: st.ramp, ex: st.ex, i: st.i, turnOrder: st.turnOrder }; };
  const stateOf = (i) => (t8 ? t8Legacy(t8StateAt(result, i)) : stateAt(result, i));
  const nextEx = (i) => (t8 ? t8NextExchangeIndex(result, i) : nextExchangeIndex(result, i));
  const perSide = Math.max(result.lines.a.length, result.lines.b.length);
  const sizeKey = perSide <= 3 ? 'small' : 'big';
  const theme = themeFor(result);
  let speed = opts.speed || 1, cursor = 0, playing = false, token = 0, quality = opts.quality || 'full'; const live = new Set();
  const reduced = () => !!opts.reducedMotion || document.documentElement.dataset.reducedMotion === '1';
  // Reduce flashes (flash-pref.js): the setting, or the caller's option. Flashes and strobes are softened; nothing is hidden.
  const softFlash = () => !!opts.reducedFlash || flashPref();
  const calm = (frames) => frames.map((fr) => (typeof fr.filter === 'string' ? { ...fr, filter: fr.filter.replace(/brightness\((\d+(?:\.\d+)?)\)/g, (m, v) => (Number(v) > 1.5 ? 'brightness(1.5)' : m)) } : fr));
  const isLandscape = () => window.matchMedia('(orientation: landscape) and (min-width: 600px)').matches;
  const all = [...result.lines.a, ...result.lines.b];
  const byId = Object.fromEntries(all.map((x) => [x.id, x]));

  const names = { a: opts.names?.a || $t('clash.side_a'), b: opts.names?.b || $t('clash.side_b') }; const simple = !!opts.simple; const noControls = opts.controls === false;
  root.innerHTML = `<div class="cl-arena ${sizeKey} theme-${theme.key} ${simple ? 'simple' : ''} ${t8 ? 't8' : ''}">
    <div class="cl-hud"><span class="cl-ex">${$t('clash.exchange_b_0_b', { exchanges: result.exchanges })}</span><span class="cl-sd"></span><span class="cl-standing"></span><span class="cl-order muted"></span><span class="cl-theme muted">${esc(theme.name)}</span><span class="cl-exp">${result.experiments?.length ? `⚠ ${esc(result.experiments.join(', '))}` : ''}${t8 && result.provisional ? $t('clash.provisional_readings_on') : ''}</span><div class="cl-exbar"><i></i></div></div>
    <div class="cl-matchup" aria-live="polite"></div>
    <div class="cl-viewport"><div class="cl-stage" style="background-color:${theme.base};background-image:${theme.tile}">
      <div class="cl-half cl-half-a" style="background:${theme.halfA}"></div><div class="cl-half cl-half-b" style="background:${theme.halfB}"></div><div class="cl-mid" style="background:${theme.line}"></div>
      ${decorSvg(theme, result.seed || 1, isLandscape())}
      ${t8 ? '<svg class="cl-t8 cl-t8-under" aria-hidden="true"></svg>' : ''}
      ${all.map((x) => monsterHtml(x)).join('')}
      <canvas class="cl-fx"></canvas>
      ${t8 ? '<svg class="cl-t8 cl-t8-over" aria-hidden="true"><g class="fx"></g><g class="hud"></g></svg>' : ''}
      <div class="cl-layer"></div>
    </div><div class="cl-dim"></div></div>
    <div class="cl-strips ${perSide >= 4 ? 'compact' : ''}">${['a', 'b'].map((s) => `<div class="cl-strip-wrap"><div class="cl-strip-label ${s === 'a' ? 'mine' : ''}">${esc(names[s])}</div><div class="cl-strip cl-strip-${s}">${result.lines[s].map((x) => `<div class="cl-card" data-card="${x.id}" title="${esc(x.name)}">${spriteImg(monsterSprite(mon(x), 16, { flip: s === 'b' }))}<div class="cl-card-body"><div class="cl-card-name">${esc(x.name)}</div><div class="bar"><i></i></div><div class="cl-card-sub"><span class="cl-card-hp"></span><span class="cl-card-sh"></span><span class="cl-card-cond"></span></div></div><span class="cl-card-ko">KO</span></div>`).join('')}</div></div>`).join('')}</div>
    <div class="cl-controls" ${noControls ? 'style="display:none"' : ''}>
      ${simple
        ? `<div class="cl-btnrow simple"><button class="btn primary" data-cl="watch">${$t('clash.watch')}</button><span class="cl-speedrow row"><span class="muted">${$t('clash.speed')}</span>${[1, 2, 4].map((s) => `<button class="btn small ${s === speed ? 'primary' : ''}" data-cl="speed" data-v="${s}">${s === 1 ? $t('clash.normal') : s === 2 ? $t('clash.fast') : $t('clash.fastest')}</button>`).join('')}</span><button class="btn" data-cl="skip">${$t('clash.skip')}</button></div>`
        : `<div class="cl-btnrow"><button class="btn primary" data-cl="watch">${$t('clash.watch')}</button><button class="btn" data-cl="step">${$t('clash.step')}</button><button class="btn" data-cl="nextex">${$t('clash.next_ex')}</button><button class="btn" data-cl="skip">${$t('clash.skip_2')}</button></div>
      <div class="row cl-speedrow"><span class="muted">${$t('clash.speed')}</span>${[1, 2, 4].map((s) => `<button class="btn small ${s === speed ? 'primary' : ''}" data-cl="speed" data-v="${s}">${s}×</button>`).join('')}<input type="range" min="0" max="${n - 1}" value="0" data-cl="scrub" aria-label="${$t('clash.replay_position')}"><button class="btn small ghost" data-cl="fxq" title="${$t('clash.effects_quality')}">FX ${quality === 'low' ? $t('clash.low') : $t('clash.full')}</button></div>`}
      <div class="cl-caption"></div>
    </div></div>`;
  const $ = (sel) => root.querySelector(sel); const $$ = (sel) => Array.from(root.querySelectorAll(sel));
  const stage = $('.cl-stage'), viewport = $('.cl-viewport'), layer = $('.cl-layer'), dimEl = $('.cl-dim'), caption = $('.cl-caption');
  const monEl = Object.fromEntries(all.map((x) => [x.id, $(`.cl-mon[data-id="${x.id}"]`)]));
  const fx = createFx($('.cl-fx'), { speed: () => speed, reduced, quality: () => quality, reducedFlash: softFlash });
  const t8under = $('.cl-t8-under'), t8over = $('.cl-t8-over');
  /** The drawing api handed to the looks hook (read-only on the record; the hook draws, the arena keeps the state). In native t8 mode it
   *  adds the t8 presentation state, the playback time and the layer redraw, and `stateAt` returns the native state in the arena shape. */
  const looksApi = () => Object.freeze({ chest, feet, fx, stage, layer, viewport, speed: () => speed, reduced, quality: () => quality, floatText, banner, anim, rig, body, monEl: (id) => monEl[id], applyState: (st) => applyState(st), stateAt: (i) => stateOf(i), byId, names, dur, mode, t8: t8state, time: () => (t8 ? t8Time() : null), redraw: () => (t8 ? t8Draw() : undefined) });

  function mon(x) { return { species: x.species, name: x.name, stage: x.combatant.stage, id: x.combatant.monsterId }; }
  function monsterHtml(x) {
    const side = x.id[0]; const size = sizesFor(sizeKey, 440).front;
    return `<div class="cl-mon side-${side}" data-id="${x.id}" style="--size:${size}px"><div class="cl-rig"><div class="cl-ground">${SHADOW_SVG}${padSvg(false)}</div><div class="cl-ring-wrap"></div><div class="cl-body">${spriteImg(monsterSprite(mon(x), 16, { flip: side === 'b' }))}</div>
      <div class="cl-tag"><div class="cl-name">${esc(x.name)}</div><div class="cl-bar"><span class="cl-cond"></span><div class="cl-hp"><i class="cl-hp-ghost"></i><i class="cl-hp-fill"></i><i class="cl-hp-shield"></i></div><span class="cl-sh"></span></div></div></div></div>`;
  }

  // ---- state
  function slotsFor(side, st) {
    const land = isLandscape(); const map = (land ? (stage.clientWidth < 420 ? LANDSCAPE_TIGHT : LANDSCAPE) : side === 'b' ? PORTRAIT_B : PORTRAIT)[Math.max(1, Math.min(5, result.lines[side].length))];
    const alive = st.order[side].filter((id) => !st.S[side][id].ko).sort((p, q) => (p === st.front?.[side] ? -1 : q === st.front?.[side] ? 1 : 0)); const out = {}; // the active fighter stands at the front slot (t8: a rotation makes a reserve active without reordering the lineup)
    alive.forEach((id, i) => { const [x, y] = map[Math.min(i, map.length - 1)]; out[id] = { x: side === 'b' && land ? 100 - x : x, y, front: i === 0, row: i === 0 ? 0 : i <= 2 ? 1 : 2 }; });
    return out;
  }
  function applyState(st, { instant = false } = {}) {
    if (!root.isConnected || !root.querySelector('.cl-stage')) return; // destroyed (or unmounted) while a cue was in flight
    const sizes = sizesFor(sizeKey, stage.clientHeight || 440, isLandscape()); const H = stage.clientHeight || 440;
    for (const side of ['a', 'b']) {
      const slots = slotsFor(side, st);
      for (const id of st.order[side]) {
        const s = st.S[side][id]; const el = monEl[id]; const slot = slots[id] || { x: side === 'a' ? 50 : 50, y: side === 'a' ? 100 : 0, front: false, row: 1 };
        el.classList.toggle('no-move', instant);
        const size = slot.front ? sizes.front : sizes.bench;
        // safety clamp for very short stages: the sprite's head stays inside the top edge, its tag inside the bottom edge
        const yPx = Math.min(H - 36, Math.max(size + 4, slot.y / 100 * H)); const yPct = yPx / H * 100;
        el.style.left = `${slot.x}%`; el.style.top = `${yPct}%`; el.style.zIndex = String(Math.round(yPct) + (slot.front ? 5 : 0));
        el.style.setProperty('--size', `${size}px`);
        el.classList.toggle('front', !!slot.front && !s.ko); el.classList.toggle('bench', !slot.front && !s.ko);
        // a knocked-out monster has left the field: it lives on in its roster card
        if (s.ko && !el.classList.contains('gone')) { el.classList.add('gone'); el.classList.remove('front', 'bench', 'acting'); } else if (!s.ko) el.classList.remove('gone');
        el.querySelector('.cl-ground').innerHTML = SHADOW_SVG + padSvg(!!slot.front && !s.ko, theme.pad);
        const pct = Math.max(0, s.hp / s.maxHp * 100); const sh = Math.min(100, s.shield / s.maxHp * 100);
        const fill = el.querySelector('.cl-hp-fill'); fill.style.width = `${pct}%`; fill.className = `cl-hp-fill ${pct < 30 ? 'low' : pct < 60 ? 'mid' : ''}`;
        if (instant) el.querySelector('.cl-hp-ghost').style.width = `${pct}%`;
        el.querySelector('.cl-hp-shield').style.width = `${sh}%`;
        el.querySelector('.cl-sh').textContent = s.shield ? `🛡${s.shield}` : '';
        const cond = s.cond || s.paused; const condEl = el.querySelector('.cl-cond'); condEl.textContent = cond ? COND_ICON[cond] : ''; condEl.title = cond ? `${cond}${s.paused && !s.cond ? ' (paused)' : ''}` : (s.t8status ? `${STATUS_NAME[s.t8status.id] || s.t8status.id}${s.t8status.remaining != null ? ` ${$t('clash.turns', { remaining: s.t8status.remaining })}` : ''}` : ''); condEl.style.opacity = s.paused && !s.cond ? '0.6' : '1';
        el.querySelector('.cl-ring-wrap').innerHTML = s.shield > 0 && !s.ko ? shieldRingSvg(s.shield / s.maxHp) : '';
        el.dataset.cond = s.cond || '';
        const card = $(`.cl-card[data-card="${id}"]`); card.classList.toggle('ko', !!s.ko); card.classList.toggle('front', !!slot.front && !s.ko);
        card.querySelector('.bar > i').style.width = `${pct}%`; card.querySelector('.bar').className = `bar ${pct < 30 ? 'bad' : pct < 60 ? 'warn' : ''}`;
        card.querySelector('.cl-card-hp').textContent = `${s.hp}/${s.maxHp}`; card.querySelector('.cl-card-sh').textContent = s.shield ? `🛡${s.shield}` : ''; card.querySelector('.cl-card-cond').textContent = cond ? COND_ICON[cond] : s.t8status ? `${t8Glyph(s.t8status.id)}${s.t8status.remaining ?? ''}` : '';
      }
    }
    $('.cl-ex b').textContent = String(st.ex); $('.cl-exbar i').style.width = `${Math.min(100, st.ex / 30 * 100)}%`;
    { const up = (side) => st.order[side].filter((id) => !st.S[side][id].ko).length; $('.cl-standing').textContent = `${$t('clash.v_standing', { up: up('a'), up2: up('b') })}`; }
    matchup(st);
    $('.cl-sd').textContent = st.ramp > 1 ? `${$t('clash.sudden_death', { toFixed: st.ramp.toFixed(2) })}` : ''; viewport.classList.toggle('sudden', st.ramp > 1);
    if (t8) { const o = $('.cl-order'); if (o) o.textContent = st.turnOrder ? `${$t('clash.turn_order')} ${st.turnOrder.map((id) => byId[id]?.name || id).join(' → ')}` : ''; }
    { const sc = $('[data-cl="scrub"]'); if (sc) sc.value = String(st.i); } // the host may have been emptied (destroy) mid-cue
    caption.textContent = result.log[st.i]?.text || '';
    if (t8) t8Draw();
  }

  // ---- the t8 ability presentation layer: a playback clock in seconds (1x), redrawn per frame while anything is live
  const t8clock = { base: 0, start: 0, end: 0, override: null, raf: 0 };
  const t8Time = () => (t8clock.override != null ? t8clock.override : playing ? Math.min(t8clock.end, t8clock.base + (performance.now() - t8clock.start) / 1000 * speed) : t8clock.end);
  function t8Geom() {
    const W = stage.clientWidth || 390, H = stage.clientHeight || 487; const land = isLandscape();
    return { W, H, landscape: land, reduced: reduced(), pos: (id) => { const el = monEl[id]; if (!el || el.classList.contains('gone')) return null; return { x: parseFloat(el.style.left) / 100 * W, y: parseFloat(el.style.top) / 100 * H, size: sizeOf(id), side: id[0], active: el.classList.contains('front'), ko: false, id }; },
      slot: (side, i) => { const map = (land ? (W < 420 ? LANDSCAPE_TIGHT : LANDSCAPE) : side === 'b' ? PORTRAIT_B : PORTRAIT)[Math.max(1, Math.min(5, result.lines[side].length))]; const [x, y] = map[Math.min(i, map.length - 1)]; const sizes = sizesFor(sizeKey, H, land); return { x: (side === 'b' && land ? 100 - x : x) / 100 * W, y: y / 100 * H, size: i === 0 ? sizes.front : sizes.bench }; } };
  }
  function t8Draw(t = t8Time()) {
    if (!t8under || !t8over || !t8under.isConnected) return;
    const g = t8Geom(); const vb = `0 0 ${g.W} ${g.H}`; if (t8under.getAttribute('viewBox') !== vb) { t8under.setAttribute('viewBox', vb); t8over.setAttribute('viewBox', vb); }
    const d = drawClashT8(t8state, t, g, { quality, reduced: reduced(), reducedFlash: softFlash() });
    t8under.innerHTML = d.under; t8over.querySelector('.fx').innerHTML = d.over; t8over.querySelector('.hud').innerHTML = d.hud;
  }
  const t8Gate = frameGate(); // 30 FPS battery saver: the ability layer redraws at most 30 times a second; the playback clock is unchanged
  function t8Loop(now = performance.now()) { t8clock.raf = 0; if (!t8 || !root.isConnected) return; const t = t8Time(); if (t8Gate(now)) t8Draw(t); if (playing || t8Live(t8state, t)) t8clock.raf = requestAnimationFrame(t8Loop); }
  const t8Kick = () => { if (t8 && !t8clock.raf) t8clock.raf = requestAnimationFrame(t8Loop); };

  /** The matchup line: the two front monsters and who has the type edge (▲ strong, ▼ weak, = even), in words the strips echo. */
  function matchup(st) {
    const el = $('.cl-matchup'); if (!el) return;
    const fa = st.front?.a, fb = st.front?.b; if (!fa || !fb || st.S.a[fa]?.ko || st.S.b[fb]?.ko) { el.innerHTML = ''; return; }
    const A = byId[fa], B = byId[fb]; const ab = opts.edge ? opts.edge(A.type, B.type) : 'even', ba = opts.edge ? opts.edge(B.type, A.type) : 'even';
    const edge = (e) => e === 'strong' ? `<b class="edge strong" title="type advantage">▲</b>` : e === 'weak' ? `<b class="edge weak" title="type disadvantage">▼</b>` : `<span class="edge even">=</span>`;
    el.innerHTML = `<span class="mu-side a"><span class="mu-name">${esc(A.name)}</span> <span class="mu-type">${esc(A.type)}</span> ${edge(ab)}</span><span class="mu-vs">vs</span><span class="mu-side b">${edge(ba)} <span class="mu-type">${esc(B.type)}</span> <span class="mu-name">${esc(B.name)}</span></span>`;
    el.className = `cl-matchup ${ab === 'strong' ? 'a-up' : ba === 'strong' ? 'b-up' : ''}`;
  }

  // ---- geometry (stage pixels)
  const sizeOf = (id) => parseFloat(monEl[id]?.style.getPropertyValue('--size')) || 64;
  const feet = (id) => { const el = monEl[id]; return [parseFloat(el.style.left) / 100 * stage.clientWidth, parseFloat(el.style.top) / 100 * stage.clientHeight]; };
  const chest = (id) => { const [x, y] = feet(id); return [x, y - sizeOf(id) * 0.55]; };
  const towards = (from, to) => { if (!from || !to) return { dx: 0, dy: 0 }; const a = feet(from), b = feet(to); return { dx: b[0] - a[0], dy: b[1] - a[1] }; };
  /** Contact point: where a lunging attacker stops, just short of the target, scaled by the two sprites. */
  const contact = (from, to) => { const { dx, dy } = towards(from, to); const d = Math.hypot(dx, dy) || 1; const stop = (sizeOf(from) + sizeOf(to)) * 0.32; return { dx: dx - dx / d * stop, dy: dy - dy / d * stop }; };

  // ---- animation helpers (Web Animations API; every duration is divided by the speed; reduced motion skips motion)
  const dur = (ms) => (reduced() ? 0 : ms / speed);
  function anim(el, frames, ms, easing = 'ease-out') { if (!el || dur(ms) <= 0) return Promise.resolve(); if (softFlash()) frames = calm(frames); const a = el.animate(frames, { duration: dur(ms), easing, fill: 'none' }); live.add(a); return a.finished.catch(() => {}).finally(() => live.delete(a)); }
  const rig = (id) => monEl[id]?.querySelector('.cl-rig');
  const body = (id) => monEl[id]?.querySelector('.cl-body');
  const setActing = (id, on) => { for (const el of $$('.cl-mon.acting')) el.classList.remove('acting'); if (on && id && monEl[id]) monEl[id].classList.add('acting'); };
  function floatText(id, text, cls, ms = 900, at = 0.6) {
    const el = monEl[id]; if (!el) return; const f = document.createElement('div'); f.className = `cl-float ${cls}`; f.textContent = text;
    f.style.left = el.style.left; f.style.top = `calc(${el.style.top} - ${el.style.getPropertyValue('--size') || '64px'} * ${at})`; layer.appendChild(f);
    anim(f, [{ transform: 'translate(-50%, -40%) scale(0.6)', opacity: 0 }, { transform: 'translate(-50%, -90%) scale(1.15)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%, -170%) scale(1)', opacity: 0 }], ms).then(() => f.remove());
    if (dur(ms) <= 0) setTimeout(() => f.remove(), 600);
  }
  function banner(text, cls = '', ms = 1200) {
    const b = document.createElement('div'); b.className = `cl-banner ${cls}`; b.textContent = text; viewport.appendChild(b);
    if (/\bpower\b/.test(cls)) placeCallout(b);
    const base = /\bpower\b/.test(cls) ? '' : 'translate(-50%, -50%) '; anim(b, [{ transform: `${base}scale(0.7)`, opacity: 0 }, { transform: `${base}scale(1.05)`, opacity: 1, offset: 0.2 }, { transform: `${base}scale(1)`, opacity: 1, offset: 0.8 }, { transform: `${base}scale(1)`, opacity: 0 }], ms).then(() => b.remove());
    if (dur(ms) <= 0) setTimeout(() => b.remove(), 800);
  }
  /** Move-name callout: pick the corner or edge spot that covers the least of any monster (sprite or tag). */
  function placeCallout(b) {
    const V = viewport.getBoundingClientRect(); const w = b.offsetWidth, h = b.offsetHeight, pad = 6;
    const spots = [[pad, (V.height - h) / 2], [V.width - w - pad, (V.height - h) / 2], [(V.width - w) / 2, pad], [(V.width - w) / 2, V.height - h - pad], [pad, pad], [V.width - w - pad, pad], [pad, V.height - h - pad], [V.width - w - pad, V.height - h - pad]];
    const boxes = []; for (const m of $$('.cl-mon:not(.gone)')) for (const sel of ['.cl-rig', '.cl-tag']) { const r = m.querySelector(sel).getBoundingClientRect(); const inset = sel === '.cl-rig' ? r.width * 0.22 : 0, mg = sel === '.cl-rig' ? 2 : 10; boxes.push([r.left - V.left + inset - mg, r.top - V.top - mg, r.right - V.left - inset + mg, r.bottom - V.top + mg, sel === '.cl-tag' ? 3 : 1]); }
    let best = spots[0], bestCost = Infinity;
    spots.forEach(([x, y], i) => { let cost = i * 0.5; for (const [l, t, r, bt, wgt] of boxes) cost += wgt * Math.max(0, Math.min(x + w, r) - Math.max(x, l)) * Math.max(0, Math.min(y + h, bt) - Math.max(y, t)); if (cost < bestCost) { bestCost = cost; best = [x, y]; } });
    b.style.left = `${Math.round(best[0])}px`; b.style.top = `${Math.round(best[1])}px`; b.style.right = 'auto'; b.style.bottom = 'auto';
  }
  /** Camera: a restrained zoom towards the focus (origin clamped so the rim is never cropped) and a short shake. */
  function camera(c) {
    if (!c || reduced()) { stage.style.transform = ''; return; }
    const land = isLandscape(); const z = c.zoom && c.zoom > 1 ? Math.min(1.1, land ? c.zoom : 1 + (c.zoom - 1) * 0.6) : 1;
    const ids = (c.focus || []).filter((id) => id && monEl[id]);
    if (z > 1 && ids.length) { const cx = ids.reduce((s, id) => s + parseFloat(monEl[id].style.left), 0) / ids.length, cy = ids.reduce((s, id) => s + parseFloat(monEl[id].style.top), 0) / ids.length; stage.style.transformOrigin = `${Math.max(40, Math.min(60, cx))}% ${Math.max(35, Math.min(65, cy))}%`; stage.style.transform = `${`scale(${z})`}`; }
    else stage.style.transform = '';
    dimEl.classList.toggle('on', !!c.dim);
    if (c.shake) anim(viewport, [{ transform: 'translate(0,0)' }, { transform: `${`translate(${c.shake}px, ${-c.shake / 2}px)`}` }, { transform: `${`translate(${-c.shake}px, ${c.shake / 2}px)`}` }, { transform: `${`translate(${c.shake / 2}px, 0)`}` }, { transform: 'translate(0,0)' }], 300, 'linear');
  }
  const settle = () => { stage.style.transform = ''; dimEl.classList.remove('on'); };

  // ---- impact: numbers, flash, knockback, element burst, HP drain. Shared by every delivery.
  function impact(cue, st, { heavy = false } = {}) {
    const e = cue.event; const t = e.target; if (!t || !monEl[t]) { applyState(st); return Promise.resolve(); }
    const { dx, dy } = towards(e.actor && e.actor !== t ? e.actor : t, t); const d = Math.hypot(dx, dy) || 1; const kb = (heavy ? 18 : 9) * (cue.tier === 'major' ? 1.4 : 1);
    const owned = t8 && !!cue.ability && t8state.items.some((it) => it.id === cue.ability && (it.seq === cue.i || (it.start <= cue.at && it.end >= cue.at))); // a look owns the impact of its ability's hits: no generic burst
    if (!owned) fx.burst(chest(t), cue.element || 'Metal', { tier: cue.tier, seed: cue.i });
    if (cue.number?.absorbed && !cue.number.bypassed) fx.shieldHit(chest(t));
    applyState(st);
    if (cue.number) { floatText(t, `-${cue.number.value}`, 'dmg' + (heavy ? ' big' : '')); if (cue.number.absorbed) floatText(t, `${cue.number.absorbed} absorbed${cue.number.broken ? $t('clash.broken') : ''}`, 'shield', 1000, 0.15); if (cue.number.bypassed) floatText(t, 'shield bypassed', 'shield', 900, 0.15); if (cue.number.capped) floatText(t, 'hit cap', 'note', 800, 0.3); }
    const R = rig(t);
    return Promise.all([
      anim(body(t), [{ filter: 'brightness(3) contrast(1.2)' }, { filter: 'brightness(3)', offset: 0.3 }, { filter: 'brightness(1)' }], heavy ? 300 : 200, 'ease-out'),
      anim(R, [{ transform: 'translate(0,0)' }, { transform: `${`translate(${dx / d * kb}px, ${dy / d * kb * 0.5}px) rotate(${dx > 0 ? 6 : -6}deg)`}`, offset: 0.35 }, { transform: 'translate(0,0) rotate(0)' }], heavy ? 420 : 280, 'cubic-bezier(.2,.9,.3,1)'),
    ]);
  }
  /** Windup: crouch and gather element energy; longer and bigger for heavy moves. */
  async function windup(cue, heavy, dx, dy) {
    const A = rig(cue.actor); const back = heavy ? 0.14 : 0.06;
    if (heavy || cue.tier !== 'routine') fx.windup(chest(cue.actor), cue.element, { seed: cue.i });
    await anim(A, [{ transform: 'translate(0,0) scale(1,1)' }, { transform: `${`translate(${-dx * back}px, ${-dy * back}px) scale(1.06, 0.92)`}` }], cue.duration * (heavy ? 0.28 : 0.16), 'ease-in');
    return { back };
  }
  const hitStop = (cue) => wait(dur(cue.tier === 'major' ? 130 : cue.tier === 'power' ? 90 : 40));

  // ---- one cue
  async function playCue(cue) {
    if (!root.querySelector('.cl-stage')) return;
    const e = cue.event; const D = cue.duration; const st = stateOf(cue.i);
    // native t8: the playback clock moves to this cue first, so the ability layers keep drawing whoever presents the cue
    if (t8) { t8clock.base = cue.at; t8clock.start = performance.now(); t8clock.end = cue.end; t8clock.override = null; t8Kick(); }
    // the looks hook (override point): a truthy return (a Promise) takes the cue over; the arena then only applies the state
    if (opts.looks) { let took = null; try { took = opts.looks(cue, looksApi()); } catch (err) { console.error('clash looks hook', err); took = null; } if (took) { await took; applyState(st); return; } }
    if (cue.tier === 'silent') { applyState(st); if (dur(D) > 0) await wait(dur(D)); return; } // bookkeeping (turn / round starts, clocks, rolls): nothing to show
    if (t8) { const own = t8state.items.find((it) => it.seq === cue.i && it.main && it.look.shake); if (own && !reduced()) camera({ ...(cue.camera || { focus: [e.actor, e.target], zoom: 1 }), shake: Math.max(cue.camera?.shake || 0, 5) }); }
    camera(cue.camera); setActing(e.actor && ['damage', 'heal', 'shield', 'miss', 'skip', 'buff', 'debuff', 'ability', 'delayed_launch'].includes(e.kind) ? e.actor : null, true);
    const name = cue.named ? byId[e.actor]?.combatant?.move?.name : null;
    const looked = t8 && cue.ability && t8state.items.some((it) => it.seq === cue.i); // an ability event with its own look: no generic burst / banner
    switch (cue.move) {
      case 'lunge': case 'lunge-heavy': {
        const heavy = cue.move === 'lunge-heavy' || cue.tier === 'major'; const A = rig(e.actor); const { dx, dy } = towards(e.actor, e.target);
        if (name && (heavy || cue.tier !== 'routine')) banner(name, cue.tier === 'major' ? 'major' : 'power', D * 0.9);
        const { back } = await windup(cue, heavy, dx, dy);
        const from = `${`translate(${-dx * back}px, ${-dy * back}px) scale(1.06, 0.92)`}`;
        if (cue.delivery === 'ability') { // t8: the ability's look draws the travel and the impact; the body recoils and the hit lands on the look's beat
          anim(A, [{ transform: from }, { transform: `${`translate(${dx * 0.06}px, ${dy * 0.06}px) scale(0.98, 1.03)`}`, offset: 0.4 }, { transform: 'translate(0,0) scale(1,1)' }], D * 0.4, 'ease-out');
          await wait(dur(D * 0.3)); await hitStop(cue); await impact(cue, st, { heavy });
        } else if (cue.delivery === 'melee') {
          const c = contact(e.actor, e.target); const to = `${`translate(${c.dx}px, ${c.dy}px) scale(0.96, 1.06)`}`;
          await anim(A, [{ transform: from }, { transform: to }], D * (heavy ? 0.16 : 0.2), 'cubic-bezier(.2,.8,.3,1)');
          const hold = anim(A, [{ transform: to }, { transform: to }], heavy ? 130 : 40, 'linear'); await hitStop(cue);
          const back2 = impact(cue, st, { heavy }); await hold;
          await anim(A, [{ transform: to }, { transform: 'translate(0,0) scale(1,1)' }], D * 0.3, 'ease-out'); await back2;
        } else {
          // ranged: a recoil on release, the effect travels, then the impact lands on arrival
          const rel = anim(A, [{ transform: from }, { transform: `${`translate(${dx * 0.08}px, ${dy * 0.08}px) scale(0.96, 1.06)`}`, offset: 0.4 }, { transform: 'translate(0,0) scale(1,1)' }], D * 0.35, 'ease-out');
          const a = chest(e.actor), b = chest(e.target); const ms = cue.tier === 'major' ? 420 : cue.tier === 'power' ? 340 : 260;
          if (cue.delivery === 'projectile') await fx.projectile(a, b, cue.element, { ms, tier: cue.tier, seed: cue.i });
          else if (cue.delivery === 'lob') await fx.projectile(a, b, cue.element, { ms: ms + 80, tier: cue.tier, seed: cue.i, lob: true });
          else if (cue.delivery === 'arc') { fx.zigzag(a, b, cue.element, 260, cue.i); fx.zigzag(a, b, cue.element, 260, cue.i + 1); await wait(dur(120)); }
          else if (cue.delivery === 'beam') { fx.beam(a, b, cue.element, 360); await wait(dur(140)); }
          else if (cue.delivery === 'wave') { fx.ring(a, '#ff9ae6', 6, 50, 400); await fx.projectile(a, b, cue.element, { ms, tier: cue.tier, seed: cue.i }); }
          else await fx.projectile(a, b, cue.element, { ms, tier: cue.tier, seed: cue.i });
          await hitStop(cue); await Promise.all([impact(cue, st, { heavy }), rel]);
        }
        break;
      }
      case 'burst': { // splash onto a second target, or a retaliation from the defender
        const a = e.actor && monEl[e.actor] ? chest(e.actor) : null; if (a && e.target && !looked) await fx.projectile(a, chest(e.target), cue.element, { ms: 200, tier: 'routine', seed: cue.i }); else if (looked) await wait(dur(D * 0.35));
        await impact(cue, st, { heavy: false }); break;
      }
      case 'burn-tick': { fx.condition(chest(e.target), 'burn', { seed: cue.i }); applyState(st); floatText(e.target, `-${cue.number.value}`, 'dmg burn', 700); await anim(body(e.target), [{ filter: 'sepia(1) saturate(4) hue-rotate(-20deg)' }, { filter: 'none' }], D); break; }
      case 'mend': {
        if (!e.target || !monEl[e.target]) { applyState(st); await wait(dur(D)); break; }
        if (e.actor && e.actor !== e.target && monEl[e.actor]) { if (!looked) fx.healBeam(chest(e.actor), chest(e.target)); anim(body(e.actor), [{ filter: 'brightness(1)' }, { filter: 'brightness(1.5) drop-shadow(0 0 6px #4ade80)' }, { filter: 'brightness(1)' }], D * 0.6); await wait(dur(D * 0.25)); }
        if (!looked) fx.heal(chest(e.target), { seed: cue.i }); applyState(st);
        if (cue.number.value > 0) floatText(e.target, `+${cue.number.value}`, 'heal'); else floatText(e.target, 'full', 'note', 600);
        await anim(body(e.target), [{ filter: 'brightness(1)' }, { filter: 'brightness(1.6) drop-shadow(0 0 8px #4ade80)' }, { filter: 'brightness(1)' }], D * 0.75); break;
      }
      case 'shield': {
        if (e.actor && e.actor !== e.target && monEl[e.actor]) { fx.healBeam(chest(e.actor), chest(e.target)); await wait(dur(D * 0.2)); }
        fx.shieldUp(chest(e.target), { seed: cue.i }); applyState(st); floatText(e.target, `🛡+${cue.number.value}`, 'shield');
        await anim(monEl[e.target]?.querySelector('.cl-ring-wrap'), [{ transform: $t('clash.translatex_50_scale_1_6'), opacity: 0 }, { transform: $t('clash.translatex_50_scale_1'), opacity: 1 }], D * 0.8); break;
      }
      case 'shatter': { fx.shieldBreak(chest(e.target), { seed: cue.i }); const r = monEl[e.target]?.querySelector('.cl-ring-wrap'); await anim(r, [{ transform: $t('clash.translatex_50_scale_1'), opacity: 1 }, { transform: $t('clash.translatex_50_scale_1_5'), opacity: 0 }], D * 0.6); applyState(st); floatText(e.target, 'shield broken', 'shield', 700); break; }
      case 'dodge': { const { dx, dy } = towards(e.actor, e.target); const T = rig(e.target); floatText(e.target, cue.label || 'miss', 'note', 700); const c = contact(e.actor, e.target); anim(rig(e.actor), [{ transform: 'translate(0,0)' }, { transform: `${`translate(${c.dx * 0.7}px,${c.dy * 0.7}px)`}`, offset: 0.4 }, { transform: 'translate(0,0)' }], D * 0.9); await wait(dur(D * 0.3)); await anim(T, [{ transform: 'translate(0,0)', filter: 'blur(0)' }, { transform: `${`translate(${dx > 0 ? 22 : -22}px,${dy > 0 ? 6 : -6}px)`}`, filter: 'blur(1px)' }, { transform: 'translate(0,0)', filter: 'blur(0)' }], D * 0.5); applyState(st); break; }
      case 'afflict': { if (t8) { applyState(st); floatText(e.target, `${t8Glyph(e.status)} ${cue.label}`, 'cond', 900); await anim(body(e.target), [{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)' }, { filter: 'none' }], D * 0.6); break; } fx.condition(chest(e.target), e.condition, { seed: cue.i, strong: cue.tier !== 'routine' }); applyState(st); const col = COND_COLOR[e.condition] || '#fff'; floatText(e.target, `${COND_ICON[e.condition] || ''} ${cue.label}`, 'cond', 900); await anim(body(e.target), [{ filter: `${`drop-shadow(0 0 0 ${col})`}` }, { filter: `${`drop-shadow(0 0 10px ${col}) brightness(1.4)`}` }, { filter: 'none' }], D); break; }
      case 'resist': { applyState(st); const t = e.target || e.actor; floatText(t, cue.label || 'resisted', 'note', 600); fx.dust(chest(t), 4, cue.i); await anim(body(t), [{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(0)' }], D); break; }
      case 'clear': { applyState(st); if (e.target && monEl[e.target] && !monEl[e.target].classList.contains('gone')) { if (cue.label) floatText(e.target, cue.label, 'note', 600); if (!looked) fx.ring(chest(e.target), '#ffffff', 2, 24, 300); } await wait(dur(D)); break; }
      case 'skip': { if (/shock/i.test(cue.label || '')) fx.skipShock(chest(e.actor), { seed: cue.i }); applyState(st); floatText(e.actor, cue.label, 'cond', 900); await anim(rig(e.actor), [{ transform: 'translate(0,0)' }, { transform: 'translate(-5px,0) rotate(-3deg)' }, { transform: 'translate(5px,0) rotate(3deg)' }, { transform: 'translate(-4px,0)' }, { transform: 'translate(3px,0)' }, { transform: 'translate(0,0)' }], D * 0.6, 'linear'); break; }
      case 'yank': {
        const out = e.out; banner(e.text.split(':')[0], 'power', D * 0.8); const { dx, dy } = towards(e.actor || out, out);
        fx.dust(feet(out), 8, cue.i);
        await anim(rig(out), [{ transform: 'translate(0,0) rotate(0)' }, { transform: `${`translate(${(dx || 1) > 0 ? 24 : -24}px,-34px) rotate(-25deg)`}` }], D * 0.28, 'ease-in');
        applyState(st); if (e.in && monEl[e.in]) { fx.enterPuff(feet(e.in), { seed: cue.i }); anim(rig(e.in), [{ transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], D * 0.4); }
        await wait(dur(D * 0.6)); break;
      }
      case 'walk': { applyState(st); if (e.out && monEl[e.out]) fx.dust(feet(e.out), 5, cue.i); await wait(dur(D * 0.5)); if (e.in && monEl[e.in]) fx.enterPuff(feet(e.in), { seed: cue.i }); await wait(dur(D * 0.5)); break; }
      case 'enter': {
        applyState(st);
        if (e.ex > 0 && monEl[e.actor]) { await wait(dur(D * 0.35)); fx.enterPuff(feet(e.actor), { seed: cue.i }); floatText(e.actor, `${byId[e.actor]?.name || ''} enters!`, 'note', 800, 1.05); await anim(rig(e.actor), [{ transform: $t('clash.translatey_14px_scale_1_04') }, { transform: $t('clash.translatey_0_scale_1') }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], D * 0.65); }
        else await wait(dur(D)); break;
      }
      case 'walk-back': { applyState(st); await wait(dur(D)); break; }
      case 'ko': {
        const T = body(e.target); const R = rig(e.target); const major = cue.tier === 'major';
        await anim(T, softFlash() ? [{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)' }, { filter: 'brightness(1)' }] : [{ filter: 'brightness(1)' }, { filter: 'brightness(4)' }, { filter: 'brightness(1)' }, { filter: 'brightness(4)' }, { filter: 'brightness(1)' }], D * 0.22, 'linear'); // reduce flashes: one soft pulse instead of the double strobe
        if (major) banner($t('clash.knockout'), 'major', D * 0.9);
        fx.koPuff(chest(e.target), { seed: cue.i }); monEl[e.target].classList.add('falling');
        const { dx } = towards(e.actor && e.actor !== e.target ? e.actor : e.target, e.target); const away = dx >= 0 ? 1 : -1;
        await anim(R, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `${`translate(${away * 12}px,-10px) rotate(${away * 20}deg)`}`, opacity: 1, offset: 0.3 }, { transform: `${`translate(${away * 26}px,8px) rotate(${away * 80}deg)`}`, opacity: 0.8, offset: 0.7 }, { transform: `${`translate(${away * 34}px,26px) rotate(${away * 90}deg) scale(0.7)`}`, opacity: 0 }], D * (major ? 0.7 : 0.6), 'ease-in');
        monEl[e.target].classList.remove('falling'); applyState(st); if (major) await wait(dur(D * 0.15)); break;
      }
      case 'sudden-death': { banner($t('clash.sudden_death_2'), 'sd', D); applyState(st); fx.ring([stage.clientWidth / 2, stage.clientHeight / 2], '#f87171', 8, Math.max(stage.clientWidth, stage.clientHeight) * 0.6, 700); await wait(dur(D * 0.8)); break; }
      case 'cap': case 'coin': { banner(cue.label, 'major', D); applyState(st); await wait(dur(D * 0.8)); break; }
      case 'victory': {
        applyState(st); const side = e.winner; banner(simple ? (side === 'a' ? `${names.a} win!` : `${names.b} win`) : `${$t('clash.side_wins', { toUpperCase: side.toUpperCase() })}`, `major win ${side === 'a' ? 'mine' : 'theirs'} ${isLandscape() ? '' : side === 'b' ? 'low' : 'high'}`, D * 1.4);
        const standing = st.order[side].filter((id) => !st.S[side][id].ko);
        for (const id of standing) fx.victory(feet(id), { seed: cue.i + id.charCodeAt(1) });
        const hop = (id) => anim(rig(id), [{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' }], D, 'ease-in-out');
        await Promise.all(standing.map(hop)); break;
      }
      case 'buff': case 'debuff': { applyState(st); const t = e.target || e.actor; floatText(t, e.text.split(':').slice(1).join(':').trim().slice(0, 28) || cue.kind, 'note', 800); fx.ring(chest(t), cue.kind === 'buff' ? '#facc15' : '#9a7ad6', 3, 28, 400); await wait(dur(D)); break; }
      case 'refused': { applyState(st); floatText(e.target || e.actor, 'held', 'note', 600); await wait(dur(D * 0.6)); break; }
      case 'dim': { dimEl.classList.add('on'); applyState(st); await wait(dur(D)); dimEl.classList.remove('on'); break; }
      case 'coin-small': { applyState(st); floatText(e.actor, 'coin flip', 'note', 500); await wait(dur(D)); break; }
      // ---- t8 moves (the ability look draws the distinctive part; these keep the state, numbers and body feedback honest)
      case 'self-hit': { applyState(st); const T = e.target; floatText(T, `-${cue.number.value}`, 'dmg'); floatText(T, 'hits itself', 'note', 800, 0.15); await anim(body(T), [{ filter: 'brightness(1)' }, { filter: 'brightness(2.5)' }, { filter: 'brightness(1)' }], D * 0.5); break; }
      case 'dot-tick': { applyState(st); floatText(e.target, `-${cue.number.value}`, 'dmg burn', 700); await anim(body(e.target), [{ filter: 'brightness(1)' }, { filter: 'brightness(0.6) saturate(0.5)' }, { filter: 'none' }], D); break; }
      case 'hp-set': { applyState(st); const T = e.target; if (cue.number.value) floatText(T, `${cue.number.kind === 'heal' ? '+' : '-'}${cue.number.value}`, cue.number.kind === 'heal' ? 'heal' : 'dmg'); await wait(dur(D)); break; }
      case 'hp-cost': { applyState(st); floatText(e.actor, `-${cue.number.value} HP`, 'dmg', 700, 0.9); await wait(dur(D)); break; }
      case 'freeze': { applyState(st); floatText(e.target, cue.label, 'note', 700, 1.1); await wait(dur(D)); break; }
      case 'intercept': { applyState(st); if (e.actor && e.actor !== e.target) floatText(e.actor, 'intercepts!', 'note', 800); await wait(dur(D)); break; }
      case 'cover': { applyState(st); floatText(e.actor, $t('clash.takes_the_hit'), 'note', 900, 1.05); await wait(dur(D)); break; }
      case 'survive': { applyState(st); floatText(e.actor, '1 HP!', 'cond', 900); await anim(rig(e.actor), [{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(-4px,0) rotate(-6deg)', offset: 0.4 }, { transform: 'translate(0,0) rotate(0)' }], D * 0.6); break; }
      case 'split': { applyState(st); if (e.actor) floatText(e.actor, `shares ${e.sourceShare}`, 'shield', 900); await wait(dur(D)); break; }
      case 'shake-off': { applyState(st); floatText(e.actor, cue.label, 'note', 700); await anim(body(e.actor), [{ transform: 'rotate(0)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], D); break; }
      case 'held': { applyState(st); floatText(e.actor, cue.label, 'note', 900, 1.1); await wait(dur(D)); break; }
      case 'restrict': { applyState(st); if (e.target && e.actor !== e.target) floatText(e.target, 'signature restricted', 'cond', 900, 1.1); await wait(dur(D)); break; }
      case 'clock': { applyState(st); if (e.target) floatText(e.target, `cooldown ${cue.label}`, 'note', 900, 1.1); await wait(dur(D)); break; }
      case 'order': { applyState(st); await wait(dur(D)); break; }
      case 'ability': case 'launch': { applyState(st); if (e.actor && monEl[e.actor] && e.stage === 'activation') anim(rig(e.actor), [{ transform: 'translate(0,0) scale(1,1)' }, { transform: 'translate(0,-6px) scale(1.04, 0.98)', offset: 0.3 }, { transform: 'translate(0,0) scale(1,1)' }], D * 0.6); await wait(dur(D)); break; }
      case 'impact': { applyState(st); await wait(dur(D)); break; }
      case 'revive': { applyState(st); if (e.target && monEl[e.target]) { fx.enterPuff(feet(e.target), { seed: cue.i }); floatText(e.target, `${byId[e.target]?.name || ''} returns!`, 'heal', 1000, 1.05); await anim(rig(e.target), [{ transform: $t('clash.translatey_14px_scale_1_04'), opacity: 0 }, { transform: $t('clash.translatey_0_scale_1'), opacity: 1 }], D * 0.7); } else await wait(dur(D)); break; }
      case 'note': { applyState(st); await wait(dur(D)); break; }
      default: { applyState(st); await wait(dur(D)); }
    }
    setActing(null, false);
    if (cue.camera?.zoom > 1 || cue.camera?.dim) { await wait(dur(100)); settle(); }
  }

  // ---- playback
  function cancelAll() { for (const a of live) a.cancel(); live.clear(); fx.clear(); settle(); setActing(null, false); for (const b of $$('.cl-banner, .cl-float')) b.remove(); }
  function setCursor(i, { animate = false } = {}) { cancelAll(); cursor = Math.max(0, Math.min(n - 1, i)); if (t8) { t8clock.override = null; t8clock.end = cues[cursor].end; t8clock.base = cues[cursor].at; } applyState(stateOf(cursor), { instant: !animate }); opts.onCursor?.(cursor); const sc = $('[data-cl="scrub"]'); if (sc) sc.value = String(cursor); setButtons(); }
  async function runTo(target) {
    if (playing) return; playing = true; const my = ++token; setButtons();
    while (playing && my === token && cursor < target) { cursor += 1; await playCue(cues[cursor]); if (my !== token) return; opts.onCursor?.(cursor); const sc = $('[data-cl="scrub"]'); if (sc) sc.value = String(cursor); }
    if (my === token) { playing = false; setButtons(); if (cursor >= n - 1) opts.onEnd?.(); }
  }
  function pause() { playing = false; token++; cancelAll(); if (t8) { t8clock.override = null; t8clock.end = cues[cursor].end; } applyState(stateOf(cursor), { instant: true }); setButtons(); }
  /** t8 (reviewer / check tool): show the arena exactly as at playback time t (seconds at 1x): the state after the cue playing then, the layer drawn at t. */
  function seek(t) { if (!t8) return; pause(); let k = 0; for (let j = 0; j < cues.length; j++) if (cues[j].at <= t + 1e-9) k = j; cursor = k; t8clock.override = t; applyState(stateOf(cursor), { instant: true }); opts.onCursor?.(cursor); const sc = $('[data-cl="scrub"]'); if (sc) sc.value = String(cursor); t8Draw(t); }
  function setButtons() { const w = $('[data-cl="watch"]'); if (w) w.textContent = playing ? $t('clash.pause') : cursor >= n - 1 ? $t('clash.replay') : $t('clash.watch'); }
  function inspect(id) { const st = stateOf(cursor); const s = st.S[id[0]][id]; const x = byId[id]; const t8s = t8 ? t8StateAt(result, cursor).S[id] : null; caption.textContent = `${x.name} · ${x.archetype} · ${x.type} · HP ${s.hp}/${s.maxHp}${s.shield ? ` ${$t('clash.shield', { shield: s.shield })}` : ''}${s.cond ? ` · ${s.cond}` : s.paused ? ` ${$t('clash.paused', { paused: s.paused })}` : ''}${s.t8status ? ` · ${STATUS_NAME[s.t8status.id] || s.t8status.id}${s.t8status.remaining != null ? ` ${$t('clash.turns', { remaining: s.t8status.remaining })}` : ''}` : ''}${t8s?.restricted ? ` ${$t('clash.restricted_to_ordinary_attacks', { abilityId: t8s.restricted.abilityId })}` : ''}${t8s && Object.keys(t8s.clocks).length ? ` ${$t('clash.cooldown')} ${Object.values(t8s.clocks).map((k) => `${k.id} ${k.left}`).join(', ')}` : ''}${s.ko ? $t('clash.knocked_out') : ''}${x.combatant?.move ? ` · ${x.combatant.move.name}: ${x.combatant.move.text}` : x.abilityId ? ` · ${x.abilityId}` : ''}`; }
  root.addEventListener('click', (ev) => {
    const m = ev.target.closest('.cl-mon, .cl-card'); if (m) { inspect(m.dataset.id || m.dataset.card); return; }
    const b = ev.target.closest('[data-cl]'); if (!b) return; const k = b.dataset.cl;
    if (k === 'watch') { if (playing) pause(); else { if (cursor >= n - 1) setCursor(0); runTo(n - 1); } }
    if (k === 'step') { if (playing) pause(); else if (cursor < n - 1) runTo(cursor + 1); }
    if (k === 'nextex') { if (playing) pause(); else if (cursor < n - 1) runTo(Math.max(cursor + 1, nextEx(cursor + 1))); }
    if (k === 'skip') { pause(); setCursor(n - 1); if (cursor >= n - 1) opts.onEnd?.(); }
    if (k === 'speed') { speed = Number(b.dataset.v) || 1; for (const s of $$('[data-cl="speed"]')) s.classList.toggle('primary', Number(s.dataset.v) === speed); }
    if (k === 'fxq') { quality = t8 ? (quality === 'full' ? 'low' : quality === 'low' ? 'min' : 'full') : quality === 'low' ? 'full' : 'low'; b.textContent = `FX ${quality}`; fx.resize(); if (t8) t8Draw(); opts.onQuality?.(quality); }
  });
  $('[data-cl="scrub"]')?.addEventListener('input', (ev) => { const to = Number(ev.target.value) || 0; pause(); setCursor(to); }); // read before pause() re-syncs the slider
  const onResize = () => { fx.resize(); $('.cl-decor')?.replaceWith(decorNode()); applyState(stateOf(cursor), { instant: true }); };
  const decorNode = () => { const t = document.createElement('template'); t.innerHTML = decorSvg(theme, result.seed || 1, isLandscape()); return t.content.firstChild; };
  window.addEventListener('resize', onResize);
  setCursor(0); requestAnimationFrame(() => fx.resize());
  return {
    // `record`: the record the arena plays: the result the consumer passed (native t8 and legacy), or the translated one (opts.t8 === 'translated');
    // `source` is always the result as passed. `mode`: 'native' | 'translated' | 'legacy' (see arenaMode).
    get cursor() { return cursor; }, get playing() { return playing; }, cues, theme: theme.key, record: result, source: passed, mode, get length() { return n; }, t8: t8state, seek,
    setCursor, play: () => runTo(n - 1), pause, step: () => runTo(cursor + 1), skip: () => { pause(); setCursor(n - 1); },
    /** Play from the cursor to event index `i` (inclusive), animating each cue; resolves when it arrives or is interrupted. */
    playTo: (i) => runTo(Math.max(cursor, Math.min(n - 1, i))),
    setSpeed(s) { speed = s; for (const b of $$('[data-cl="speed"]')) b.classList.toggle('primary', Number(b.dataset.v) === speed); }, get speed() { return speed; },
    setQuality(q) { quality = q; fx.resize(); if (t8) t8Draw(); }, get quality() { return quality; }, get fxCount() { return fx.count; }, get t8Elements() { return t8 ? t8under.querySelectorAll('*').length + t8over.querySelectorAll('*').length : 0; },
    destroy() { playing = false; token++; cancelAll(); if (t8clock.raf) cancelAnimationFrame(t8clock.raf); window.removeEventListener('resize', onResize); root.innerHTML = ''; },
  };
}
export { DURATION };

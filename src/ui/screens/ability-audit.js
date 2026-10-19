// Developer → Ability Audit (polish 2.0). Every species' signature ability
// or shared trait, grouped by element, with the engine hook it fires on and
// two previews that use the real field renderer and effect layer:
//   Staged: a short scripted scene (activation → action → outcome) that loops.
//   In play: the engine is run with the monster in its slot until the ability
//            fires, and that play is animated with the effects on.
// Nothing here changes the sim; the staged scene is synthetic frames only.

import { esc, delegate, sheet } from '../dom.js';
import { SPECIES_DEX, TRAITS } from '../../data/species.js';
import { generateMonster, effectiveAttributes, resolveSpecies } from '../../data/monsters.js';
import { PLAYS } from '../../data/playbook.js';
import { positionOf, OFFENSE_SLOTS, DEFENSE_SLOTS } from '../../data/personnel.js';
import { simulatePlay } from '../../sim/engine.js';
import { createRng } from '../../core/rng.js';
import { fieldSvg, FIELD_VIEWBOX, cameraFor } from '../field-view.js';

/** The preview shows the middle of the camera window at twice the size (the field viewBox is 46 yards tall). */
const AUDIT_VIEWBOX = FIELD_VIEWBOX.split(' ').map(Number).map((v, i) => [v / 2, 5, v / 2, 25][i]).join(' ');
import { monsterSprite } from '../pixel-monster.js';
import { buildFx, familyOf, FAMILY_LABEL, elementFx } from '../ability-fx.js';

/** What makes each effect key fire in engine.js (presentation reads the same hooks). */
const HOOKS = {
  burst: 'Speed boost for the first moments after the snap (carrier or route runner).', afterCatch: 'Speed boost for a moment after the catch.',
  rushSpeed: 'Pass rush speed while the QB holds the ball.', closeSpeed: 'Closing speed while the ball is in the air.', pursuitSpeed: 'Pursuit speed chasing a ball carrier.',
  routeAgility: 'Extra agility on routes; logged on the catch.', elusive: 'Better odds to break a tackle.', elusiveFirst: 'The first juke of the play always works.',
  blockStrength: 'Stronger engagements, logged once the block holds (0.5 s).', anchor: 'Harder to drive back in pass protection.', rebound: 'A beaten blocker recovers almost instantly.',
  shedStrength: 'Strength bonus when shedding a block; logged on the shed.', runStuff: 'Stuffs runs at his gap; logged on the shed.', carryStrength: 'Strength when breaking tackles; logged on the break.',
  noFumble: 'Never fumbles; logged on a broken tackle.', forceFumble: 'More forced fumbles; logged on the strip.', reaction: 'Reacts sooner; logged on the tackle.', blockerStun: 'A shed blocker is stunned longer (with shedStrength).',
  deepThrow: 'Accuracy and arm on throws 15+ yards downfield.', openAccuracy: 'Accuracy throwing to an open receiver.', throwVelocity: 'Faster ball on every throw.', pressureSense: 'Keeps his numbers when throwing under pressure.',
  manCoverage: 'Tighter man coverage; logged as coverage locks on.', contest: 'Contests catches in his zone; logged on a contested ball.', breakRadius: 'Breaks on the throw from farther away; logged on the break.',
  zoneRange: 'Wider zone; passive within coverage.', pickCatching: 'Catching bonus on interception chances; logged on the pick.', catchContest: 'Catching bonus on contested balls.', noPlayActionBite: 'Does not bite on play action; logged when it would have.', aura: 'Boosts nearby teammates from the snap.',
  attrs: 'Flat attribute bonus (passive, no field effect).', fatigue: 'Tires slower (passive).', fumbleResist: 'Fumbles less (passive).',
};
const PASSIVE = new Set(['attrs', 'fatigue', 'fumbleResist', 'zoneRange', 'blockerStun']);
const OFF_POS = new Set(['QB', 'RB', 'WR', 'TE', 'OL', 'K']);

/** The species' effect (ability or trait) and a presentation summary. */
export function auditEntry(sp) {
  const eff = sp.ability ? { name: sp.ability.name, text: sp.ability.text, effect: sp.ability.effect, kind: 'ability' } : TRAITS[sp.trait] ? { name: TRAITS[sp.trait].name, text: TRAITS[sp.trait].text, effect: TRAITS[sp.trait].effect, kind: 'trait' } : null;
  const keys = Object.keys(eff?.effect || {});
  const active = keys.filter((k) => !PASSIVE.has(k));
  const key = active[0] || keys[0] || null;
  return { sp, eff, keys, key, family: key ? familyOf(key) : 'passive', hooked: active.length > 0 && eff?.kind === 'ability', side: OFF_POS.has(sp.position) ? 'off' : 'def' };
}

/** Scripted frames for the family: 2.4 s at 10 fps, the subject at slot S. */
export function stagedSim(entry) {
  const { family, key, side } = entry; const N = 24; const frames = []; const events = [];
  const S = 'S', T = 'T', U = 'U'; // subject, opponent, teammate
  const sub = (x, y) => [S, +x.toFixed(2), +y.toFixed(2), 0];
  const ability = (t) => events.push({ t, kind: 'ability', by: S, side, key, text: `${entry.sp.name}'s ${entry.eff.name} kicks in` });
  const out = (t, kind, extra = {}) => events.push({ t, kind, by: S, side, ability: true, ...extra });
  const push = (t, off, def, ball, holder, holderTeam) => frames.push({ t: +t.toFixed(2), off, def, ball, holder, holderTeam, phase: 'play' });
  const dir = side === 'off' ? 1 : -1; // the subject's "forward"
  for (let i = 0; i < N; i++) {
    const t = i / 10; let mine, theirs, ball, holder = null, holderTeam = null;
    switch (family) {
      case 'move': {
        // Runs forward, cuts at 1.0 s; a chaser trails. Jukers get the "Juked" label.
        const cut = t > 1.0 ? Math.min(4, (t - 1.0) * 6) : 0; const fwd = t * 5.5 * dir; const s = sub(fwd, cut);
        mine = [s]; theirs = [[T, +(fwd - dir * (4.5 - Math.min(1.5, t))).toFixed(2), +(cut * 0.6).toFixed(2), 0]];
        if (side === 'off') { ball = [s[1], s[2], 0]; holder = S; holderTeam = 'off'; } else { ball = [theirs[0][1], theirs[0][2], 0]; holder = T; holderTeam = 'off'; }
        if (i === 3) ability(0.3); if (i === 12 && (key === 'elusive' || key === 'elusiveFirst')) out(1.2, 'juke', { victim: T });
        break;
      }
      case 'block': {
        // Engaged with a rusher in front; the carrier behind.
        const j = Math.sin(t * 20) * 0.15; const s = sub(0.2 + j, 0); s[3] = 1;
        mine = [s, [U, -5, 0, 0]]; theirs = [[T, +(3.2 - j).toFixed(2), 0.4, 1]]; ball = [-5, 0, 0]; holder = U; holderTeam = 'off'; if (i === 5) ability(0.5);
        break;
      }
      case 'contact': {
        if (side === 'def') {
          // Sheds the blocker at 0.8 s, then closes on the carrier and makes the tackle.
          const free = t > 0.8; const fwd = free ? Math.min(5.2, (t - 0.8) * 6) : 0; const s = sub(fwd * dir, 0.2); s[3] = free ? 0 : 1;
          mine = [s]; theirs = [[T, -3, 0.8, free ? 0 : 1], [U, -7, 0.3, 0]]; ball = [-7, 0.3, 0]; holder = U; holderTeam = 'off';
          if (i === 8) { ability(0.8); out(0.8, 'shed', { blocker: T }); }
          if (i === 17) events.push({ t: 1.7, kind: 'tackle', by: S, side, victim: U, ability: key === 'reaction' || key === 'runStuff' });
        } else {
          // Carries into a tackler at 0.8 s and runs through him.
          const fwd = t * 4.5; const s = sub(fwd, 0);
          mine = [s]; theirs = [[T, +(t < 0.8 ? 3.6 + (0.8 - t) * 2 : fwd + 2.2 - (t - 0.8) * 7).toFixed(2), 0.6, 0]]; ball = [s[1], s[2], 0]; holder = S; holderTeam = 'off';
          if (i === 8) { ability(0.8); out(0.8, 'broken', { victim: T }); }
        }
        break;
      }
      case 'throw': {
        // Sets and throws deep at 0.5 s.
        const s = sub(-5, 0); const air = t >= 0.5 && t < 1.8; const k = air ? (t - 0.5) / 1.3 : t >= 1.8 ? 1 : 0;
        mine = [s, [U, +(4 + k * 20).toFixed(2), 4, 0]]; theirs = [[T, 3, -3, 0]]; ball = [+(-5 + k * 24).toFixed(2), +(k * 4).toFixed(2), air ? 1 : 0]; holder = air ? null : k ? U : S; holderTeam = holder ? 'off' : null; if (i === 5) ability(0.5);
        break;
      }
      case 'cover': {
        // Trails a receiver downfield; the ball arrives at 1.4 s and is broken up (or picked).
        const fwd = Math.min(12, t * 6); const s = sub(fwd + 2.4, 1.2);
        mine = [s]; theirs = [[T, +fwd.toFixed(2), 0, 0]]; const air = t >= 0.8 && t < 1.4;
        ball = air ? [+(-5 + (t - 0.8) * 30).toFixed(2), 0.3, 1] : t >= 1.4 ? [s[1], s[2], 0] : [-5, 0, 0];
        if (t >= 1.4 && key === 'pickCatching') { holder = S; holderTeam = 'def'; }
        if (i === 3) ability(0.3); if (i === 14) out(1.4, key === 'pickCatching' ? 'interception' : 'incomplete', { pbu: true });
        break;
      }
      case 'aura': { mine = [sub(0, 0), [U, -1 * dir, 4, 0]]; theirs = [[T, 5 * dir, 1, 0]]; ball = [-4, 0, 0]; if (i === 3) ability(0.3); break; }
      default: { mine = [sub(0, 0)]; theirs = [[T, 4 * dir, 0, 0]]; ball = [0, 0, 0]; break; }
    }
    if (side === 'off') push(t, mine, theirs, ball, holder, holderTeam); else push(t, theirs, mine, ball, holder, holderTeam);
  }
  return { frames, events, ballOn: 30, ballLat: 0 };
}

/** Run the engine with the species in its slot until its ability logs; null if it never does in the budget. */
export function findActivation(entry, { tries = 80 } = {}) {
  const sp = entry.sp; const pos = sp.position; const rng = createRng(11);
  const slots = entry.side === 'off' ? OFFENSE_SLOTS : DEFENSE_SLOTS; const slot = slots.find((s) => positionOf(s) === pos) || slots[0];
  const fam = entry.family;
  const offPlays = fam === 'block' ? ['inside_zone', 'mesh', 'power_right', 'deep_post'] : fam === 'contact' ? ['inside_zone', 'power_right', 'dive', 'outside_zone', 'mesh'] : fam === 'throw' || fam === 'cover' ? ['deep_post', 'three_verticals', 'mesh', 'deep_corner', 'curl_flat'] : ['quick_slants', 'inside_zone', 'curl_flat', 'deep_corner', 'te_seam', 'stick'];
  const defPlays = fam === 'throw' || fam === 'cover' || fam === 'move' ? ['cover_3', 'cover_1', 'man_press', 'cover_2_man'] : ['base_43', 'run_wall', 'bear_front', 'cover_1'];
  const fallback = (p) => SPECIES_DEX.find((s) => s.position === p && !s.ability) || SPECIES_DEX.find((s) => s.position === p);
  for (let i = 0; i < tries; i++) {
    const o = PLAYS[offPlays[i % offPlays.length]], d = PLAYS[defPlays[(i >> 1) % defPlays.length]]; if (!o || !d) continue;
    const offM = {}, defM = {}, offense = {}, defense = {};
    const build = (team, list, map, input) => { for (const s of list) { const spec = team === entry.side && s === slot ? sp : fallback(positionOf(s)); const m = generateMonster(rng, { position: positionOf(s), quality: 76, species: spec.id }); map[s] = m; input[s] = { attrs: effectiveAttributes(m), name: m.name, species: m.species }; } };
    build('off', o.onField, offM, offense); build('def', d.onField, defM, defense);
    const sim = simulatePlay({ offensePlay: o, defensePlay: d, offense, defense, ballOn: 35, seed: 100 + i });
    if (sim.events.some((e) => e.kind === 'ability' && e.side === entry.side && e.by === slot)) return { sim, offM, defM, slot, play: o.name, defPlay: d.name };
  }
  return null;
}

export function registerAbilityAudit(Router, app) {
  const st = { element: 'All', raf: null };
  const entries = SPECIES_DEX.map(auditEntry);
  const elements = ['All', ...new Set(SPECIES_DEX.map((s) => s.element))];

  Router.registerScreen('ability-audit', {
    title: 'Ability Audit', tabs: false,
    render() {
      const list = entries.filter((e) => st.element === 'All' || e.sp.element === st.element);
      const missing = entries.filter((e) => e.eff?.kind === 'ability' && !e.hooked);
      return `<p class="muted">Every species' signature ability or trait with the engine hook it fires on. <b>Staged</b> loops a scripted scene through the real effect layer; <b>In play</b> searches the engine for a play where it fires.</p>
        ${missing.length ? `<div class="panel tight warn">No activation hook (passive only): ${missing.map((e) => esc(e.sp.name)).join(', ')}</div>` : ''}
        <div class="chips" style="margin:8px 0">${elements.map((el) => `<button class="chip ${el === st.element ? 'on' : ''}" data-action="el" data-v="${el}">${el === 'All' ? 'All' : elementFx(el).glyph + ' ' + el}</button>`).join('')}</div>
        <div class="stack">${list.map((e) => {
          const L = elementFx(e.sp.element); const m = { species: e.sp.id, name: e.sp.name };
          return `<div class="panel tight audit-row"><div class="row" style="gap:10px;align-items:flex-start">${monsterSprite(m, 40)}<div class="grow" style="min-width:0"><div class="row between"><b>${esc(e.sp.name)}</b><span class="chip" style="border-color:${L.a};color:${L.a}">${L.glyph} ${esc(e.sp.element)} · ${esc(e.sp.position)}</span></div>
            <div><b style="color:${L.a}">${esc(e.eff?.name || 'None')}</b> <span class="dim">${e.eff?.kind === 'trait' ? 'trait (no field effect)' : FAMILY_LABEL[e.family]}</span></div>
            <div class="muted" style="font-size:12px">${esc(e.eff?.text || '')}</div>
            <div class="dim" style="font-size:12px">Hook: ${esc(e.key ? HOOKS[e.key] || e.key : 'none')}${e.keys.length > 1 ? ` <span class="dim">(${e.keys.join(', ')})</span>` : ''}</div>
            ${e.eff?.kind === 'ability' ? `<div class="row" style="margin-top:6px;gap:6px"><button class="btn small" data-action="staged" data-id="${e.sp.id}">▶ Staged</button>${e.hooked ? `<button class="btn small" data-action="live" data-id="${e.sp.id}">▶ In play</button>` : '<span class="chip warn">no hook</span>'}</div>` : ''}
          </div></div></div>`; }).join('')}</div>`;
    },
    mount(root) {
      delegate(root, {
        el: (el) => { st.element = el.dataset.v; Router.render(); },
        staged: (el) => preview(entries.find((e) => e.sp.id === el.dataset.id), 'staged'),
        live: (el) => preview(entries.find((e) => e.sp.id === el.dataset.id), 'live'),
      });
    },
    unmount() { stop(); },
  });

  function stop() { if (st.raf) cancelAnimationFrame(st.raf); st.raf = null; }

  function preview(entry, mode) {
    stop();
    let sim, sprites, lookup, ballOn = 30, note = '';
    if (mode === 'staged') {
      sim = stagedSim(entry); const me = { species: entry.sp.id, name: entry.sp.name }; const other = { species: 'pebble', name: 'Pebblit' }, mate = { species: 'mudcub', name: 'Muddlet' };
      const mine = { S: me, U: mate, T: other }, theirs = { T: other, U: mate, S: me };
      sprites = entry.side === 'off' ? { off: { map: mine, pool: [] }, def: { map: theirs, pool: [] } } : { off: { map: theirs, pool: [] }, def: { map: mine, pool: [] } };
      lookup = (team, slot) => (slot === 'S' ? { element: entry.sp.element, name: entry.sp.name } : { element: 'Earth', name: 'x' });
      note = `${FAMILY_LABEL[entry.family]} scene · loops`;
    } else {
      const found = findActivation(entry);
      if (!found) { sheet(`<p class="muted">The engine did not fire ${esc(entry.eff.name)} in 80 tries. It may need a specific situation (a deep throw, a strip, an interception). Try the Practice Field with this monster on the roster.</p>`, { title: entry.eff.name }); return; }
      sim = found.sim; ballOn = 35; sprites = { off: { map: found.offM, pool: [] }, def: { map: found.defM, pool: [] } };
      lookup = (team, slot) => { const m = (team === 'off' ? found.offM : found.defM)[slot]; return m ? { element: resolveSpecies(m).element, name: m.name } : null; };
      note = `${found.play} vs ${found.defPlay} · ${sim.result} · loops`;
    }
    const fx = buildFx(sim, lookup); const camTop = entry.family === 'cover' ? 56 : entry.side === 'off' ? 52 : entry.family === 'move' || entry.family === 'contact' ? 44 : 48; const cam = mode === 'staged' ? { top: camTop, bottom: camTop - 46 } : cameraFor(ballOn);
    const draw = (i) => fieldSvg({ ballOn, ballLat: sim.ballLat || 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame: sim.frames[i], prevFrame: sim.frames[i - 1] || null, fx, fxQuality: app.settings.reducedMotion ? 'min' : 'full', sprites, camera: cam, ownLabel: 'OWN', oppLabel: 'OPP' });
    const log = sim.events.filter((e) => e.kind === 'ability' || e.ability).map((e) => `<div class="entry"><span class="t">${e.t.toFixed(1)}s</span><span>${esc(e.text || e.kind)}${e.ability && e.kind !== 'ability' ? ' <b>→ outcome label</b>' : ''}</span></div>`).join('');
    sheet(`<div class="field-wrap ${mode === 'staged' ? 'audit-field' : ''}"><svg id="auditfield" viewBox="${mode === 'staged' ? AUDIT_VIEWBOX : FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet">${draw(0)}</svg></div><p class="dim" style="margin:6px 0 0">${esc(note)}</p><div class="log" style="margin-top:6px">${log || '<div class="entry"><span>No ability event logged.</span></div>'}</div>`, { title: `${elementFx(entry.sp.element).glyph} ${entry.eff.name}`, onClose: stop });
    const svg = document.querySelector('#auditfield'); const ms = 100 / (app.settings.speed || 1); let start = performance.now(); let last = -1;
    const tick = (now) => {
      const n = sim.frames.length; let idx = Math.floor((now - start) / ms);
      if (idx >= n + 6) { start = now; idx = 0; } // hold the last frame briefly, then loop
      idx = Math.min(n - 1, idx);
      if (idx !== last && svg) { last = idx; svg.innerHTML = draw(idx); }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }
}

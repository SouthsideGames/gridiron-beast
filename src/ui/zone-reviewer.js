// An isolated real-engine placement sandbox. Uses the live match's planner and
// snap path; never writes franchise progress or the user's review verdicts.
import { sheet, delegate, esc } from './dom.js';
import { fieldSvg, fieldDraw, FIELD_VIEWBOX, cameraFor } from './field-view.js';
import { zonePlans, zonePlannerHtml, zonePlannerOverlay } from './zone-planner.js';
import { setZoneChoice } from '../sim/t8/zone-planning.js';
import { SCENARIOS } from '../sim/abilities/review-scenarios.js';
import { stageScenario } from '../sim/abilities/review.js';
import { stageZoneReadiness } from './zone-review-ready.js';
import { contractOf } from '../sim/abilities/registry.js';
import { familyById } from '../data/beast-dex.js';
import { PLAYS } from '../data/playbook.js';
import { presnapFields } from './fx/match-fx.js';
import { buildFx } from './ability-fx.js';

export function openZoneReviewer(c, { form, mastery, reducedMotion = false } = {}) {
  const fam = familyById(c.family), sc = SCENARIOS[c.family];
  if (!fam || !sc) return;
  const G = stageScenario({ fam, sc, contract: contractOf(c.family), form: form || c.forms[0], mastery: mastery || 0, seed: typeof sc.seed0 === 'function' ? sc.seed0(form || c.forms[0], mastery || 0) : sc.seed0 || 1 });
  if (!G.at) return;
  let n = 0, focus = null, raf = null, replay = null, playing = false, activationAt = null, preparedNote = '';
  const { el, close } = sheet('<div data-zone-review></div>', { title: `${c.name} — Zone Placement`, onClose: () => { if (raf) cancelAnimationFrame(raf); } });
  const box = el.querySelector('[data-zone-review]');
  function config() {
    G.api.followUp = activationAt == null ? null : Math.max(0, n - activationAt - 1);
    return activationAt != null && sc.after ? { ...sc, ...sc.after } : sc;
  }
  function prepare() {
    const cfg = config();
    const unit = typeof cfg.unit === 'function' ? cfg.unit(n, G.api) : cfg.unit;
    const possession = unit === 'defense' ? 'away' : 'home';
    // The staging contract uses these same values in snap(). No charge is spent by previewing.
    Object.assign(G.state, { phase: 'scrimmage', possession, ballOn: cfg.ballOn ?? 35, ballLat: 0, down: 1, toGo: cfg.toGo ?? 10 });
    const calls = typeof cfg.calls === 'function' ? cfg.calls(n, G.api) : cfg.calls?.[n % cfg.calls.length] || ['inside_zone', 'cover_3'];
    return { offense: calls[0], defense: calls[1], kick: cfg.kick || null };
  }
  function render() {
    const calls = prepare(), state = G.state, cam = cameraFor(state.ballOn);
    const plans = calls.kick ? [] : zonePlans(state, G.teams, 'home', calls.offense, calls.defense).filter((p) => p.owner === G.subject.id);
    const plan = plans.find((p) => p.key === focus) || plans[0];
    const look = { play: PLAYS[G.at.side === 'offense' ? calls.offense : calls.defense], offensePlay: PLAYS[calls.offense], defensePlay: PLAYS[calls.defense] };
    const other = state.possession === 'home' ? 'away' : 'home';
    const sprites = { off: { map: G.teams[state.possession].offense, pool: [] }, def: { map: G.teams[other].defense, pool: [] } };
    const fields = presnapFields(state, G.teams, calls).map((p) => p.field);
    box.innerHTML = `<p class="dim">Real-engine practice · ${esc(c.name)} · snap ${n + 1}. No franchise progress is saved.</p><p class="dim" style="font-size:12px">${esc(sc.how || '')}</p><div class="field-wrap"><svg data-zone-field viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet">${fieldSvg({ ballOn: state.ballOn, presnap: look, fields, sprites, underlay: zonePlannerOverlay(plan, state, cam, { reducedMotion }) })}</svg></div>${zonePlannerHtml(plans, { focus })}${preparedNote ? `<p class="dim">${esc(preparedNote)}</p>` : ''}${plans.length ? '' : '<p class="dim">No zone is ready yet. Run the staged play to earn or charge it.</p>'}<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn primary" data-action="zonesnap">${calls.kick ? 'Run Kick Prerequisite' : 'Snap / Confirm Placement'}</button><button class="btn" data-action="zoneprepare">Prepare Ready Zone</button><button class="btn ghost" data-action="zonereset">Restart Test</button>${replay ? '<button class="btn" data-action="zonereplay">Replay Last Play</button>' : ''}</div><div class="dim" data-zone-result style="font-size:12px;margin-top:8px">${replay ? esc(replay.text) : 'Select a placement, then snap. Run further plays to inspect duration and overlaps.'}</div>`;
  }
  function animate(rec) {
    const sim = rec.sim; if (!sim?.frames?.length) { render(); return; }
    playing = true; box.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const lookup = (side, slot) => { const m = rec.sprites?.[side]?.[slot]; return m ? { element: m.type, species: m.species, name: m.name } : null; };
    const fx = buildFx(sim, lookup, { preroll: true }), frames = sim.frames;
    const svg = box.querySelector('[data-zone-field]'), start = performance.now(), lead = fx?.preroll || 0, end = Math.max(frames.at(-1).t, ...(sim.events || []).map((e) => e.t || 0)) + 1.6;
    const draw = (now) => {
      const t = (now - start) / 1000 - lead; let i = 0; while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
      fieldDraw(svg, { ballOn: sim.ballOn ?? rec.ballOn, ballLat: sim.ballLat || 0, frame: frames[i], prevFrame: frames[Math.max(0, i - 1)], fields: sim.fields, fx, time: t, sprites: { off: { map: rec.sprites.off, pool: [] }, def: { map: rec.sprites.def, pool: [] } }, fxOptions: { reducedFlash: reducedMotion } });
      if (t < end) raf = requestAnimationFrame(draw); else { playing = false; raf = null; render(); }
    };
    raf = requestAnimationFrame(draw);
  }
  delegate(box, {
    zonepick: (e) => { if (playing) return; setZoneChoice(G.state, e.dataset.zone, e.dataset.choice); focus = e.dataset.zone; render(); },
    zonefocus: (e) => { if (playing) return; focus = e.dataset.zone; render(); },
    zonesnap: () => { if (playing) return; const cfg = config(), index = n++; replay = G.snap(index, cfg); if (replay.executed && activationAt == null) activationAt = index; animate(replay); },
    zoneprepare: () => {
      if (playing) return;
      const staged = stageZoneReadiness(G, c.family, form || c.forms[0], mastery || 0);
      let attempts = 0;
      while (attempts < 48) {
        const calls = prepare();
        if (!calls.kick && zonePlans(G.state, G.teams, 'home', calls.offense, calls.defense).some((p) => p.owner === G.subject.id && p.placementOptions.length)) break;
        const cfg = config(), index = n++, rec = G.snap(index, cfg); replay = rec; attempts++;
        if (rec.executed && activationAt == null) activationAt = index;

      }
      preparedNote = staged ? 'Ready state staged for placement testing only. Restart Test to replay the natural trigger.' : attempts ? `Played ${attempts} real staged prerequisites. Charges and outcomes came from the engine.` : 'Select a placement for each zone below, then press Snap / Confirm Placement.';
      render();
    },
    zonereset: () => { if (playing) return; close(); openZoneReviewer(c, { form, mastery, reducedMotion }); },
    zonereplay: () => { if (!playing && replay) animate(replay); },
  });
  render();
}

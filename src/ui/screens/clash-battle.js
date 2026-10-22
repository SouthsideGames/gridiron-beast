// Beast Clash in Franchise Mode: the one battle screen for Tuesday encounters, the pregame Clash and the overtime Clash (GDD §26).
// The screen never decides a battle: the franchise module draws the seed and fixes the lineups, the engine plays the battle, and
// this screen shows the record (through the arena player) and collects the player's own choices: the lineup, how to watch
// (Play / Auto / Skip to Results), the speed, and, in Play mode, each swap decision. Auto and Skip show the identical battle.
import { esc, delegate, toast, sheet, fmtMoney } from '../dom.js';
import { monsterSprite } from '../pixel-monster.js';
import * as F from '../../franchise/franchise.js';
import { CLASH_MODES, CLASH_SPEEDS, clashSettings, pendingDecision } from '../../franchise/clash-link.js';
import { createArena } from '../clash/arena.js';
import { stateAt } from '../clash/choreographer.js';
import { monsterOverall } from '../../data/monsters.js';
import { archetypeOf } from '../../clash/stats.js';
import { startSundayGame } from './match.js';

const ARCH_GLYPH = { Tank: '🛡', Striker: '⚔️', Support: '💚', Disruptor: '🌀', Balanced: '⚖️' };
export const MODE_TEXT = Object.freeze({
  play: { label: 'Play battle', help: 'You decide when your monsters swap. Watch every exchange.' },
  auto: { label: 'Auto battle', help: 'Your monsters fight on their own. Watch every exchange.' },
  skip: { label: 'Skip to results', help: 'The same battle is played instantly and you see the result. Skipping never lowers your chance of winning.' },
});
export const HELP_HTML = `<p><b>Beast Clash</b> is a monster battle. Each side lines up up to three monsters; the front two trade strikes, Supports and bench Disruptors act from the back, and a side may swap its front monster out every few exchanges. The last side standing wins (or the side with more health left after 30 exchanges).</p>
<p><b>Play battle</b> lets you make the swap decisions. <b>Auto battle</b> plays them for you. <b>Skip to results</b> plays the very same battle as Auto, instantly: it is never a worse chance of winning, just less to watch.</p>
<p><b>Skipping a Tuesday encounter</b> is different: no battle happens, so there is no chance to sign that monster this week. Nothing else is lost.</p>
<p>Monsters that battle earn a little experience and get slightly tired. Injured monsters sit out.</p>`;

/**
 * A binding tells the screen which battle it is showing. Every battle record lives in the franchise save, so the screen can be
 * closed and reopened mid-battle. Bindings: encounter (Tuesday). Pregame and overtime are added in their milestones.
 */
function bindings(app, Router) {
  return {
    encounter: {
      title: 'Tuesday · Beast Clash',
      skipLabel: 'Skip encounter', skipHelp: 'Skipping the encounter means no battle and no chance to sign this monster this week. Nothing else is lost: no morale, no board confidence, no progress.',
      skip: (f) => { F.skipEncounter(f); app.save(); toast('Encounter skipped. On to Wednesday.'); Router.go('hq', {}, { reset: true }); },
      record: (f) => f.week.encounter,
      preview: (f, i) => F.encounterPreview(f, i),
      start: (f, i, opts) => F.startEncounter(f, i, opts),
      battle: (f) => F.encounterBattle(f),
      decide: (f, ex, choice) => F.encounterDecide(f, ex, choice),
      resolve: (f) => F.resolveEncounter(f),
      occasion: 'encounter', mySide: 'a',
      resultHtml(f, e) {
        const p = f.week.prospects[e.prospectIndex]; const m = p?.monster; if (!m) return '';
        const won = e.result?.winner === 'a';
        if (e.status === 'offer') { const cap = F.salarySummary(f, m.salary); return `<div class="panel"><p><b>${esc(m.name)}</b> is impressed and wants to join ${esc(f.club)}.</p><p class="muted">${esc(m.position)} · ${monsterOverall(m)} OVR · ${fmtMoney(m.salary)}/yr · roster ${f.roster.length + 1}/${F.ROSTER_MAX}${cap.over ? ` · <span style="color:var(--bad)">over the cap by ${fmtMoney(-cap.remaining)}</span>` : ` · cap room after ${fmtMoney(cap.remaining)}`}</p><div class="row"><button class="btn primary grow" data-action="accept">Sign ${esc(m.name)}</button><button class="btn" data-action="decline">Let them go</button></div></div>`; }
        if (e.status === 'pitch') return `<div class="panel"><p>${esc(m.name)} won the battle, but will still hear <b>one</b> pitch. Pick your approach.</p><div class="grid3">${F.RECRUIT_APPROACHES.map((a) => `<button class="btn small" data-action="pitch" data-v="${a.id}" title="${esc(a.text)}">${esc(a.label)}</button>`).join('')}</div><p class="dim">The usual odds apply: development suits young monsters, facilities impress strong ones, playing time matters when you are short at their position.</p></div>`;
        return `<div class="panel"><p>${e.status === 'signed' ? `<b>${esc(m.name)}</b> signed!` : e.status === 'walked' ? `${esc(m.name)} turned you down.` : `You let ${esc(m.name)} go.`}${won ? '' : ''}</p><button class="btn primary block" data-action="done">Continue to Wednesday</button></div>`;
      },
      actions(root, rerender) {
        return {
          accept: async () => { const f = app.f; const e = f.week.encounter; const p = f.week.prospects[e.prospectIndex]; const rc = F.releaseCandidates(f, p);
            if (rc.needed) { const { el: sh, close } = sheet(`<p>${esc(rc.reason)} Choose who leaves so <b>${esc(p.monster.name)}</b> can sign.</p><div class="list">${rc.list.map((c) => `<button class="item" data-rel="${c.id}"><div class="grow"><div class="name">${esc(c.name)}</div><div class="sub">${c.position} · ${c.ovr} OVR · ${fmtMoney(c.salary)}/yr${c.capOk ? '' : ' · still over the cap after this'}</div></div><span class="chip ${c.position === p.monster.position ? 'accent' : ''}">${c.position === p.monster.position ? 'same position' : 'release'}</span></button>`).join('')}</div>`, { title: 'Make room' });
              sh.addEventListener('click', (ev) => { const id = ev.target.closest('[data-rel]')?.dataset.rel; if (!id) return; close(); const r = F.acceptOffer(f, { releaseId: id }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.overCap ? `${r.monster.name} signed. You are over the cap: the commissioner reviews the books on Saturday.` : `${r.monster.name} signed!`, r.overCap ? 'bad' : 'good'); rerender(); }); return; }
            const r = F.acceptOffer(f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.overCap ? `${r.monster.name} signed. You are over the cap: the commissioner reviews the books on Saturday.` : `${r.monster.name} signed!`, r.overCap ? 'bad' : 'good'); rerender(); },
          decline: () => { const r = F.declineOffer(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); rerender(); },
          pitch: (el) => { const f = app.f; const e = f.week.encounter; const r = F.recruit(f, e.prospectIndex, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.success ? `${r.monster.name} signed!` : 'They turned you down.', r.success ? 'good' : 'info'); rerender(); },
          done: () => Router.go('hq', {}, { reset: true }),
        };
      },
    },
    pregame: {
      title: 'Sunday · Beast Clash for possession',
      record: (f) => f.week.pregame,
      preview: (f) => F.pregamePreview(f),
      start: (f, i, opts) => F.startPregameClash(f, opts),
      battle: (f) => F.pregameBattle(f),
      decide: (f, ex, choice) => F.pregameDecide(f, ex, choice),
      resolve: (f) => F.resolvePregameClash(f),
      occasion: 'pregame', mySide: 'a',
      introText: (f) => { const pv = F.pregamePreview(f); return `Before kickoff against <b>${esc(pv.opponent || 'the opponent')}</b>, three of your monsters battle three of theirs. The winner chooses who gets the ball first.`; },
      resultHtml(f, e) {
        const opp = e.opponent || 'The opponent';
        if (e.status === 'choose') return `<div class="panel"><p><b>You choose the opening possession.</b></p><div class="stack"><button class="btn primary" data-action="choose" data-v="receive">Receive the opening kickoff</button><button class="btn" data-action="choose" data-v="defer">Defer to the second half</button><button class="btn" data-action="choose" data-v="kick">Kick off</button></div><p class="dim">Receive: you start with the ball. Defer: they start, you get it after halftime. Kick: they start and you kick off again after halftime.</p></div>`;
        const theirs = e.result?.winner !== 'a';
        return `<div class="panel"><p>${theirs ? `<b>${esc(opp)}</b> won the Clash and chose to <b>${esc(e.choice === 'defer' ? 'defer to the second half' : 'receive the opening kickoff')}</b>.` : `You chose to <b>${esc(e.choice === 'receive' ? 'receive the opening kickoff' : e.choice === 'defer' ? 'defer to the second half' : 'kick off')}</b>.`}</p><button class="btn primary big block" data-action="kickoff">🏈 Kick off</button></div>`;
      },
      actions() {
        return {
          choose: (el) => { const r = F.choosePossession(app.f, el.dataset.v); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); Router.render(); },
          kickoff: () => { startSundayGame(app.f); },
        };
      },
    },
    overtime: {
      title: 'Overtime · Beast Clash',
      record: (f) => f.week.overtime,
      preview: (f) => F.overtimePreview(f),
      start: (f, i, opts) => F.startOvertimeClash(f, opts),
      battle: (f) => F.overtimeBattle(f),
      decide: (f, ex, choice) => F.overtimeDecide(f, ex, choice),
      resolve: (f) => F.resolveOvertimeClash(f),
      occasion: 'overtime', mySide: 'a',
      introText: (f) => { const pv = F.overtimePreview(f); const s = f.game?.state; return `Still tied${s ? ` at ${s.score.home}-${s.score.away}` : ''} after overtime against <b>${esc(pv.opponent || 'the opponent')}</b>. A <b>${pv.size}v${pv.size}</b> Beast Clash decides the game${pv.playoff ? ' (playoffs: five a side)' : ''}. The football score stays as it is.`; },
      resultHtml(f, e) {
        const s = f.game?.state; const won = e.result?.winner === 'a';
        return `<div class="panel"><p>${won ? `<b>You win the game</b> ${s ? `${s.score.home}-${s.score.away}` : ''} on the overtime Beast Clash.` : `<b>${esc(e.opponent)}</b> win the game ${s ? `${s.score.home}-${s.score.away}` : ''} on the overtime Beast Clash.`}</p><p class="dim">The record shows the football score and notes the Clash tiebreaker.</p><button class="btn primary big block" data-action="final">Continue to the final →</button></div>`;
      },
      actions() {
        return {
          final: () => { const f = app.f; if (!f.game?.state) { Router.go('hq', {}, { reset: true }); return; } F.applyTiebreak(f, f.game.state); app.save(); Router.go('match', {}, { reset: true }); },
        };
      },
    },
  };
}

export function registerClashBattle(Router, app) {
  const BINDINGS = bindings(app, Router);
  const st = { kind: null, i: 0, arena: null, cursor: 0, result: null, lineup: null, mode: null, editing: false, asked: false };
  const settings = () => clashSettings(app.f?.settings);
  const saveSettings = (patch) => { if (!app.f) return; app.f.settings.clash = { ...settings(), ...patch }; app.save(); };
  const stop = () => { if (st.arena) { st.cursor = st.arena.cursor; st.arena.destroy(); st.arena = null; } };
  const B = () => BINDINGS[st.kind];

  // ---------- setup (before the seed is drawn)
  function setupHtml(f) {
    const b = B(); const pv = b.preview(f, st.i);
    if (!pv.ok) return `<div class="panel"><p>${esc(pv.reason)}</p><button class="btn block" data-action="back">Back</button></div>`;
    st.lineup = (st.lineup || pv.lineup.map((m) => m.id)).filter((id) => pv.eligible.some((m) => m.id === id)).slice(0, pv.size); if (!st.lineup.length) st.lineup = pv.lineup.map((m) => m.id);
    const mine = st.lineup.map((id) => f.roster.find((m) => m.id === id));
    const s = settings(); const mode = st.mode || (s.mode !== 'ask' ? s.mode : null);
    const card = (m, i, side) => `<div class="item static" style="min-height:0;padding:6px 8px;gap:8px">${monsterSprite(m, 34)}<div class="grow" style="font-size:12px;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>${esc(m.name)}</b> <span class="dim">${monsterOverall(m)} OVR</span></div><div class="dim" style="white-space:nowrap">${ARCH_GLYPH[archetypeOf(m.species)] || ''} ${esc(archetypeOf(m.species) || '')} · ${esc(m.type)} · ${i === 0 ? 'front' : `bench ${i}`}${m.fatigue >= 30 ? ` · tired ${m.fatigue}%` : ''}</div></div>${side === 'a' && i > 0 ? `<button class="btn small ghost" data-action="moveup" data-i="${i}" title="Move up">↑</button>` : ''}</div>`;
    return `<p class="muted">${b.introText ? b.introText(f) : `You met <b>${esc(pv.wild[0].name)}</b> in the wild${pv.wild.length > 1 ? ` with ${pv.wild.length - 1} companion${pv.wild.length > 2 ? 's' : ''}` : ''}. Win the ${pv.size}v${pv.size} and they will want to join you; lose and you still get one pitch.`} <button class="btn small ghost" data-action="help">Help</button></p>
      <div class="stack" style="gap:8px">
        <div class="panel"><div class="row between"><b>Your team</b><span class="dim">${mine.length} of ${pv.size}</span></div><div class="list" style="margin-top:6px">${mine.map((m, i) => card(m, i, 'a')).join('')}</div>
          <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn small" data-action="edit">${st.editing ? 'Done' : 'Change lineup'}</button><button class="btn small ghost" data-action="autol">Auto lineup</button></div>
          ${st.editing ? `<div class="list" style="margin-top:6px;max-height:260px;overflow:auto">${pv.eligible.map((m) => `<button class="item ${st.lineup.includes(m.id) ? 'on' : ''}" style="min-height:0;padding:6px 8px" data-action="toggle" data-id="${m.id}">${monsterSprite(m, 28)}<div class="grow" style="font-size:12px"><b>${esc(m.name)}</b> <span class="dim">${ARCH_GLYPH[archetypeOf(m.species)] || ''} ${esc(archetypeOf(m.species) || '')} · ${esc(m.type)} · ${monsterOverall(m)} OVR${m.fatigue >= 30 ? ` · tired ${m.fatigue}%` : ''}</span></div>${st.lineup.includes(m.id) ? `<span class="chip accent">${st.lineup.indexOf(m.id) + 1}</span>` : ''}</button>`).join('')}</div><p class="dim">Tap to add or remove; the order you tap is the lineup order. Up to ${pv.size}.</p>` : ''}</div>
        <div class="panel"><b>Their team</b><div class="list" style="margin-top:6px">${pv.wild.map((m, i) => card(m, i, 'b')).join('')}</div></div>
      </div>
      <div class="panel" style="margin-top:8px"><b>How do you want to battle?</b>
        <div class="stack" style="margin-top:6px">${CLASH_MODES.map((k) => `<button class="btn ${mode === k ? 'primary' : ''} block" data-action="mode" data-v="${k}" style="display:block;text-align:left;height:auto;padding:8px 12px"><div><b>${mode === k ? '● ' : '○ '}${MODE_TEXT[k].label}</b></div><div style="font-weight:400;font-size:12px;opacity:.8">${MODE_TEXT[k].help}</div></button>`).join('')}</div>
        <label class="field row" style="margin-top:6px"><input type="checkbox" style="width:auto;min-height:0" data-change="remember" ${s.mode !== 'ask' ? 'checked' : ''}> Remember my choice (change it any time in Settings)</label>
      </div>
      <div class="row" style="gap:8px;margin-top:8px"><button class="btn primary big grow" data-action="enter" ${mode ? '' : 'disabled'}>${mode ? `${MODE_TEXT[mode].label} →` : 'Choose how to battle'}</button>${b.skipLabel ? `<button class="btn big" data-action="skipenc">${esc(b.skipLabel)}</button>` : ''}</div>
      ${b.skipHelp ? `<p class="dim" style="margin-top:6px">${b.skipHelp}</p>` : ''}`;
  }

  // ---------- the battle itself
  function battleHtml(f, e) {
    const s = settings();
    return `<div class="row between" style="margin-bottom:6px"><span class="muted">${MODE_TEXT[e.mode].label} · ${e.size}v${e.size}</span><span class="chips">${CLASH_SPEEDS.map((x) => `<button class="chip ${s.speed === x ? 'on accent' : ''}" data-action="speed" data-v="${x}">${x}×</button>`).join('')}</span></div>
      <div id="fb-arena"></div>
      <div class="row" style="gap:6px;margin-top:6px"><button class="btn small" data-action="toresults">Skip to results</button><button class="btn small ghost" data-action="help">Help</button></div>`;
  }
  function mountBattle(root, f, e) {
    const host = root.querySelector('#fb-arena'); if (!host) return;
    st.result = B().battle(f); if (!st.result) { toast('The battle could not be rebuilt.', 'bad'); return; }
    const pend = e.mode === 'play' ? pendingDecision(st.result) : null;
    const stopAt = pend ? pend.index : st.result.log.length - 1;
    st.arena = createArena(host, st.result, { speed: settings().speed, reducedMotion: app.settings?.reducedMotion, onCursor: (i) => { st.cursor = i; if (pend && i >= pend.index) { st.arena?.pause(); askDecision(f, pend); } }, onEnd: () => finish(f) });
    if (st.cursor) st.arena.setCursor(Math.min(st.cursor, stopAt));
    if (st.cursor >= stopAt) { if (pend) askDecision(f, pend); else finish(f); return; }
    setTimeout(() => st.arena?.play(), 300);
  }
  function askDecision(f, pend) {
    if (st.asked === `${pend.ex}`) return; st.asked = `${pend.ex}`;
    const r = st.result; const state = stateAt(r, pend.index); const side = B().mySide; const all = [...r.lines.a, ...r.lines.b]; const byId = Object.fromEntries(all.map((x) => [x.id, x]));
    const front = byId[pend.actor]; const fs = state.S[side][front.id];
    const foe = state.front[side === 'a' ? 'b' : 'a']; const foeX = foe ? byId[foe] : null;
    const row = (id) => { const x = byId[id]; const sx = state.S[side][id]; return `<button class="item" data-pick="${id}"><div class="grow"><div class="name">${esc(x.name)} <span class="dim">${ARCH_GLYPH[x.archetype]} ${esc(x.archetype)} · ${esc(x.type)}</span></div><div class="sub">HP ${sx.hp}/${sx.maxHp}${sx.cond ? ` · ${sx.cond}` : ''} · ${esc(x.combatant.move.name)}</div></div><span class="chip">swap in</span></button>`; };
    const { el, close } = sheet(`<p>Exchange ${pend.ex}. <b>${esc(front.name)}</b> is in front (HP ${fs.hp}/${fs.maxHp}${fs.cond ? `, ${fs.cond}` : ''})${foeX ? ` against <b>${esc(foeX.name)}</b> (${esc(foeX.type)}, HP ${state.S[foe[0]][foe].hp}/${state.S[foe[0]][foe].maxHp})` : ''}.</p><div class="list">${pend.options.map(row).join('')}<button class="item" data-pick="stay"><div class="grow"><div class="name">Keep ${esc(front.name)} in front</div><div class="sub">Ask again in a few exchanges</div></div><span class="chip accent">stay</span></button></div><p class="dim">A monster that swaps in acts at half strength this exchange.</p>`, { title: 'Your call', onClose: () => { st.asked = false; } });
    el.addEventListener('click', (ev) => { const pick = ev.target.closest('[data-pick]')?.dataset.pick; if (!pick) return; close(); st.asked = false; const r2 = B().decide(f, pend.ex, pick); if (!r2.ok) { toast(r2.reason, 'bad'); return; } app.save(); stop(); st.cursor = pend.index; Router.render(); });
  }
  function finish(f) {
    const r = B().resolve(f); if (!r.ok) { if (r.pending) { Router.render(); return; } toast(r.reason, 'bad'); return; }
    app.save(); stop(); st.cursor = 0; Router.render();
  }
  /** Each battler's XP: amount gained, a bar toward the next level, and any level-up. */
  function xpRows(e) {
    const rows = (e.events || []).filter((x) => x.kind === 'xp'); const lv = (e.events || []).filter((x) => x.kind === 'levelup');
    if (!rows.length) return `<div class="dim" style="margin-top:4px">Your battlers earned experience${lv.length ? ` · <b>${esc(lv.map((x) => `${x.name} → level ${x.level}`).join(', '))}</b>` : ''}.</div>`;
    return `<div style="margin-top:8px;text-align:left">${rows.map((x) => `<div class="row between" style="font-size:13px;gap:8px;margin-top:4px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(x.name)}</b> <span class="mono" style="color:var(--good)">+${x.amount} XP</span>${x.levelsGained ? ` <span class="chip good">Level ${x.level}!</span>` : ''}</span><span class="dim mono" style="white-space:nowrap">Lv ${x.level} · ${x.xp}/${x.next}</span></div><div class="bar" style="margin:2px 0 0"><i style="width:${Math.min(100, Math.round(x.xp / x.next * 100))}%"></i></div>`).join('')}</div>`;
  }
  function resultHtml(f, e) {
    const r = e.result; const won = r?.winner === B().mySide; const mine = f.roster.filter((m) => e.mine.includes(m.id));
    return `<div class="panel ${won ? 'good' : ''}" style="text-align:center"><div style="font-size:22px;font-weight:800">${won ? (st.kind === 'pregame' ? 'YOU WON THE CLASH' : st.kind === 'overtime' ? 'YOU WIN THE GAME' : 'VICTORY') : (st.kind === 'pregame' ? 'THEY WON THE CLASH' : st.kind === 'overtime' ? 'THEY WIN THE GAME' : 'DEFEAT')}</div><div class="muted">${r.by === 'knockout' ? 'By knockout' : r.by === 'hp' ? 'On health left after 30 exchanges' : 'On a coin flip after an exact tie'} · ${r.exchanges} exchange${r.exchanges === 1 ? '' : 's'}</div>
      <div class="row" style="justify-content:center;gap:6px;margin-top:6px">${mine.map((m) => monsterSprite(m, 30)).join('')}</div>
      ${xpRows(e)}
      <div class="row" style="justify-content:center;gap:6px;margin-top:6px"><button class="btn small ghost" data-action="replay">Watch the replay</button></div></div>
      ${B().resultHtml(f, e)}`;
  }

  Router.registerScreen('clash-battle', {
    title: ({ params }) => BINDINGS[params.kind || st.kind]?.title || 'Beast Clash', tabs: false,
    render({ f, params }) {
      if (params.kind) st.kind = params.kind; if (params.i != null) st.i = Number(params.i);
      const b = B(); if (!b || !f) return '<p>No battle.</p>';
      const e = b.record(f);
      if (!e || e.status === 'ready' || e.status === 'skipped') return setupHtml(f);
      if (!f.week || (st.kind === 'pregame' && f.game) || (st.kind === 'overtime' && !f.game)) { setTimeout(() => Router.go(f.game ? 'match' : 'hq', {}, { reset: true }), 0); return '<p class="muted">Opening the game…</p>'; }
      if (e.status === 'battle') { if (e.mode === 'skip' && !st.replaying) { setTimeout(() => finish(f), 0); return '<p class="muted">Playing the battle…</p>'; } return battleHtml(f, e); }
      if (st.replaying) return `${battleHtml(f, { ...e, mode: 'auto' })}<button class="btn block" data-action="endreplay" style="margin-top:8px">Back to the result</button>`;
      return resultHtml(f, e);
    },
    mount(root) {
      const f = app.f; const b = B(); if (!b || !f) return; const e = b.record(f);
      const rerender = () => Router.render();
      delegate(root, {
        back: () => Router.back(),
        help: () => sheet(HELP_HTML, { title: 'How Beast Clash works' }),
        mode: (el) => { st.mode = el.dataset.v; if (root.querySelector('[data-change="remember"]')?.checked) saveSettings({ mode: st.mode }); Router.render(); },
        edit: () => { st.editing = !st.editing; Router.render(); },
        autol: () => { st.lineup = null; st.editing = false; Router.render(); },
        toggle: (el) => { const id = el.dataset.id; const pv = b.preview(f, st.i); if (st.lineup.includes(id)) st.lineup = st.lineup.filter((x) => x !== id); else if (st.lineup.length < pv.size) st.lineup.push(id); else toast(`Up to ${pv.size} monsters`, 'info'); Router.render(); },
        moveup: (el) => { const i = Number(el.dataset.i); if (i > 0) { [st.lineup[i - 1], st.lineup[i]] = [st.lineup[i], st.lineup[i - 1]]; Router.render(); } },
        enter: () => { const mode = st.mode || (settings().mode !== 'ask' ? settings().mode : null); if (!mode) return; const r = b.start(f, st.i, { lineup: st.lineup, mode }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); st.cursor = 0; st.editing = false; Router.render(); },
        skipenc: () => b.skip?.(f, Router),
        speed: (el) => { saveSettings({ speed: Number(el.dataset.v) }); st.arena?.setSpeed(Number(el.dataset.v)); Router.render(); },
        toresults: () => { if (e?.mode === 'play' && pendingDecision(st.result || b.battle(f))) { toast('Finish the open swap decision first (or choose Keep in front).', 'info'); return; } stop(); if (st.replaying) { st.replaying = false; Router.render(); return; } finish(f); },
        replay: () => { st.replaying = true; st.cursor = 0; Router.render(); },
        endreplay: () => { stop(); st.replaying = false; st.cursor = 0; Router.render(); },
        ...b.actions(root, rerender),
      });
      root.addEventListener('change', (ev) => { if (ev.target.dataset.change === 'remember') saveSettings({ mode: ev.target.checked ? (st.mode || 'ask') : 'ask' }); });
      root.classList.toggle('cl-wide', !!(e && (e.status === 'battle' || st.replaying)));
      if (e && e.status === 'battle' && e.mode !== 'skip') mountBattle(root, f, e);
      else if (e && st.replaying) { st.result = b.battle(f); const host = root.querySelector('#fb-arena'); if (host && st.result) { st.arena = createArena(host, st.result, { speed: settings().speed, reducedMotion: app.settings?.reducedMotion, onCursor: (i) => { st.cursor = i; } }); setTimeout(() => st.arena?.play(), 300); } }
    },
    unmount() { stop(); st.asked = false; st.replaying = false; },
  });
  return st;
}

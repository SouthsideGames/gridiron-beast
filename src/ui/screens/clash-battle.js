// Beast Clash in Franchise Mode: the one battle screen for Tuesday encounters, the pregame Clash and the overtime Clash (GDD §26).
// The screen never decides a battle: the franchise module draws the seed and fixes the lineups, the engine plays the battle, and
// this screen shows the record (through the arena player). Revised 2026-10-22 (owner brief): ONE selection phase (the monsters
// and their order of entry), then ONE continuous battle with no further decisions; the next monster steps up on a knockout
// until one side has nobody left. Watch and Skip to results are the identical battle.
import { esc, delegate, toast, sheet, fmtMoney } from '../dom.js';
import { monsterSprite } from '../pixel-monster.js';
import * as F from '../../franchise/franchise.js';
import { CLASH_MODES, CLASH_SPEEDS, clashSettings, pendingDecision, policiesOf, normalizeMode } from '../../franchise/clash-link.js';
import { consequence } from '../../franchise/assist-advice.js';
import { createArena } from '../clash/arena.js';
import { stateAt } from '../clash/choreographer.js';
import { monsterOverall } from '../../data/monsters.js';
import { archetypeOf } from '../../clash/stats.js';
import { typeFactor, typeEdge } from '../../clash/types.js';
import { startSundayGame } from './match.js';

const ARCH_GLYPH = { Tank: '🛡', Striker: '⚔️', Support: '💚', Disruptor: '🌀', Balanced: '⚖️' };
export const MODE_TEXT = Object.freeze({
  watch: { label: 'Watch battle', help: 'Watch every exchange. Your monsters enter in the order you set.' },
  skip: { label: 'Skip to results', help: 'The same battle, resolved instantly. Skipping never changes who wins.' },
});
export const SPEED_LABEL = Object.freeze({ 1: 'Normal', 2: 'Fast', 4: 'Fastest' });
export const HELP_HTML = `<p><b>Beast Clash</b> is a monster battle. Each side lines up its monsters in an order of entry; the two front monsters trade strikes, Supports and bench Disruptors act from the back. When a monster is knocked out, the next in line steps up with the battle as it stands (health and conditions carry on). The last side standing wins, or the side with more health left after 30 exchanges.</p>
<p><b>One choice, one battle.</b> You pick your monsters and the order they enter before the battle, then it runs on its own to the end. No menus interrupt it.</p>
<p><b>Watch battle</b> shows every exchange at the speed you choose. <b>Skip to results</b> plays the very same battle instantly: it is never a worse chance of winning, just less to watch.</p>
<p><b>Type edges:</b> ▲ next to a monster means its element hits the one in front of it harder; ▼ means it hits softer. Put a monster with ▲ in front, and keep your toughest for last.</p>
<p><b>Tuesday encounters:</b> the monster you chose fights beside two wild companions. They are matched to your club's strength and cannot be signed; only the monster you chose can join you.</p>
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
      theirName: () => 'The wild',
      record: (f) => f.week.encounter,
      preview: (f, i) => F.encounterPreview(f, i),
      start: (f, i, opts) => F.startEncounter(f, i, opts),
      battle: (f) => F.encounterBattle(f),
      resolve: (f) => F.resolveEncounter(f),
      occasion: 'encounter', mySide: 'a',
      resultHtml(f, e) {
        const p = f.week.prospects[e.prospectIndex];
        // Signing or letting the monster go clears the week's prospects; the result screen then names it from the battle snapshot and always offers the way on.
        const m = p?.monster || f.roster.find((x) => x.id === e.wild?.[0]) || e.b?.[0] || null;
        if (!m) return '<div class="panel"><button class="btn primary block" data-action="done">Continue to Wednesday</button></div>';
        const won = e.result?.winner === 'a';
        if (e.status === 'offer') { const cap = F.salarySummary(f, m.salary); return `<div class="panel"><p><b>${esc(m.name)}</b> is impressed and wants to join ${esc(f.club)}.</p><p class="muted">${esc(m.position)} · ${monsterOverall(m)} OVR · ${fmtMoney(m.salary)}/yr · roster ${f.roster.length + 1}/${F.ROSTER_MAX}${cap.over ? ` · <span style="color:var(--bad)">over the cap by ${fmtMoney(-cap.remaining)}</span>` : ` · cap room after ${fmtMoney(cap.remaining)}`}</p>${(() => { const c = consequence(f, 'sign', { salary: m.salary }); return c ? `<p class="assist-note">${esc(c)}</p>` : ''; })()}<div class="row"><button class="btn primary grow" data-action="accept">Sign ${esc(m.name)}</button><button class="btn" data-action="decline">Let them go</button></div></div>`; }
        if (e.status === 'pitch') return `<div class="panel"><p>${esc(m.name)} won the battle, but will still hear <b>one</b> pitch. Pick your approach.</p><div class="grid3">${F.RECRUIT_APPROACHES.map((a) => `<button class="btn small" data-action="pitch" data-v="${a.id}" title="${esc(a.text)}">${esc(a.label)}</button>`).join('')}</div><p class="dim">The usual odds apply: development suits young monsters, facilities impress strong ones, playing time matters when you are short at their position.</p><button class="btn block" data-action="decline">Let them go</button></div>`;
        return `<div class="panel"><p>${e.status === 'signed' ? `<b>${esc(m.name)}</b> signed!` : e.status === 'walked' ? `${esc(m.name)} turned you down.` : `You let ${esc(m.name)} go.`}${won ? '' : ''}</p><button class="btn primary block" data-action="done">Continue to Wednesday</button></div>`;
      },
      actions(root, rerender) {
        return {
          accept: async () => { const f = app.f; const e = f.week.encounter; const p = f.week.prospects[e.prospectIndex]; const rc = F.releaseCandidates(f, p);
            if (rc.needed) { const { el: sh, close } = sheet(`<p>${esc(rc.reason)} Choose who leaves so <b>${esc(p.monster.name)}</b> can sign.</p><div class="list">${rc.list.map((c) => `<button class="item" data-rel="${c.id}"><div class="grow"><div class="name">${esc(c.name)}</div><div class="sub">${c.position} · ${c.ovr} OVR · ${fmtMoney(c.salary)}/yr${c.capOk ? '' : ' · still over the cap after this'}</div></div><span class="chip ${c.position === p.monster.position ? 'accent' : ''}">${c.position === p.monster.position ? 'same position' : 'release'}</span></button>`).join('')}</div>`, { title: 'Make room' });
              sh.addEventListener('click', (ev) => { const id = ev.target.closest('[data-rel]')?.dataset.rel; if (!id) return; close(); const r = F.acceptOffer(f, { releaseId: id }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.overCap ? `${r.monster.name} signed. You are over the cap: the commissioner reviews the books on Saturday.` : `${r.monster.name} signed!`, r.overCap ? 'bad' : 'good'); rerender(); }); return; }
            const r = F.acceptOffer(f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.overCap ? `${r.monster.name} signed. You are over the cap: the commissioner reviews the books on Saturday.` : `${r.monster.name} signed!`, r.overCap ? 'bad' : 'good'); rerender(); },
          decline: () => { const r = F.declineOffer(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); rerender(); },
          pitch: (el) => { const f = app.f; const e = f.week.encounter; const p = f.week.prospects[e.prospectIndex];
            const send = (releaseId = null) => { const r = F.recruit(f, e.prospectIndex, el.dataset.v, { releaseId }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); toast(r.success ? `${r.monster.name} signed!` : 'They turned you down.', r.success ? 'good' : 'info'); rerender(); };
            const rc = p ? F.releaseCandidates(f, p) : { needed: false };
            if (!rc.needed) { send(); return; }
            // A full roster: choose who would leave if the pitch works (found by the combined-build walkthrough: the pitch used to fail with no way to choose).
            const { el: sh, close } = sheet(`<p>${esc(rc.reason)} If ${esc(p.monster.name)} says yes, who leaves?</p><div class="list">${rc.list.map((c) => `<button class="item" data-rel="${c.id}"><div class="grow"><div class="name">${esc(c.name)}</div><div class="sub">${c.position} · ${c.ovr} OVR · ${fmtMoney(c.salary)}/yr</div></div><span class="chip">release</span></button>`).join('')}</div>`, { title: 'Make room' });
            sh.addEventListener('click', (ev) => { const id = ev.target.closest('[data-rel]')?.dataset.rel; if (!id) return; close(); send(id); }); },
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
      resolve: (f) => F.resolvePregameClash(f),
      occasion: 'pregame', mySide: 'a',
      theirName: (f) => F.pregamePreview(f).opponent || 'Their team',
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
      resolve: (f) => F.resolveOvertimeClash(f),
      occasion: 'overtime', mySide: 'a',
      theirName: (f) => F.overtimePreview(f).opponent || 'Their team',
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
  const st = { kind: null, i: 0, arena: null, cursor: 0, result: null, lineup: null, editing: false, replaying: false };
  const settings = () => clashSettings(app.f?.settings);
  const saveSettings = (patch) => { if (!app.f) return; app.f.settings.clash = { ...settings(), ...patch }; app.save(); };
  const stop = () => { if (st.arena) { st.cursor = st.arena.cursor; st.arena.destroy(); st.arena = null; } };
  const B = () => BINDINGS[st.kind];

  // ---------- the one selection phase (before the seed is drawn): the monsters and their order of entry
  function setupHtml(f) {
    const b = B(); const pv = b.preview(f, st.i);
    if (!pv.ok) return `<div class="panel"><p>${esc(pv.reason)}</p><button class="btn block" data-action="back">Back</button></div>`;
    st.lineup = (st.lineup || pv.lineup.map((m) => m.id)).filter((id) => pv.eligible.some((m) => m.id === id)).slice(0, pv.size); if (!st.lineup.length) st.lineup = pv.lineup.map((m) => m.id);
    const mine = st.lineup.map((id) => f.roster.find((m) => m.id === id)); const theirs = pv.wild.slice(0, pv.size);
    const s = settings(); const preferred = s.mode !== 'ask' ? s.mode : 'watch';
    const edge = (m, foe) => { if (!foe) return ''; const x = typeFactor(m.type, foe.type), y = typeFactor(foe.type, m.type); return x > 1 ? '<b class="edge strong" title="hits their front monster harder">▲</b>' : y > 1 ? '<b class="edge weak" title="their front monster hits this one harder">▼</b>' : ''; };
    const slotLabel = (i, n) => i === 0 ? 'enters first' : i === n - 1 && n > 1 ? 'last' : `${i + 1}${i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} in`;
    const card = (m, i, side, n) => `<div class="item static cl-pick ${i === 0 ? 'first' : ''}" style="gap:8px"><span class="cl-slot ${i === 0 ? 'first' : ''}">${i + 1}</span>${monsterSprite(m, 34)}<div class="grow" style="font-size:12px;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>${esc(m.name)}</b> <span class="dim">${monsterOverall(m)} OVR</span> ${side === 'a' ? edge(m, theirs[0]) : edge(m, mine[0])}</div><div class="dim" style="line-height:1.25">${ARCH_GLYPH[archetypeOf(m.species)] || ''} ${esc(archetypeOf(m.species) || '')} · ${esc(m.type)} · <b style="color:var(--ink-2)">${slotLabel(i, n)}</b>${m.companion ? ' · cannot sign' : ''}${m.fatigue >= 30 ? ` · <span style="color:var(--warn)">tired ${m.fatigue}%</span>` : ''}</div></div>${side === 'a' ? `<span class="cl-pick-btns"><button class="btn small ghost" data-action="moveup" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="btn small ghost" data-action="movedown" data-i="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="btn small ghost" data-action="remove" data-id="${m.id}" aria-label="Remove">✕</button></span>` : ''}</div>`;
    const rest = pv.eligible.filter((m) => !st.lineup.includes(m.id));
    const picker = st.lineup.length < pv.size || st.editing ? `<div class="list" style="margin-top:6px;max-height:280px;overflow:auto">${rest.map((m) => `<button class="item" style="min-height:0;padding:6px 8px" data-action="add" data-id="${m.id}" ${st.lineup.length >= pv.size ? 'disabled' : ''}>${monsterSprite(m, 28)}<div class="grow" style="font-size:12px;min-width:0"><b>${esc(m.name)}</b> <span class="dim">${ARCH_GLYPH[archetypeOf(m.species)] || ''} ${esc(archetypeOf(m.species) || '')} · ${esc(m.type)} · ${monsterOverall(m)} OVR${m.fatigue >= 30 ? ` · tired ${m.fatigue}%` : ''}</span> ${edge(m, theirs[0])}</div><span class="chip">${st.lineup.length >= pv.size ? 'full' : 'add'}</span></button>`).join('') || '<p class="dim">Everyone healthy is in the lineup.</p>'}</div>` : '';
    return `<p class="muted">${b.introText ? b.introText(f) : `You met <b>${esc(pv.wild[0].name)}</b> in the wild${pv.wild.length > 1 ? ` with ${pv.wild.length - 1} wild companion${pv.wild.length > 2 ? 's' : ''} (matched to your club, cannot be signed)` : ''}. Win the ${pv.size}v${pv.size} and ${esc(pv.wild[0].name)} will want to join you; lose and you still get one pitch.`} <button class="btn small ghost" data-action="help">Help</button></p>
      <div class="panel cl-setup"><div class="row between"><b>Your lineup</b><span class="dim">${mine.length} of ${pv.size} · in order of entry</span></div>
        <div class="list" style="margin-top:6px">${mine.map((m, i) => card(m, i, 'a', mine.length)).join('')}${mine.length < pv.size ? `<p class="dim" style="margin:4px 0">Add ${pv.size - mine.length} more.</p>` : ''}</div>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn small" data-action="edit">${st.editing ? 'Done' : 'Change a monster'}</button><button class="btn small ghost" data-action="autol">Auto lineup</button></div>${picker}
        <p class="dim" style="margin:6px 0 0">The first monster fights until it is knocked out, then the next steps up. ▲ hits their front monster harder, ▼ softer.</p></div>
      <div class="panel cl-setup theirs"><div class="row between"><b>${esc(b.theirName?.(f) || 'Their team')}</b><span class="dim">${theirs.length} · in order of entry</span></div><div class="list" style="margin-top:6px">${theirs.map((m, i) => card(m, i, 'b', theirs.length)).join('')}</div></div>
      <div class="panel" style="margin-top:8px"><div class="row between" style="flex-wrap:wrap;gap:6px"><b>Speed</b><span class="chips">${CLASH_SPEEDS.map((x) => `<button class="chip ${s.speed === x ? 'on accent' : ''}" data-action="speed" data-v="${x}">${SPEED_LABEL[x]}</button>`).join('')}</span></div>
        <div class="stack" style="margin-top:8px;gap:6px">${CLASH_MODES.map((k) => `<button class="btn big block cl-mode ${preferred === k ? 'primary' : ''}" data-action="enter" data-v="${k}" ${mine.length ? '' : 'disabled'}><span class="cl-mode-label">${k === 'watch' ? '▶ ' : '⏭ '}${MODE_TEXT[k].label}</span><span class="cl-mode-help">${MODE_TEXT[k].help}</span></button>`).join('')}</div>
        ${b.skipLabel ? `<button class="btn block" data-action="skipenc" style="margin-top:6px">${esc(b.skipLabel)}</button><p class="dim" style="margin:6px 0 0">${b.skipHelp}</p>` : ''}
      </div>`;
  }

  // ---------- the battle itself: continuous, no decisions
  function battleHtml(f, e) {
    return `<div class="row between" style="margin-bottom:4px"><span class="muted">${e.size}v${e.size} · ${esc(B().title.split('·').pop().trim())}</span><button class="btn small ghost" data-action="help">Help</button></div>
      <div id="fb-arena"></div>`;
  }
  function teamNames(f, e) { const theirs = st.kind === 'encounter' ? 'The wild' : (e.opponent || 'The opponent'); return { a: f.club.split(' ').pop(), b: theirs }; }
  function mountBattle(root, f, e) {
    const host = root.querySelector('#fb-arena'); if (!host) return;
    st.result = B().battle(f); if (!st.result) { toast('The battle could not be rebuilt.', 'bad'); return; }
    const legacyPend = policiesOf(e).a === 'manual' ? pendingDecision(st.result) : null; // a 'play' battle from before 2026-10-22 left mid-decision: it finishes on its own as Auto
    if (legacyPend) { e.policies = { a: 'smart', b: 'smart' }; e.mode = 'watch'; app.save(); st.result = B().battle(f); }
    const end = st.result.log.length - 1;
    st.arena = createArena(host, st.result, { speed: settings().speed, reducedMotion: app.settings?.reducedMotion, names: teamNames(f, e), edge: typeEdge, simple: true, onCursor: (i) => { st.cursor = i; }, onEnd: () => finish(f) });
    if (st.cursor) st.arena.setCursor(Math.min(st.cursor, end));
    if (st.cursor >= end) { finish(f); return; }
    setTimeout(() => st.arena?.play(), 300);
  }
  function finish(f) {
    const r = B().resolve(f); if (!r.ok) { toast(r.reason, 'bad'); return; }
    app.save(); stop(); st.cursor = 0; Router.render();
  }
  /** Each battler's XP: amount gained, a bar toward the next level, and any level-up. */
  function xpRows(e) {
    const rows = (e.events || []).filter((x) => x.kind === 'xp'); const lv = (e.events || []).filter((x) => x.kind === 'levelup');
    if (!rows.length) return `<div class="dim" style="margin-top:4px">Your battlers earned experience${lv.length ? ` · <b>${esc(lv.map((x) => `${x.name} → level ${x.level}`).join(', '))}</b>` : ''}.</div>`;
    return `<div style="margin-top:8px;text-align:left">${rows.map((x) => `<div class="row between" style="font-size:13px;gap:8px;margin-top:4px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(x.name)}</b> <span class="mono" style="color:var(--good)">+${x.amount} XP</span>${x.levelsGained ? ` <span class="chip good">Level ${x.level}!</span>` : ''}</span><span class="dim mono" style="white-space:nowrap">Lv ${x.level} · ${x.xp}/${x.next}</span></div><div class="bar" style="margin:2px 0 0"><i style="width:${Math.min(100, Math.round(x.xp / x.next * 100))}%"></i></div>`).join('')}</div>`;
  }
  /** The outcome in one glance: who won and how, who is still standing on each side, knockouts by each side, then XP. */
  function resultHtml(f, e) {
    const r = e.result; const won = r?.winner === B().mySide; const mine = e.a || f.roster.filter((m) => e.mine.includes(m.id));
    const full = st.result || B().battle(f); const last = full ? stateAt(full, full.log.length - 1) : null;
    const standing = (side) => last ? last.order[side].filter((id) => !last.S[side][id].ko).length : null;
    const kos = (side) => full ? full.log.filter((x) => x.kind === 'ko' && x.target?.[0] === side).length : 0;
    const names = teamNames(f, e); const theirs = e.b || [];
    const headline = won ? (st.kind === 'pregame' ? 'YOU WON THE CLASH' : st.kind === 'overtime' ? 'YOU WIN THE GAME' : 'VICTORY') : (st.kind === 'pregame' ? 'THEY WON THE CLASH' : st.kind === 'overtime' ? 'THEY WIN THE GAME' : 'DEFEAT');
    const how = r.by === 'knockout' ? `${won ? names.b : names.a} ran out of monsters` : r.by === 'hp' ? 'More health left after 30 exchanges' : 'A coin flip after an exact tie';
    const roster = (list, side) => `<div class="cl-result-team"><div class="cl-strip-label ${side === 'a' ? 'mine' : ''}">${esc(names[side])}${last ? ` · ${standing(side)} standing` : ''}</div><div class="row" style="gap:4px;flex-wrap:wrap">${list.map((m) => { const id = full?.lines[side].find((x) => x.combatant.monsterId === m.id)?.id; const ko = id && last ? last.S[side][id].ko : false; return `<span class="cl-result-mon ${ko ? 'ko' : ''}" title="${esc(m.name)}${ko ? ' · knocked out' : ''}">${monsterSprite(m, 30)}</span>`; }).join('')}</div></div>`;
    return `<div class="panel cl-result ${won ? 'won' : 'lost'}"><div class="cl-result-head">${headline}</div><div class="muted">${how} · ${r.exchanges} exchange${r.exchanges === 1 ? '' : 's'} · knockouts ${kos('b')}–${kos('a')}</div>
      <div class="cl-result-teams">${roster(mine, 'a')}${roster(theirs, 'b')}</div>
      ${xpRows(e)}
      <div class="row" style="justify-content:center;gap:6px;margin-top:8px"><button class="btn small ghost" data-action="replay">Watch the replay</button></div></div>
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
      if (st.replaying) return `${battleHtml(f, e)}<button class="btn block" data-action="endreplay" style="margin-top:8px">Back to the result</button>`;
      return resultHtml(f, e);
    },
    mount(root) {
      const f = app.f; const b = B(); if (!b || !f) return; const e = b.record(f);
      const rerender = () => Router.render();
      delegate(root, {
        back: () => Router.back(),
        help: () => sheet(HELP_HTML, { title: 'How Beast Clash works' }),
        edit: () => { st.editing = !st.editing; Router.render(); },
        autol: () => { st.lineup = null; st.editing = false; Router.render(); },
        add: (el) => { const id = el.dataset.id; const pv = b.preview(f, st.i); if (!st.lineup.includes(id) && st.lineup.length < pv.size) st.lineup.push(id); else if (st.lineup.length >= pv.size) toast(`Up to ${pv.size} monsters`, 'info'); Router.render(); },
        remove: (el) => { st.lineup = st.lineup.filter((x) => x !== el.dataset.id); Router.render(); },
        moveup: (el) => { const i = Number(el.dataset.i); if (i > 0) { [st.lineup[i - 1], st.lineup[i]] = [st.lineup[i], st.lineup[i - 1]]; Router.render(); } },
        movedown: (el) => { const i = Number(el.dataset.i); if (i < st.lineup.length - 1) { [st.lineup[i + 1], st.lineup[i]] = [st.lineup[i], st.lineup[i + 1]]; Router.render(); } },
        enter: (el) => { const mode = normalizeMode(el.dataset.v) || 'watch'; const r = b.start(f, st.i, { lineup: st.lineup, mode }); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save(); st.cursor = 0; st.editing = false; Router.render(); },
        skipenc: () => b.skip?.(f, Router),
        speed: (el) => { saveSettings({ speed: Number(el.dataset.v) }); st.arena?.setSpeed(Number(el.dataset.v)); Router.render(); },
        toresults: () => { stop(); if (st.replaying) { st.replaying = false; Router.render(); return; } finish(f); },
        replay: () => { st.replaying = true; st.cursor = 0; Router.render(); },
        endreplay: () => { stop(); st.replaying = false; st.cursor = 0; Router.render(); },
        ...b.actions(root, rerender),
      });
      root.classList.toggle('cl-wide', !!(e && (e.status === 'battle' || st.replaying)));
      if (e && e.status === 'battle' && e.mode !== 'skip') mountBattle(root, f, e);
      else if (e && st.replaying) { st.result = b.battle(f); const host = root.querySelector('#fb-arena'); if (host && st.result) { st.arena = createArena(host, st.result, { speed: settings().speed, reducedMotion: app.settings?.reducedMotion, names: teamNames(f, e), edge: typeEdge, simple: true, onCursor: (i) => { st.cursor = i; } }); setTimeout(() => st.arena?.play(), 300); } }
    },
    unmount() { stop(); st.replaying = false; },
  });
  return st;
}

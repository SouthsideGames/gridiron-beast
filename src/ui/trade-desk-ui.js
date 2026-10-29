// The trade desk (Task 5, GDD §19.6c): propose a deal to an AI club with monsters and picks on both sides, see exactly what it
// would do to your roster, depth and cap before you send it, and get the club's reasons if it says no. Also the panel for an
// AI club's call. All the rules live in franchise/trade-desk.js; this file only shows them and collects the choices.

import { esc, delegate, toast, sheet, fmtMoney, confirmSheet } from './dom.js';
import { yearOf } from '../data/calendar.js';
import * as F from '../franchise/franchise.js';
import { monsterSprite } from './pixel-monster.js';
import { careerLink } from './career-ui.js';
import { monsterOverall, resolveSpecies } from '../data/monsters.js';

const pickText = (p) => `${yearOf(p.year)} R${p.round}${p.original ? ` (${esc(String(p.original).split(' ').pop())})` : ''}`;
const pickLabel = (p) => `${yearOf(p.year)} R${p.round}`;
const key = (p) => F.pickKey(p);
const signed = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
const ROLE = ['starter', 'backup', 'backup', 'bench'];

/** Whether trading is open, why not, and when it reopens (franchise/trade-window.js). Used at the top of the desk and of the pick-shopping sheet. */
export function tradeStatusHtml(f) {
  const w = F.tradeWindow(f);
  const tone = w.open ? 'good' : 'bad';
  return `<div class="panel tight" role="status" data-trade-status="${esc(w.phase)}" style="margin-bottom:8px;border-color:var(--${tone})"><b class="${tone}">${w.open ? '🟢 Trading is open' : '🔴 Trading is closed'}</b>
    <div style="font-size:13px;margin-top:2px">${esc(w.reason)}</div>${w.next ? `<div class="dim" style="font-size:12px;margin-top:2px">${esc(w.next)}</div>` : ''}</div>`;
}

function monsterRow(m, side, on) {
  const blocked = !!m.why;
  const note = m.why || (side === 'theirs' && !m.forSale ? 'A starter with no ready replacement: only if you send a ready replacement back in the same proposal.' : '');
  return `<button type="button" class="item ${on ? 'mine' : ''}" data-m="${side}:${m.id}" data-sale="${side === 'theirs' && !m.forSale ? '0' : '1'}" aria-pressed="${on ? 'true' : 'false'}" ${blocked ? 'disabled' : ''} style="min-height:44px;padding:4px 8px;${on ? 'border-color:var(--accent)' : ''}">
    ${monsterSprite({ species: m.species, name: m.name, id: m.id }, 28)}<span class="grow" style="min-width:0"><b>${esc(m.name)}</b> <span class="dim" style="font-size:12px">${esc(m.position)} · ${m.ovr} OVR · ${m.age}y</span>
    <span class="chip ${m.role === 0 ? 'accent' : ''}" style="margin-left:4px">${ROLE[m.role] || 'bench'}</span>${m.injured ? ' <span title="Out for weeks">🩹</span>' : ''}</span><span class="dim" style="font-size:12px">${fmtMoney(m.salary)}</span></button>${note ? `<div class="dim" style="font-size:11px;margin:-2px 0 4px 10px">${esc(note)}</div>` : ''}`;
}

/** Open the desk. `onDone` runs when the sheet closes (the caller re-renders). */
export function openTradeDesk(app, { onDone = null, team = null } = {}) {
  const f = app.f; const partners = F.deskPartners(f);
  const state = { team: team || partners.slice().sort((a, b) => b.clubLeft - a.clubLeft || (a.team < b.team ? -1 : 1))[0].team, giveM: [], getM: [], giveP: [], getP: [], fPos: 'all', fPosTheirs: 'all', result: null };
  const { el } = sheet('', { title: '🤝 Trade desk', onClose: () => onDone?.() });
  const body = el.querySelector('.sheet-body');
  const prop = () => ({ team: state.team, giveMonsters: state.giveM, givePicks: state.giveP, getMonsters: state.getM, getPicks: state.getP });
  const toggle = (arr, v, match = (a, b) => a === b) => { const i = arr.findIndex((x) => match(x, v)); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
  const render = () => {
    const assets = F.deskAssetsFor(f, state.team); const positions = Object.keys(F.GROUP_SLOTS);
    const empty = !(state.giveM.length || state.giveP.length) || !(state.getM.length || state.getP.length);
    const pv = empty ? null : F.deskPreview(f, prop());
    const use = assets.usage;
    const partnerSel = `<label class="field">Trade with <select class="input" data-f="team">${partners.map((p) => `<option value="${esc(p.team)}" ${p.team === state.team ? 'selected' : ''}>${esc(p.team)} · ${p.clubLeft} call${p.clubLeft === 1 ? '' : 's'} left</option>`).join('')}</select></label>
      <div class="dim" style="font-size:12px;margin-top:4px">Each club takes ${F.DESK_RULES.perClub} proposals a window (${use.totalLeft} of ${F.DESK_RULES.perWindow} left in all). A club answers once: asking again changes nothing. A legal proposal is answered on the spot, and if the club says yes the deal is done.</div>`;
    const list = (side, roster, sel, fPos) => `<div class="row between" style="margin-top:6px"><b>${side === 'mine' ? 'You send' : `${esc(state.team)} send`}</b><select class="input" data-f="${side === 'mine' ? 'fPos' : 'fPosTheirs'}" aria-label="Filter by position" style="max-width:120px"><option value="all">All positions</option>${positions.map((g) => `<option value="${g}" ${fPos === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="list" style="max-height:230px;overflow:auto;margin-top:4px">${roster.filter((m) => fPos === 'all' || m.position === fPos).map((m) => monsterRow(m, side, sel.includes(m.id))).join('') || '<p class="dim">Nobody at that position.</p>'}</div>`;
    const picks = (side, ps, sel) => `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center"><span class="dim" style="font-size:12px">${side === 'mine' ? 'Your picks' : 'Their picks'}</span>${ps.map((p) => `<button type="button" class="btn small ${sel.some((x) => key(x) === key(p)) ? 'primary' : ''}" data-p="${side}:${key(p)}" aria-pressed="${sel.some((x) => key(x) === key(p))}">${pickLabel(p)}${p.original && p.original !== (side === 'mine' ? f.club : state.team) ? '*' : ''}</button>`).join('') || '<span class="dim">none</span>'}</div>`;
    const d = pv?.detail;
    const summary = !pv ? '<div class="dim">Choose at least one thing to send and one thing to ask for.</div>' : !pv.ok ? `<p class="bad">${esc(pv.reason || pv.reasons?.[0]?.text || '')}</p>` : `<div class="panel tight" role="status">
      ${d ? `<div class="row between"><span>Your roster</span><b>${d.youBefore} → ${d.youAfter}</b></div>
      <div class="row between"><span>Their roster</span><b>${d.themBefore} → ${d.themAfter}</b></div>
      <div class="row between"><span>Your cap room after</span><b class="${d.youCapAfter < 0 ? 'bad' : ''}">${signed(d.youCapAfter).replace(/^\+/, '')}${d.youCapAfter < 0 ? ' · over: the commissioner will review' : ''}</b></div>
      <div class="row between"><span>Their cap room after</span><b class="${d.themCapAfter < 0 ? 'bad' : ''}">${Math.round(d.themCapAfter).toLocaleString('en-US')}</b></div>
      ${d.depth.map((x) => `<div class="dim" style="font-size:12px;margin-top:3px"><b>${esc(x.pos)}</b>: ${x.before.count} → ${x.after.count} monsters · best ${x.before.best ?? '—'} → ${x.after.best ?? '—'}${x.before.weakestStarter !== x.after.weakestStarter ? ` · weakest starter ${x.before.weakestStarter ?? '—'} → ${x.after.weakestStarter ?? '—'}` : ''}${x.after.count < x.after.slots ? ' <span class="chip bad">short of starters</span>' : ''}</div>`).join('')}` : ''}
      ${pv.legal ? '<div class="chip good" style="margin-top:6px">Legal: roster, positions and cap all work</div>' : `<div style="margin-top:6px">${pv.reasons.map((r) => `<div class="bad" style="font-size:13px">✗ ${esc(r.text)}</div>`).join('')}</div>`}
      <div class="dim" style="font-size:11px;margin-top:6px">Whether the club says yes depends on its own roster and the price; you find out when you send it. Monsters arrive on a new two-season deal at their salary; picks change hands at once.</div></div>`;
    const canSend = F.tradeWindow(f).desk && pv?.ok && pv.legal && use.clubLeft > 0 && use.totalLeft > 0;
    let result = '';
    if (state.result) {
      const r = state.result;
      if (!r.ok) result = `<p class="bad">${esc(r.reason)}</p>`;
      else if (r.accepted) result = `<div class="panel tight" style="border-color:var(--good)"><b class="good">✅ Deal done.</b><div class="dim">${r.got.monsters.map((m) => `${esc(m.name)} (${esc(m.position)}, ${monsterOverall(m)} OVR) joins your roster.`).join(' ') || 'The picks are yours.'}</div></div>`;
      else result = `<div class="panel tight" style="border-color:var(--bad)"><b class="bad">The ${esc(state.team)} said no.</b>${r.reasons.map((x) => `<div style="font-size:13px;margin-top:4px">• ${esc(x.text)}</div>`).join('')}
        ${r.counter ? `<div style="margin-top:8px"><div style="font-size:13px"><b>Counter:</b> ${esc(r.counter.text)}</div><button type="button" class="btn small" data-counter="1" style="margin-top:4px">Add it to the proposal</button></div>` : ''}</div>`;
    }
    body.innerHTML = `${tradeStatusHtml(f)}${partnerSel}
      <div class="panel tight" style="margin-top:8px">${list('mine', assets.mine, state.giveM, state.fPos)}${picks('mine', assets.myPicks, state.giveP)}</div>
      <div class="panel tight">${list('theirs', assets.theirs, state.getM, state.fPosTheirs)}${picks('theirs', assets.theirPicks, state.getP)}</div>
      ${summary}
      <button type="button" class="btn primary big block" data-send="1" ${canSend ? '' : 'disabled'} style="margin-top:8px">📞 Send the proposal</button>${result}`;
  };
  body.addEventListener('change', (e) => {
    const t = e.target; if (!t.dataset.f) return;
    if (t.dataset.f === 'team') { state.team = t.value; state.giveM = []; state.getM = []; state.giveP = []; state.getP = []; state.fPosTheirs = 'all'; } else state[t.dataset.f] = t.value;
    state.result = null; render();
  });
  body.addEventListener('click', async (e) => {
    const m = e.target.closest('[data-m]'); const p = e.target.closest('[data-p]');
    if (m) { const [side, id] = m.dataset.m.split(':'); toggle(side === 'mine' ? state.giveM : state.getM, id); state.result = null; render(); return; }
    if (p) { const [side, k] = p.dataset.p.split(/:(.+)/); const assets = F.deskAssetsFor(f, state.team); const pick = (side === 'mine' ? assets.myPicks : assets.theirPicks).find((x) => key(x) === k); if (pick) toggle(side === 'mine' ? state.giveP : state.getP, pick, (a, b) => key(a) === key(b)); state.result = null; render(); return; }
    if (e.target.closest('[data-counter]')) {
      const c = state.result?.counter; if (!c) return; const assets = F.deskAssetsFor(f, state.team);
      if (c.kind === 'addPick') { const pk = assets.myPicks.find((x) => key(x) === key(c.pick)); if (pk) state.giveP.push(pk); } else if (c.kind === 'addMonster') state.giveM.push(c.monsterId); else if (c.kind === 'dropAsk') state.getM = state.getM.filter((id) => id !== c.monsterId);
      state.result = null; render(); return;
    }
    if (e.target.closest('[data-send]')) {
      const pr = prop(); const assets = F.deskAssetsFor(f, state.team);
      const nm = (ids, list) => ids.map((id) => list.find((x) => x.id === id)?.name).filter(Boolean);
      const sends = [...nm(pr.giveMonsters, assets.mine), ...pr.givePicks.map(pickLabel)].join(', '), gets = [...nm(pr.getMonsters, assets.theirs), ...pr.getPicks.map(pickLabel)].join(', ');
      if (!(await confirmSheet(`Send ${sends} to the ${state.team} for ${gets}? If they accept, the deal is done at once.`, { title: 'Send the proposal', okLabel: 'Send' }))) return;
      const r = F.deskPropose(f, pr); state.result = r; app.save();
      if (r.ok && r.accepted) { state.giveM = []; state.getM = []; state.giveP = []; state.getP = []; toast('Deal done.', 'good'); }
      render(); return;
    }
  });
  render();
}

// ---------------------------------------------------------------- an AI club's call
/** One line for the HQ during the regular season and postseason, when the desk itself is closed: where the trade calendar stands. '' in the offseason and on the draft clock (the desk is open there and has its own banner). */
export function tradeLineHtml(f) {
  const w = F.tradeWindow(f); if (!['early', 'open-season', 'deadline-passed', 'postseason'].includes(w.phase) || !F.deskAvailable(f)) return '';
  const tone = w.phase === 'open-season' ? 'accent' : 'bad';
  return `<div class="panel tight" role="status" data-trade-status="${esc(w.phase)}" style="padding:6px 10px"><span class="chip ${tone}">${w.phase === 'open-season' ? '📞 Trade window open' : '🔒 Trading closed'}</span> <span style="font-size:13px">${esc(w.reason)}</span> <span class="dim" style="font-size:12px">${esc(w.next)}</span></div>`;
}

/** The panel for the call that is waiting, or ''. Calls made before Task 5 (no `kind`) show exactly as they did. */
export function callPanelHtml(f) {
  const c = F.tradeCall(f); if (!c) return '';
  const until = f.offseason ? 'the new season' : `the end of the week (trade deadline: the end of week ${F.TRADE_DEADLINE_WEEK})`;
  const asks = (c.asks || []).map((m) => `${esc(m.name)} (${esc(m.position)}, ${m.ovr} OVR)`).join(' + ');
  const sends = (c.sends || []).map((m) => `${esc(m.name)} (${esc(m.position)}, ${m.ovr} OVR, age ${m.age})`).join(' + ');
  const myPicks = (c.give || []).map((p) => `${yearOf(p.year)} round ${p.round}${p.original !== f.club ? ` (from the ${esc(p.original)})` : ''}`).join(' + ');
  const theirPicks = (c.sendPicks || []).map((p) => `${yearOf(p.year)} round ${p.round}${p.original !== c.team ? ` (from the ${esc(p.original)})` : ''}`).join(' + ');
  const effect = F.callEffect(f);
  const lead = c.player || c.asks?.[0];
  let says;
  if (!c.kind || c.kind === 'sell') { const mine = f.roster.filter((m) => m.position === c.player.position).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0]; says = `We hear you are thin at ${esc(c.player.position)}${mine ? ` (your best is ${esc(mine.name)}, ${monsterOverall(mine)})` : ''}. He is yours for your ${myPicks}.`; }
  else if (c.kind === 'buy') says = `We are short at ${esc(c.asks[0].position)} and ${esc(c.asks[0].name)} would start for us. We will give you our ${theirPicks} for him.`;
  else says = `You are thin at ${esc(c.sends[0].position)}; we are thin at ${esc(c.asks[0].position)}. Our ${esc(c.sends[0].name)} for your ${esc(c.asks[0].name)}.`;
  const shown = !c.kind || c.kind === 'sell' ? `<b>${c.playerId ? careerLink(c.playerId, c.player.name) : esc(c.player.name)}</b> · ${esc(c.player.position)} · ${c.player.ovr} OVR · age ${c.player.age}` : `<div><b>They send:</b> ${sends || theirPicks}</div><div><b>You send:</b> ${asks || myPicks}</div>`;
  return `<div class="panel call-panel"><div class="row" style="gap:10px;align-items:flex-start">${lead ? monsterSprite({ species: lead.species, name: lead.name, id: lead.id }, 44) : ''}<div class="grow" style="min-width:0">
    <div class="muted" style="font-size:12px">📞 THE ${esc(c.team.toUpperCase())} ARE ON THE LINE</div>
    <div style="margin:2px 0">${shown}</div>
    <div class="muted" style="font-size:13px">“${says}”</div>
    ${effect ? `<div class="dim" style="font-size:12px;margin-top:4px">If you accept: roster ${effect.youBefore} → ${effect.youAfter} · cap room ${Math.round(effect.youCapAfter).toLocaleString('en-US')}${effect.youCapAfter < 0 ? ' (over: the commissioner will review)' : ''}${effect.depth.map((x) => ` · ${esc(x.pos)} best ${x.before.best ?? '—'} → ${x.after.best ?? '—'}`).join('')}</div>` : ''}
    <div class="dim" style="font-size:11px;margin-top:2px">Good until ${until}${(c.sends || []).length || c.player ? ' · arrivals join on a two-season deal at their salary' : ''}</div>
    <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn small primary" data-call="yes">Accept</button><button class="btn small" data-call="no">No thanks</button>${c.player?.species && resolveSpecies({ species: c.player.species })?.ability ? `<button class="btn small see-it" data-see-it="${resolveSpecies({ species: c.player.species }).id}">▶ His ability</button>` : ''}</div></div></div></div>`;
}
/** The sentence the confirmation asks. */
export function callConfirmText(f, c) {
  if (!c.kind || c.kind === 'sell') return `Send your ${c.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')} to the ${c.team} for ${c.player.name}?`;
  const sends = [...(c.sends || []).map((m) => m.name), ...(c.sendPicks || []).map(pickLabel)].join(' + '), asks = [...(c.asks || []).map((m) => m.name), ...(c.give || []).map(pickLabel)].join(' + ');
  return `Send ${asks} to the ${c.team} for ${sends}?`;
}

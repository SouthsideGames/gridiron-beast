// Task 7 — the free-agency market screens (decisions 11, 12, 14, 19, 29, 30; specification "Interface").
// Simple by default: period, cap (total, committed, reserved, usable), position filter, each free agent's name, overall, position,
// rarity, fit, ask and interest, and a one-tap offer at his ask. Expandable: his priorities, the competing offers, bonus and term
// controls, the full cap schedule, the deadline and the negotiation history. Every block is explained with what to do about it.
// The GM Assistant only recommends and prepares offers: nothing is signed or spent without the owner's confirmation.
import { esc, toast, sheet, confirmSheet, delegate } from './dom.js';
import * as Router from './router.js';
import { monsterSprite } from './pixel-monster.js';
import * as F from '../franchise/franchise.js';
import * as E from '../franchise/fa-engine.js';
import { personaOf, PRIORITY_LABEL, responseWindow } from '../franchise/fa-personality.js';
import { allocateBonus, OFFER_STEP } from '../franchise/fa-contracts.js';
import { legendSide } from '../franchise/fa-legendary.js';
import { monsterOverall, resolveSpecies } from '../data/monsters.js';
import { lineupProblems, buildDepthChart } from '../franchise/roster.js';
import { positionOf } from '../data/personnel.js';
import { yearOf } from '../data/calendar.js';

const fmt = (n) => Math.round(n || 0).toLocaleString('en-US');
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const STATE_LABEL = { pending: 'waiting for his answer', countered: 'he countered', accepted: 'accepted: waiting for your legendary to leave', signed: 'signed', rejected: 'turned down', withdrawn: 'withdrawn', expired: 'expired' };
let filter = ''; let showAll = false; let keenOnly = false; // decision 14: the interest dashboard can show only those interested in your club

/** How keen he is on the owner's club at given terms: { label, cls, why[] } (a readable explanation, decision 30). */
export function interestOf(f, m, terms) {
  const r = E.rateOffer(f, m, f.club, terms); const p = personaOf(m); const ratio = r.score / (r.need || 1);
  const label = ratio >= 1 ? 'Interested' : ratio >= E.FA_RULES.counterBand ? 'Listening' : 'Not interested'; const cls = ratio >= 1 ? 'good' : ratio >= E.FA_RULES.counterBand ? 'warn' : 'bad';
  const why = [];
  why.push(r.moneyRatio >= 1 ? 'The money meets his ask.' : r.moneyRatio >= E.FA_RULES.lowball ? 'The money is a little under his ask.' : 'The money is well under his ask: low offers cost his patience.');
  const ask = E.askOf(f, m); if (terms.years !== ask.years) why.push(`He would rather sign for ${ask.years} season${ask.years === 1 ? '' : 's'}.`);
  const role = E.roleAt(f, f.club, m); why.push(role === 'starter' ? 'He would start for you.' : role === 'backup' ? 'He would be your first backup.' : 'He would be depth for you.');
  if (p.winning >= 60) why.push(E.clubSuccess(f, f.club) >= 0.5 ? 'He likes that your club wins.' : 'Winning matters to him; your record does not help.');
  return { label, cls, why, ratio };
}
const rarityOf = (m) => { try { return resolveSpecies(m).rarity; } catch { return 'common'; } };
const fitOf = (f, m) => { const role = E.roleAt(f, f.club, m); let scheme = null; try { scheme = F.fitFor(f, m)?.fits; } catch { /* no scheme read */ } return `${role === 'starter' ? '⬆ would start' : role === 'backup' ? 'first backup' : 'depth'}${scheme === true ? ' · fits your scheme' : scheme === false ? ' · off-scheme' : ''}`; }; // team fit: role from the actual roster, scheme where the game has one

/** The cap line the market shows: total, committed, reserved by live offers, usable. */
export function capPanelHtml(f) {
  const c = F.freeAgencyCap(f); const pct = (x) => Math.max(0, Math.min(100, Math.round(x / c.cap * 100)));
  return `<div class="panel tight"><div class="row between"><b>Cap ${fmt(c.cap)}</b><span class="dim">league year ${yearOf(c.leagueYear)}</span></div>
    <div class="bar ${c.usable < 0 ? 'bad' : c.usable < c.cap * 0.05 ? 'warn' : ''}" style="margin:6px 0"><i style="width:${pct(c.committed)}%"></i></div>
    <div class="row between muted" style="flex-wrap:wrap;gap:6px"><span>Committed ${fmt(c.committed)}</span><span>Reserved ${fmt(c.reserved)}</span><span style="color:${c.usable < 0 ? 'var(--bad)' : 'var(--good)'}">Usable ${fmt(c.usable)}</span></div>
    <div class="dim" style="font-size:12px">A live offer reserves his first season (salary and that year's share of any bonus) until he answers.</div></div>`;
}

/** The GM Assistant (decision 19): up to three recommendations from your needs and cap; it never signs anything. */
export function assistantHtml(f) {
  if (!f.settings?.gmAssistant) return '';
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const holes = lineupProblems(f.roster, chart).map(positionOf);
  const count = {}; for (const m of f.roster) count[m.position] = (count[m.position] || 0) + 1;
  const thin = POS.filter((p) => (count[p] || 0) < (p === 'K' ? 1 : p === 'QB' || p === 'RB' || p === 'TE' ? 2 : 3));
  const usable = F.freeAgencyCap(f).usable; const want = [...new Set([...holes, ...thin])];
  const recs = []; for (const pos of want) { const best = F.freeAgentMarket(f).filter((x) => x.monster.position === pos && !x.mine && x.ask.salary <= usable).sort((a, b) => monsterOverall(b.monster) - monsterOverall(a.monster))[0]; if (best) recs.push({ pos, x: best, hole: holes.includes(pos) }); if (recs.length >= 3) break; }
  return `<div class="panel tight"><b>🧭 GM Assistant</b> <span class="dim">recommendations only</span>${recs.length ? `<div class="list" style="margin-top:4px">${recs.map(({ pos, x, hole }) => `<div class="item static"><div class="grow"><div class="name">${esc(x.monster.name)} <span class="dim">${pos} · ${monsterOverall(x.monster)} OVR · asks ${fmt(x.ask.salary)}</span></div><div class="sub">${hole ? `You have no healthy ${pos} for a starting slot.` : `You are thin at ${pos}.`}</div></div><button class="btn small" data-action="faopen" data-id="${x.monster.id}">Prepare offer</button></div>`).join('')}</div>` : '<div class="dim">Nothing urgent within your usable cap.</div>'}</div>`;
}

/** The owner's live offers. */
function myOffersHtml(f) {
  const mine = E.liveOffers(f, (o) => o.club === f.club); if (!mine.length) return '';
  return `<h3>Your offers (${mine.length})</h3><div class="list">${mine.map((o) => { const u = E.unsigned(f, o.mid); const m = u?.m; if (!m) return '';
    return `<div class="item tappable" data-action="faopen" data-id="${m.id}" role="button" tabindex="0">${monsterSprite(m, 32)}<div class="grow"><div class="name">${esc(m.name)} <span class="dim">${esc(m.position)} · ${monsterOverall(m)} OVR</span></div><div class="sub">${fmt(o.salary)}/yr × ${o.years}${o.bonus ? ` + ${fmt(o.bonus)} bonus` : ''} · <b>${STATE_LABEL[o.state]}</b> · answers by Period ${o.expires}</div></div>${o.state === 'countered' ? '<span class="chip warn">counter</span>' : ''}</div>`; }).join('')}</div>`;
}

/** The roster minimum against the cap (owner rule 2026-11-04): what is missing, and the releases the owner may choose, with their savings. */
export function floorPanelHtml(f) {
  if (!F.freeAgencyDone(f)) return '';
  const p = F.rosterFloorPlan(f); if (!p.short) return '';
  const head = `<b>📋 Roster minimum: ${f.roster.length} of ${F.ROSTER_MIN}</b>`;
  if (!p.enough) return `<div class="panel tight" style="border-color:var(--bad)">${head}<div class="muted">The market has fewer than ${p.short} free agents you can sign right now. Release no one yet: check the market and the trade desk.</div></div>`;
  if (!p.gap) return `<div class="panel tight" style="border-color:var(--warn)">${head}<div class="muted">Sign ${p.short} more. The ${p.short} cheapest free agents ask ${fmt(p.needed)} cr. in total and you have ${fmt(p.usable)} cr. of usable cap. A monster may still turn you down: then try the next.</div></div>`;
  const rows = p.releases.slice(0, 6).map((x) => `<div class="item static"><div class="grow"><div class="name">${esc(x.name)} <span class="dim">${esc(x.position)} · ${x.ovr} OVR</span></div><div class="sub">frees <b>${fmt(x.saving)}</b> cr. · ${x.gapAfter ? `then still ${fmt(x.gapAfter)} cr. short (one more signing to make)` : 'then the cheapest replacements fit'}</div></div><button class="btn small" data-action="fafloorrel" data-id="${x.id}">Release…</button></div>`).join('');
  return `<div class="panel tight" style="border-color:var(--bad)">${head}<div class="muted">You need ${p.short} more. The ${p.short} cheapest free agents ask <b>${fmt(p.needed)}</b> cr. and you have <b>${fmt(Math.max(0, p.usable))}</b> cr. of usable cap: free <b>${fmt(p.gap)}</b> cr. more. No signing may go over the cap. In the offseason you may release below ${F.ROSTER_MIN} to make room: there is no dead cap, so his whole charge leaves the books. You choose who goes.</div><div class="list" style="margin-top:6px">${rows}</div><div class="dim" style="margin-top:4px">Each release is one more monster to sign. Monsters may turn you down, so leave a little room.</div></div>`;
}

/** The free-agency section of the Task 7 offseason screen. */
export function faOffseasonHtml(f) {
  if (!F.task7Offseason(f)) return null;
  const pending = F.offseasonPending(f).length; const open = F.freeAgencyOpen(f); const done = F.freeAgencyDone(f); const p = f.freeAgency.period;
  const comp = F.legendCompliance(f);
  const compHtml = comp ? `<div class="panel tight" style="border-color:var(--bad)"><b>⚖️ Legendary limit</b><div class="muted">${esc(comp.reason)}${comp.due ? '' : ` Until then you keep them, but cannot add another on that side.`}</div><div class="row" style="gap:6px;margin-top:6px"><button class="btn small" data-action="releasemon">Release…</button><button class="btn small" data-action="shop">Trade desk…</button></div></div>` : '';
  if (!open && !done) return `${compHtml}<h3>Free agency</h3><div class="panel tight"><b>Five periods, before the draft.</b><div class="dim">Every club bids in the same market. Make offers in a period; monsters answer when you advance it, by their own priorities and deadlines.</div><button class="btn primary block" data-action="faopenmarket" ${pending ? 'disabled' : ''} style="margin-top:6px">Open free agency (Period 1)</button>${pending ? `<p class="dim center">Settle the ${pending} renewal${pending === 1 ? '' : 's'} first.</p>` : ''}</div>`;
  const list = F.freeAgentMarket(f).filter((x) => !filter || x.monster.position === filter).map((x) => ({ x, i: interestOf(f, x.monster, x.ask) })).filter(({ i }) => !keenOnly || i.ratio >= 1).sort((a, b) => monsterOverall(b.x.monster) - monsterOverall(a.x.monster));
  const shown = showAll ? list : list.slice(0, 25);
  const head = open ? `<div class="row between"><b>Free agency · Period ${p} of ${E.FA_RULES.periods}</b><span class="dim">${F.freeAgentMarket(f).length} unsigned</span></div>` : `<div class="row between"><b>Free agency closed</b><span class="dim">unsigned monsters stay on the market all year: offers are answered at once</span></div>`;
  return `${compHtml}${floorPanelHtml(f)}<h3>Free agency</h3>${head}${capPanelHtml(f)}${assistantHtml(f)}${myOffersHtml(f)}
    <div class="row" style="gap:4px;flex-wrap:wrap;margin:6px 0"><button class="btn small ${filter ? '' : 'primary'}" data-action="fafilter" data-v="">All</button>${POS.map((x) => `<button class="btn small ${filter === x ? 'primary' : ''}" data-action="fafilter" data-v="${x}">${x}</button>`).join('')}<button class="btn small ${keenOnly ? 'primary' : ''}" data-action="fakeen" aria-pressed="${keenOnly}">Interested in you</button><button class="btn small ${f.settings?.gmAssistant ? 'primary' : ''}" data-action="faassist" aria-pressed="${f.settings?.gmAssistant ? 'true' : 'false'}" style="margin-left:auto">🧭 GM Assistant ${f.settings?.gmAssistant ? 'on' : 'off'}</button></div>
    <div class="list">${shown.map(({ x, i }) => { const m = x.monster; const rival = x.offers.filter((o) => o.club !== f.club).length; const legend = legendSide(m);
      return `<div class="item tappable" data-action="faopen" data-id="${m.id}" role="button" tabindex="0">${monsterSprite(m, 32)}<div class="grow"><div class="name">${legend ? '🌟 ' : ''}${esc(m.name)} <span class="dim">${esc(m.position)} · ${monsterOverall(m)} OVR · ${esc(rarityOf(m))} · age ${m.age}</span></div><div class="sub">asks <b>${fmt(x.ask.salary)}</b>/yr · ${x.ask.years} season${x.ask.years === 1 ? '' : 's'} · ${fitOf(f, m)}${rival ? ` · ${rival} other offer${rival === 1 ? '' : 's'}` : ''}</div></div><span class="chip ${i.cls}">${i.label}</span></div>`; }).join('') || '<p class="dim">Nobody on the market at this position.</p>'}</div>
    ${list.length > shown.length ? `<button class="btn small block" data-action="faall">Show all ${list.length}</button>` : ''}
    ${open ? `<div class="row" style="gap:6px;margin-top:10px"><button class="btn primary grow" data-action="faadvance">${p >= E.FA_RULES.periods ? 'Close free agency' : `Advance to Period ${p + 1}`}</button><button class="btn" data-action="fafinish">Finish now</button></div>` : ''}`;
}

/** The negotiation sheet: simple terms first, the rest expandable. `mode`: 'offer' (periods), 'now' (immediate), 'extend'. */
export function negotiationSheet(app, id, onDone, { mode = null } = {}) {
  const f = app.f; const inRoster = f.roster.find((x) => x.id === id); const u = E.unsigned(f, id);
  const m = inRoster || u?.m; if (!m) return;
  mode ||= inRoster ? 'extend' : F.freeAgencyOpen(f) ? 'offer' : 'now';
  const ask = E.askOf(f, m); const mine = E.liveOffers(f, (o) => o.club === f.club && o.mid === id)[0] || null;
  const t = { salary: mine?.salary ?? ask.salary, years: mine?.years ?? ask.years, bonus: mine?.bonus ?? 0 };
  const p = personaOf(m);
  const draw = () => {
    const it = interestOf(f, m, t); const block = mode === 'extend' ? null : E.blocker(f, f.club, m, t, { own: mine, final: mode === 'now' });
    const sched = (() => { const start = mode === 'extend' ? (m.contract?.ends ?? 0) + 1 : (f.freeAgency?.leagueYear ?? f.season.year); const a = allocateBonus(t.bonus, t.years); return a.map((b, i) => ({ year: start + i, salary: t.salary, bonus: b, total: t.salary + b })); })();
    const rivals = E.competingOffers(f, id).filter((o) => o.club !== f.club);
    const hist = mine?.history || [];
    const deadline = mine ? mine.expires : mode === 'offer' ? E.deadlineFor(f, m) : null;
    const blockHtml = block ? `<div class="panel tight" style="border-color:var(--bad)"><b>Can’t ${mode === 'offer' ? 'offer' : 'sign'} yet</b><div class="muted">${esc(block.reason)}</div>${block.code === 'roster' ? '<button class="btn small" data-action="goroster">Salary & Contracts…</button>' : block.code === 'legendary' ? '<button class="btn small" data-action="goroster">Release a legendary…</button>' : ''}</div>` : '';
    return `<div class="row" style="gap:12px">${monsterSprite(m, 56)}<div class="grow"><div style="font-size:18px;font-weight:900">${legendSide(m) ? '🌟 ' : ''}${esc(m.name)}</div><div class="muted">${esc(m.position)} · ${monsterOverall(m)} OVR · age ${m.age} · ${esc(rarityOf(m))}</div><div class="muted">asks ${fmt(ask.salary)}/yr for ${ask.years} season${ask.years === 1 ? '' : 's'}</div></div></div>
      <div class="panel tight"><div class="row between"><b>Salary per season</b><span><button class="btn small" data-t="sal" data-d="-1000">−1k</button> <b>${fmt(t.salary)}</b> <button class="btn small" data-t="sal" data-d="1000">+1k</button></span></div>
        <div class="row between" style="margin-top:6px"><b>Seasons</b><span class="seg">${[1, 2, 3].map((y) => `<button class="btn small ${t.years === y ? 'primary' : ''}" data-t="yrs" data-v="${y}">${y}</button>`).join('')}</span></div>
        <div class="row between" style="margin-top:6px"><b>Interest</b><span class="chip ${it.cls}">${it.label}</span></div><ul class="dim" style="margin:4px 0 0 16px;padding:0">${it.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        ${deadline ? `<div class="dim" style="margin-top:4px">He answers by <b>Period ${deadline}</b>${mode === 'offer' && !mine ? ' (his patience sets it; revisions keep it)' : ''}.</div>` : mode === 'now' ? '<div class="dim" style="margin-top:4px">Outside the periods he answers at once.</div>' : ''}</div>
      ${blockHtml}
      <details class="panel tight"><summary><b>Advanced</b> <span class="dim">bonus, priorities, competing offers, cap schedule, history</span></summary>
        <div class="row between" style="margin-top:6px"><b>Signing bonus</b><span><button class="btn small" data-t="bon" data-d="-1000">−1k</button> <b>${fmt(t.bonus)}</b> <button class="btn small" data-t="bon" data-d="1000">+1k</button></span></div>
        <div class="dim" style="font-size:12px">Paid once; spread over the seasons for the cap. No refund and no charge left behind if he leaves.</div>
        <b style="display:block;margin-top:8px">What he wants</b>${['money', 'security', 'role', 'winning', 'patience', 'timing'].map((k) => `<div class="attr"><span>${PRIORITY_LABEL[k]}</span><div class="bar"><i style="width:${p[k]}%"></i></div><b>${p[k]}</b></div>`).join('')}<div class="dim">Career stage: ${p.stage}. Answers within ${responseWindow(m)} period${responseWindow(m) === 1 ? '' : 's'}.</div>
        <b style="display:block;margin-top:8px">Competing offers</b>${rivals.length ? rivals.map((o) => `<div class="muted">${esc(o.club)}: ${fmt(o.salary)}/yr × ${o.years}${o.bonus ? ` + ${fmt(o.bonus)}` : ''} · ${o.state}</div>`).join('') : '<div class="dim">None from other clubs.</div>'}
        <b style="display:block;margin-top:8px">Cap schedule</b>${sched.map((r) => `<div class="row between muted"><span>${yearOf(r.year)}</span><span>${fmt(r.salary)} + ${fmt(r.bonus)} = <b>${fmt(r.total)}</b></span></div>`).join('')}
        ${hist.length ? `<b style="display:block;margin-top:8px">History</b>${hist.map((h) => `<div class="dim">P${h.p ?? '–'} ${esc(h.act)}${h.salary ? ` · ${fmt(h.salary)} × ${h.years}${h.bonus ? ` + ${fmt(h.bonus)}` : ''}` : ''}</div>`).join('')}` : ''}
      </details>
      <div class="row" style="gap:6px;margin-top:8px">${mode === 'offer' ? (mine ? `<button class="btn primary grow" data-act="revise">Revise offer</button>${mine.state === 'countered' ? '<button class="btn grow" data-act="counter">Accept his counter</button>' : ''}<button class="btn danger" data-act="withdraw">Withdraw</button>` : `<button class="btn primary grow" data-act="offer" ${block ? 'disabled' : ''}>Make offer</button>`) : mode === 'extend' ? '<button class="btn primary grow" data-act="extend">Offer extension</button>' : `<button class="btn primary grow" data-act="now" ${block ? 'disabled' : ''}>Offer now</button>`}</div>`;
  };
  const { el, close } = sheet(draw(), { title: mode === 'extend' ? 'Contract extension' : 'Free agent' }); let advOpen = false;
  const root = () => el;
  const redraw = () => { const body = el.querySelector('.sheet-body') || el; advOpen = !!el.querySelector('details')?.open; body.innerHTML = draw(); if (advOpen) el.querySelector('details')?.setAttribute('open', ''); };
  const done = (msg, kind = 'good') => { app.save({ immediate: true }); toast(msg, kind); close(); onDone?.(); };
  root()?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.t === 'sal') { t.salary = Math.max(OFFER_STEP, t.salary + Number(b.dataset.d)); redraw(); return; }
    if (b.dataset.t === 'bon') { t.bonus = Math.max(0, t.bonus + Number(b.dataset.d)); redraw(); return; }
    if (b.dataset.t === 'yrs') { t.years = Number(b.dataset.v); redraw(); return; }
    if (b.dataset.action === 'goroster') { close(); Router.go('contracts'); return; }
    const act = b.dataset.act; if (!act) return; let r;
    if (act === 'offer') { r = F.offerFreeAgent(f, id, t); if (r.ok) return done(`Offer made: he answers by Period ${r.offer.expires}.`); }
    if (act === 'revise') { r = F.reviseFreeAgentOffer(f, mine.id, t); if (r.ok) return done('Offer revised (same deadline).'); }
    if (act === 'counter') { r = F.acceptFreeAgentCounter(f, mine.id); if (r.ok) return done('You took his counter: he answers when the period advances.'); }
    if (act === 'withdraw') { if (!(await confirmSheet(`Withdraw your offer to ${m.name}? The reserved cap is released.`, { title: 'Withdraw', okLabel: 'Withdraw', danger: true }))) return; r = F.withdrawFreeAgentOffer(f, mine.id); if (r.ok) return done('Offer withdrawn.', 'info'); }
    if (act === 'now' || act === 'extend') {
      r = act === 'now' ? F.negotiateFreeAgent(f, id, t) : F.extendContract(f, id, t);
      if (r.ok && r.outcome === 'signed') return done(act === 'now' ? `${m.name} signed.` : `${m.name} extended.`);
      if (r.ok && r.outcome === 'countered') { Object.assign(t, r.counter); toast(`He counters: ${fmt(r.counter.salary)}/yr for ${r.counter.years}.`, 'info'); redraw(); return; }
      if (r.ok) { toast(r.reason || 'He turned it down.', 'bad'); redraw(); return; }
    }
    if (r && !r.ok) toast(r.reason, 'bad');
  });
}

/** Handlers the offseason screen delegates (kept here with the markup they serve). */
export function faHandlers(app, Router) {
  return {
    faopenmarket: () => { const r = F.openFreeAgency(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save({ immediate: true }); Router.render(); }, // a checkpoint around each period step (specification: persistence)
    faopen: (el) => negotiationSheet(app, el.dataset.id, () => Router.render()),
    fafloorrel: async (el) => { // owner rule 2026-11-04: the owner chooses each release; nothing is released automatically
      const x = F.rosterFloorPlan(app.f).releases.find((r) => r.id === el.dataset.id); if (!x) return;
      if (!(await confirmSheet(`Release ${x.name} (${x.position}, ${x.ovr} OVR)? His ${fmt(x.saving)} cr. charge leaves next season's books (no dead cap). He joins the free-agent pool and cannot rejoin you this league year.`, { title: 'Release to make cap room', okLabel: 'Release' }))) return;
      const r = F.releaseMonster(app.f, x.id); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save({ immediate: true }); toast(`${x.name} released: ${fmt(x.saving)} cr. freed.`, 'info'); Router.render();
    },
    fafilter: (el) => { filter = el.dataset.v || ''; Router.render(); },
    faall: () => { showAll = true; Router.render(); },
    fakeen: () => { keenOnly = !keenOnly; Router.render(); },
    faassist: () => { app.f.settings ||= {}; app.f.settings.gmAssistant = !app.f.settings.gmAssistant; app.save(); Router.render(); },
    faadvance: async () => {
      const w = F.advanceWarning(app.f); const last = app.f.freeAgency.period >= E.FA_RULES.periods;
      if (w.length && !(await confirmSheet(`${w.length} of your offers will be answered or expire at this advance${last ? ', and the market closes' : ''}. Advance anyway?`, { title: 'Pending offers', okLabel: 'Advance' }))) return;
      const r = F.advanceFreeAgency(app.f); if (!r.ok) { toast(r.reason, 'bad'); return; } app.save({ immediate: true });
      const mine = r.signed.filter((x) => x.club === app.f.club); for (const s of r.signed) { const m = app.f.roster.find((x) => x.id === s.mid) || null; if (m && legendSide(m)) toast(`🌟 Legendary signing: ${m.name} joins ${s.club}!`, 'good', 4000); }
      toast(mine.length ? `Signed: ${mine.map((x) => x.name).join(', ')}.` : r.period ? `Period ${r.period} of ${E.FA_RULES.periods}.` : 'Free agency closed. The draft is next.', mine.length ? 'good' : 'info'); Router.render();
    },
    fafinish: async () => { const w = E.liveOffers(app.f, (o) => o.club === app.f.club); /* finishing settles every live offer, not only those due this period */ if (!(await confirmSheet(`Finish free agency now? Every remaining period passes at once${w.length ? `; ${w.length} live offer${w.length === 1 ? '' : 's'} of yours will be answered or expire` : ''}.`, { title: 'Finish free agency', okLabel: 'Finish' }))) return; F.finishFreeAgency(app.f); app.save({ immediate: true }); Router.render(); },
  };
}

/** The year-round market screen (decision 9): the offseason periods when they run, else immediate negotiation (decision 17). */
export function registerFaScreens(R, app) {
  R.registerScreen('famarket', {
    title: 'Free-agent market',
    render({ f }) {
      if (!f.freeAgency?.v) return '<p class="dim">The free-agent market arrives with this franchise’s next offseason.</p>';
      const t7Off = F.task7Offseason(f) && f.season.finished;
      if (t7Off) return faOffseasonHtml(f) || '';
      return `<p class="muted">Unsigned monsters are on the market all year. In season he answers your offer at once: yes, no, or a counter. The same cap, roster and legendary rules as every club.</p>${capPanelHtml(f)}${assistantHtml(f)}${marketListHtml(f)}`;
    },
    mount(root) { delegate(root, faHandlers(app, R)); },
  });
}
function marketListHtml(f) {
  const list = F.freeAgentMarket(f).filter((x) => !filter || x.monster.position === filter).map((x) => ({ x, i: interestOf(f, x.monster, x.ask) })).filter(({ i }) => !keenOnly || i.ratio >= 1).sort((a, b) => monsterOverall(b.x.monster) - monsterOverall(a.x.monster));
  const shown = showAll ? list : list.slice(0, 25);
  return `<div class="row" style="gap:4px;flex-wrap:wrap;margin:6px 0"><button class="btn small ${filter ? '' : 'primary'}" data-action="fafilter" data-v="">All</button>${POS.map((x) => `<button class="btn small ${filter === x ? 'primary' : ''}" data-action="fafilter" data-v="${x}">${x}</button>`).join('')}<button class="btn small ${keenOnly ? 'primary' : ''}" data-action="fakeen" aria-pressed="${keenOnly}">Interested in you</button><button class="btn small ${f.settings?.gmAssistant ? 'primary' : ''}" data-action="faassist" aria-pressed="${f.settings?.gmAssistant ? 'true' : 'false'}" style="margin-left:auto">🧭 GM Assistant ${f.settings?.gmAssistant ? 'on' : 'off'}</button></div>
    <div class="list">${shown.map(({ x, i }) => { const m = x.monster; return `<div class="item tappable" data-action="faopen" data-id="${m.id}" role="button" tabindex="0">${monsterSprite(m, 32)}<div class="grow"><div class="name">${legendSide(m) ? '🌟 ' : ''}${esc(m.name)} <span class="dim">${esc(m.position)} · ${monsterOverall(m)} OVR · ${esc(rarityOf(m))} · age ${m.age}</span></div><div class="sub">asks <b>${fmt(x.ask.salary)}</b>/yr · ${x.ask.years} season${x.ask.years === 1 ? '' : 's'} · ${fitOf(f, m)}</div></div><span class="chip ${i.cls}">${i.label}</span></div>`; }).join('') || '<p class="dim">Nobody on the market at this position.</p>'}</div>
    ${list.length > shown.length ? `<button class="btn small block" data-action="faall">Show all ${list.length}</button>` : ''}`;
}

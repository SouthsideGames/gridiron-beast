// Developer review queue (GDD §23.7). Every signature ability and every play
// has a fingerprint of what the owner would judge. An item needs the owner when
// it has never been reviewed (NEW), when it changed after he approved it
// (CHANGED), or when it changed after he asked for work on it (UPDATED: the
// developer has had a go). An item marked Needs work and not yet changed is
// waiting on the developer, not on him. The queue feeds the notification
// badges (main menu, More tab, Developer) and a one-time toast per new batch.

import { SPECIES_DEX } from '../data/species.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../data/playbook.js';
import { ELEMENT_FX, FX_REVISION, familyOf } from './ability-fx.js';
import { reviews, setReview } from '../franchise/review-store.js';
import { esc } from './dom.js';
import { CARD_CHECK, CARD_STATUS_LABEL, CARD_PROPOSALS } from '../data/card-check.js';

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

const PASSIVE = new Set(['attrs', 'fatigue', 'fumbleResist', 'zoneRange', 'blockerStun']);
/** Species with a signature ability: the ones reviewed in the Ability Audit. */
export const REVIEWABLE_ABILITIES = SPECIES_DEX.filter((sp) => sp.ability);
export const REVIEWABLE_PLAYS = [...OFFENSE_IDS, ...DEFENSE_IDS];

export function abilityFingerprint(sp) {
  const keys = Object.keys(sp.ability?.effect || {}); const key = keys.find((k) => !PASSIVE.has(k)) || keys[0] || null; const fam = key ? familyOf(key) : 'passive';
  return hash(JSON.stringify([sp.ability, sp.element, ELEMENT_FX[sp.element], fam, FX_REVISION.all, FX_REVISION.family[fam] || 0, FX_REVISION.species[sp.id] || 0]));
}
export function playFingerprint(id) { return hash(JSON.stringify(PLAYS[id])); }
const FP = new Map(); // the data is frozen for the life of the page: hash each item once
const fpOf = (ns, id) => { const k = ns + ':' + id; if (!FP.has(k)) FP.set(k, ns === 'ability' ? abilityFingerprint(REVIEWABLE_ABILITIES.find((s) => s.id === id)) : playFingerprint(id)); return FP.get(k); };

/**
 * 'new' | 'changed' | 'updated' (all three need the owner) | 'approved' | 'needs_work' (waiting on the developer).
 * A review saved before fingerprints existed (fp null) counts as made on the current version.
 */
export function reviewState(ns, id) {
  const r = reviews(ns)[id]; if (!r?.status) return 'new';
  const same = !r.fp || r.fp === fpOf(ns, id);
  if (r.status === 'approved') return same ? 'approved' : 'changed';
  return same ? 'needs_work' : 'updated';
}
export const NEEDS_OWNER = new Set(['new', 'changed', 'updated']);
export const STATE_BADGE = { new: '<span class="chip rv-new">NEW</span>', changed: '<span class="chip rv-new">CHANGED</span>', updated: '<span class="chip rv-new">UPDATED</span>', approved: '', needs_work: '<span class="chip warn">waiting on dev</span>' };

/** Proposed new cards still waiting for the owner's yes or no (GDD §23.10). */
export function proposalsPending() { const R = reviews('ability'); return Object.keys(CARD_PROPOSALS).filter((id) => !R[id]?.proposal); }
export function reviewQueue() {
  const pending = new Set(proposalsPending());
  const abilities = REVIEWABLE_ABILITIES.filter((sp) => pending.has(sp.id) || NEEDS_OWNER.has(reviewState('ability', sp.id))).map((sp) => sp.id);
  const plays = REVIEWABLE_PLAYS.filter((id) => NEEDS_OWNER.has(reviewState('play', id)));
  return { abilities, plays, total: abilities.length + plays.length };
}
/**
 * Card mismatches (GDD §23.9): abilities whose card says something the engine
 * does not do, found by the code check (CARD_CHECK) or flagged by the owner.
 * They are the developer's to fix, and the owner is told about them.
 */
export function cardMismatches() {
  const R = reviews('ability');
  return REVIEWABLE_ABILITIES.filter((sp) => CARD_CHECK[sp.id] || R[sp.id]?.mismatch).map((sp) => sp.id);
}
export function cardIssue(id) {
  const c = CARD_CHECK[id]; const owner = !!reviews('ability')[id]?.mismatch;
  return c ? { by: 'check', status: c.status, does: c.does, owner } : owner ? { by: 'owner', status: 'missing', does: null, owner } : null;
}
/** Amber count of card mismatches for a button, or ''. */
export function cardBadge(settings, n = cardMismatches().length) { return devNoticesOn(settings) && n ? `<span class="tab-badge inline-badge card-badge" title="Abilities that don't do what their card says">⚠${n}</span>` : ''; }

/** "3 abilities and 2 plays" */
export function queueText(q = reviewQueue()) {
  const part = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return [q.abilities.length ? part(q.abilities.length, 'ability').replace('abilitys', 'abilities') : '', q.plays.length ? part(q.plays.length, 'play') : ''].filter(Boolean).join(' and ');
}
export const devNoticesOn = (settings) => settings?.devNotices !== false;
/** Small red count for a button, or ''. */
export function devBadge(settings, n = reviewQueue().total) { return devNoticesOn(settings) && n ? `<span class="tab-badge inline-badge">${n > 99 ? '99+' : n}</span>` : ''; }

/**
 * Once per batch: a toast when items appear in the queue that the owner has not
 * been told about (new, or a new version of one he saw). Reviewing things never
 * re-announces. Returns the text or null.
 */
export function freshAnnouncement(settings) {
  if (!devNoticesOn(settings)) return null;
  const q = reviewQueue(); const cards = cardMismatches(); if (!q.total && !cards.length) return null;
  let told = []; try { told = JSON.parse(localStorage.getItem('gridiron-beast-review-announced') || '[]'); if (!Array.isArray(told)) told = []; } catch { told = []; }
  const seen = new Set(told);
  const fresh = { abilities: q.abilities.filter((id) => !seen.has(`ability:${id}:${fpOf('ability', id)}`)), plays: q.plays.filter((id) => !seen.has(`play:${id}:${fpOf('play', id)}`)) };
  fresh.total = fresh.abilities.length + fresh.plays.length;
  const freshCards = cards.filter((id) => !seen.has(`card:${id}`));
  const now = [...cards.map((id) => `card:${id}`), ...q.abilities.map((id) => `ability:${id}:${fpOf('ability', id)}`), ...q.plays.map((id) => `play:${id}:${fpOf('play', id)}`)];
  try { localStorage.setItem('gridiron-beast-review-announced', JSON.stringify([...new Set([...told, ...now])].slice(-600))); } catch { /* ignore */ }
  const parts = [];
  if (fresh.total) parts.push(`🛠️ New to review in Developer: ${queueText(fresh)}`);
  if (freshCards.length) parts.push(`⚠ ${freshCards.length} ${freshCards.length === 1 ? 'ability does' : 'abilities do'} not do what the card says`);
  return parts.length ? parts.join(' · ') : null;
}

/** Review controls (Ability Audit rows, the preview sheet, the Playbook Audit). */
export function reviewHtml(ns, id, { open = false } = {}) {
  const r = reviews(ns)[id] || {}; const st = reviewState(ns, id);
  const showNote = open || r.status === 'needs_work' || (r.note || '').trim() || r.gameplay;
  const since = st === 'changed' ? 'Changed since you approved it. Have another look.' : st === 'updated' ? 'Updated since you asked for work. Have another look.' : '';
  return `<div class="review" data-review="${ns}:${id}">
    ${since ? `<div class="review-since">🔔 ${since}</div>` : ''}
    ${ns === 'ability' ? cardHtml(id) : ''}
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn small review-btn ${st === 'approved' ? 'approved' : ''}" data-action="rv-approve" data-ns="${ns}" data-id="${id}" aria-pressed="${st === 'approved'}">✓ Looks good</button><button class="btn small review-btn ${st === 'needs_work' ? 'needswork' : ''}" data-action="rv-needs" data-ns="${ns}" data-id="${id}" aria-pressed="${st === 'needs_work'}">✎ Needs work</button>${showNote ? '' : `<button class="btn small ghost" data-action="rv-note" data-ns="${ns}" data-id="${id}">💬 Note</button>`}</div>
    ${showNote ? `<textarea class="review-note" data-change="rv-text" data-ns="${ns}" data-id="${id}" rows="2" maxlength="2000" placeholder="${ns === 'ability' ? 'What should it look like? Shape, colour, size, timing, label...' : 'What should change? Routes, timing, art, when to call it...'}">${esc(r.note || '')}</textarea>
    <label class="row review-gameplay"><input type="checkbox" data-change="rv-gameplay" data-ns="${ns}" data-id="${id}" ${r.gameplay ? 'checked' : ''}> ⚙ ${ns === 'ability' ? 'The ability should <b>do</b> something different (gameplay, not just looks)' : 'The play should <b>work</b> differently (assignments, not just art)'}</label>
    <div class="dim review-saved" data-saved="${ns}:${id}" style="font-size:11px">${r.updatedAt ? 'Saved' : 'Saves when you tap away'}</div>` : ''}
  </div>`;
}

/** Click/change handlers for reviewHtml; `refresh` redraws whoever shows them, `opened` remembers open note boxes. */
export function reviewHandlers(refresh, opened = new Set(), onError = null) {
  const save = (ns, id, patch) => setReview(ns, id, patch, fpOf(ns, id)).then((ok) => { if (!ok && globalThis.claude?.use) onError?.(); });
  const toggle = (el, status) => { const { ns, id } = el.dataset; const cur = reviews(ns)[id]?.status; const same = cur === status && NEEDS_OWNER.has(reviewState(ns, id)) === false; if (status === 'needs_work') opened.add(`${ns}:${id}`); save(ns, id, { status: same ? null : status }); refresh(); };
  const mark = (el) => document.querySelectorAll(`[data-saved="${el.dataset.ns}:${el.dataset.id}"]`).forEach((n) => { n.textContent = 'Saved'; });
  return {
    'rv-approve': (el) => toggle(el, 'approved'),
    'rv-needs': (el) => toggle(el, 'needs_work'),
    'rv-note': (el) => { opened.add(`${el.dataset.ns}:${el.dataset.id}`); refresh(); setTimeout(() => document.querySelector(`.review-note[data-ns="${el.dataset.ns}"][data-id="${el.dataset.id}"]`)?.focus(), 30); },
    'rv-text': (el) => { save(el.dataset.ns, el.dataset.id, { note: el.value }); mark(el); },
    'rv-gameplay': (el) => { save(el.dataset.ns, el.dataset.id, { gameplay: el.checked }); mark(el); },
    'rv-proposal': (el) => { const { ns, id, v } = el.dataset; const cur = reviews(ns)[id]?.proposal; save(ns, id, { proposal: cur === v ? null : v }); refresh(); },
    'rv-mismatch': (el) => { const { ns, id } = el.dataset; save(ns, id, { mismatch: !reviews(ns)[id]?.mismatch }); refresh(); },
  };
}

/** Plain-text summary for copying (builds outside claude.ai have no shared database). */
export function reviewsText() {
  const lines = []; const tag = (r) => (r.status === 'approved' ? 'APPROVED' : r.status === 'needs_work' ? 'NEEDS WORK' : 'NOTE') + (r.gameplay ? ' + GAMEPLAY' : '') + (r.mismatch ? ' + CARD MISMATCH' : '') + (r.proposal ? ` + NEW CARD ${r.proposal.toUpperCase()}` : '');
  for (const sp of REVIEWABLE_ABILITIES) { const r = reviews('ability')[sp.id]; if (r) lines.push(`${tag(r)}: ${sp.name} (${sp.ability.name})${r.note ? `: ${r.note.trim()}` : ''}`); }
  for (const id of REVIEWABLE_PLAYS) { const r = reviews('play')[id]; if (r) lines.push(`${tag(r)}: play ${PLAYS[id].name}${r.note ? `: ${r.note.trim()}` : ''}`); }
  return lines.join('\n');
}

/** The card-check block on an ability: what the code check found, and the owner's own "doesn't do what it says" toggle. */
function cardHtml(id) {
  const c = CARD_CHECK[id]; const owner = !!reviews('ability')[id]?.mismatch;
  const found = c ? `<div class="card-issue ${c.status}"><b>⚠ ${CARD_STATUS_LABEL[c.status]}</b> <span class="dim">(found by the code check, on the developer's list)</span><div>In the game today: ${esc(c.does)}</div></div>` : '';
  const prop = CARD_PROPOSALS[id]; const decision = reviews('ability')[id]?.proposal || null;
  const proposal = prop ? `<div class="card-proposal ${decision || ''}"><b>✍ Proposed new card</b> <span class="dim">(not a legendary, so no absolutes)</span><div class="card-proposal-text">\u201c${esc(prop)}\u201d</div>
    <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn small review-btn ${decision === 'approved' ? 'approved' : ''}" data-action="rv-proposal" data-ns="ability" data-id="${id}" data-v="approved" aria-pressed="${decision === 'approved'}">✓ Use this card</button><button class="btn small review-btn ${decision === 'rejected' ? 'needswork' : ''}" data-action="rv-proposal" data-ns="ability" data-id="${id}" data-v="rejected" aria-pressed="${decision === 'rejected'}">✎ Not this, see my note</button></div>
    <div class="dim" style="font-size:11px;margin-top:4px">${decision === 'approved' ? 'Approved: the developer builds it next, then it comes back to you as UPDATED.' : decision === 'rejected' ? 'Rejected: say what you want instead in the note below.' : 'Nothing changes until you decide.'}</div></div>` : '';
  return `${found}${proposal}<button class="btn small card-toggle ${owner ? 'on' : ''}" data-action="rv-mismatch" data-ns="ability" data-id="${id}" aria-pressed="${owner}">${owner ? '⚠ You flagged: card doesn\u2019t match the game' : c ? '⚠ Confirm: make it do what the card says' : '⚠ Card doesn\u2019t match what I see'}</button>`;
}

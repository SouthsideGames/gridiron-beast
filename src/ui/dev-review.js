// Developer review queue (GDD §23.7). Every signature ability and every play
// has a fingerprint of what the owner would judge. An item needs the owner when
// it has never been reviewed (NEW), when it changed after he approved it
// (CHANGED), or when it changed after he asked for work on it (UPDATED: the
// developer has had a go). An item marked Needs work and not yet changed is
// waiting on the developer, not on him. The queue feeds the notification
// badges (main menu, More tab, Developer) and a one-time toast per new batch.

import { SPECIES_DEX } from '../data/species.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, RESERVE_OFFENSE_IDS, RESERVE_DEFENSE_IDS } from '../data/playbook.js';
import { ELEMENT_FX, FX_REVISION, familyOf } from './ability-fx.js';
import { SIG_REV } from './ability-sigs.js';
import { reviews, setReview } from '../franchise/review-store.js';
import { esc } from './dom.js';
import { CARD_CHECK, CARD_STATUS_LABEL, CARD_PROPOSALS } from '../data/card-check.js';

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

const PASSIVE = new Set(['attrs', 'fatigue', 'fumbleResist', 'zoneRange', 'blockerStun']);
/** Species with a signature ability: the ones reviewed in the Ability Audit. */
export const REVIEWABLE_ABILITIES = SPECIES_DEX.filter((sp) => sp.ability);
export const REVIEWABLE_PLAYS = [...OFFENSE_IDS, ...DEFENSE_IDS, ...RESERVE_OFFENSE_IDS, ...RESERVE_DEFENSE_IDS];

export function abilityFingerprint(sp) {
  const keys = Object.keys(sp.ability?.effect || {}); const key = keys.find((k) => !PASSIVE.has(k)) || keys[0] || null; const fam = key ? familyOf(key) : 'passive';
  return hash(JSON.stringify([sp.ability, sp.element, ELEMENT_FX[sp.element], fam, FX_REVISION.all, FX_REVISION.family[fam] || 0, FX_REVISION.species[sp.id] || 0, ...(SIG_REV[sp.id] ? [SIG_REV[sp.id]] : [])])); // the signature look counts only where one exists, so untouched abilities keep their approval
}
export function playFingerprint(id) { return hash(JSON.stringify(PLAYS[id])); }
const FP = new Map(); // the data is frozen for the life of the page: hash each item once
/**
 * The two Task 8 ability reviewers (namespaces 'fbability' and 'clashability', keyed by Dex ability id and kept apart). Each
 * ability's fingerprint is its approved contract text and values; `meta.rev` (src/data/ability-review-revisions.js) is added only
 * when it is set, so a material change the text does not show sends that one ability back to Pending Review and nothing else.
 * Registering an ability here also puts it in that reviewer's inventory, which the notification counts are derived from.
 */
const fbFingerprints = new Map(); const INVENTORY = { fbability: new Map(), clashability: new Map() };
const abilityFp = (data, rev) => hash(JSON.stringify(rev ? [data, { rev }] : data));
export function setFootballFingerprint(id, data, meta = {}) { fbFingerprints.set(id, abilityFp(data, meta.rev)); INVENTORY.fbability.set(id, { id, name: meta.name || id, anchor: meta.anchor || null }); }
export function setClashFingerprint(id, data, meta = {}) { fbFingerprints.set(`clashability:${id}`, abilityFp(data, meta.rev)); INVENTORY.clashability.set(id, { id, name: meta.name || id, anchor: meta.anchor || null }); }
/** The reviewers, as the notifications name them. */
export const ABILITY_REVIEWERS = Object.freeze({ fbability: { ns: 'fbability', title: 'Ability Reviewer', screen: 'ability-reviewer', icon: '🧪' }, clashability: { ns: 'clashability', title: 'Clash Ability Reviewer', screen: 'clash-ability-reviewer', icon: '⚔️' } });
const fpOf = (ns, id) => { if (ns === 'fbability' || ns === 'clashability') return fbFingerprints.get(`${ns}:${id}`) || fbFingerprints.get(id) || null; const k = ns + ':' + id; if (!FP.has(k)) FP.set(k, ns === 'ability' ? abilityFingerprint(REVIEWABLE_ABILITIES.find((s) => s.id === id)) : playFingerprint(id)); return FP.get(k); };

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

/**
 * Ability review status, in the owner's three words. Pending Review: never reviewed, or changed since the last verdict.
 * Approved: approved on exactly the current version. Needs Revision: marked so on the current version; it stays outstanding
 * until the corrected version is reviewed and approved. Review status never switches an ability on or off in the game.
 */
export const abilityStatus = (ns, id) => { const s = reviewState(ns, id); return s === 'approved' ? 'approved' : s === 'needs_work' ? 'revision' : 'pending'; };
export const ABILITY_STATUS_LABEL = Object.freeze({ pending: 'Pending Review', approved: 'Approved', revision: 'Needs Revision' });
export function abilityStateBadge(ns, id) {
  const s = reviewState(ns, id);
  return s === 'approved' ? '<span class="chip good">APPROVED</span>' : s === 'needs_work' ? '<span class="chip warn">NEEDS REVISION</span>' : `<span class="chip rv-new">${s === 'changed' ? 'CHANGED · ' : s === 'updated' ? 'UPDATED · ' : ''}PENDING REVIEW</span>`;
}
/**
 * One reviewer's inventory by status: { ns, title, screen, total, pending, approved, revision, outstanding } (lists of
 * { id, name, anchor }; `outstanding` = pending + revision, a number). Derived from the registered inventory and the saved
 * verdicts every time it is asked, so it is right after a verdict, a reload, or a cloud merge, and nothing can be duplicated.
 */
export function abilityReviewQueue(ns) {
  const out = { ...ABILITY_REVIEWERS[ns], total: INVENTORY[ns].size, pending: [], approved: [], revision: [] };
  for (const item of INVENTORY[ns].values()) out[abilityStatus(ns, item.id)].push(item);
  out.outstanding = out.pending.length + out.revision.length; return out;
}
/** "Ability Reviewer — 18 abilities need review · 2 need revision", or '' when nothing is outstanding. */
export function abilityQueueText(q) {
  const n = (k, w) => `${k} ${k === 1 ? 'ability needs' : 'abilities need'} ${w}`;
  const parts = [q.pending.length ? n(q.pending.length, 'review') : '', q.revision.length ? (q.pending.length ? `${q.revision.length} need${q.revision.length === 1 ? 's' : ''} revision` : n(q.revision.length, 'revision')) : ''].filter(Boolean);
  return parts.length ? `${q.title} — ${parts.join(' · ')}` : '';
}
/** A notification can open a reviewer on a filter, and on one ability: the reviewer takes this once when it draws. */
const focus = {};
export function focusReviewer(ns, { status = null, id = null } = {}) { focus[ns] = { status, id, anchor: id ? INVENTORY[ns].get(id)?.anchor || null : null }; }
export function takeReviewerFocus(ns) { const f = focus[ns] || null; delete focus[ns]; return f; }
/** Proposed new cards still waiting for the owner's yes or no (GDD §23.10). */
export function proposalsPending() { const R = reviews('ability'); return Object.keys(CARD_PROPOSALS).filter((id) => !R[id]?.proposal); }
export function reviewQueue() {
  const pending = new Set(proposalsPending());
  // `abilities` is the retired Legacy Ability Audit's list. It is still computed for that screen's own code and tests, but it is
  // no longer part of the notification total: the screen left the Developer menu (owner 2026-11-11).
  const abilities = REVIEWABLE_ABILITIES.filter((sp) => pending.has(sp.id) || NEEDS_OWNER.has(reviewState('ability', sp.id))).map((sp) => sp.id);
  const plays = REVIEWABLE_PLAYS.filter((id) => NEEDS_OWNER.has(reviewState('play', id)));
  const football = abilityReviewQueue('fbability'), clash = abilityReviewQueue('clashability');
  return { abilities, plays, football, clash, total: plays.length + football.outstanding + clash.outstanding };
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

/** "2 plays" (the Playbook Audit's part of the queue; the ability reviewers have their own lines, abilityQueueText). */
export function queueText(q = reviewQueue()) {
  const part = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return q.plays.length ? part(q.plays.length, 'play') : '';
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
  const q = reviewQueue(); if (!q.total) return null;
  let told = []; try { told = JSON.parse(localStorage.getItem('gridiron-beast-review-announced') || '[]'); if (!Array.isArray(told)) told = []; } catch { told = []; }
  const seen = new Set(told);
  const playKey = (id) => `play:${id}:${fpOf('play', id)}`;
  const abKey = (ns, kind) => (item) => `${ns}:${item.id}:${fpOf(ns, item.id)}:${kind}`; // a verdict of Needs Revision is told once, like a new version
  const freshPlays = q.plays.filter((id) => !seen.has(playKey(id)));
  const now = q.plays.map(playKey); const parts = [];
  if (freshPlays.length) parts.push(`🛠️ New to review in Developer: ${queueText({ plays: freshPlays })}`);
  for (const r of [q.football, q.clash]) {
    const keys = [...r.pending.map(abKey(r.ns, 'p')), ...r.revision.map(abKey(r.ns, 'r'))]; now.push(...keys);
    if (keys.some((k) => !seen.has(k))) parts.push(`${r.icon} ${abilityQueueText(r)}`); // the actual outstanding counts, as on the Developer screen
  }
  try { localStorage.setItem('gridiron-beast-review-announced', JSON.stringify([...new Set([...told, ...now])].slice(-900))); } catch { /* ignore */ }
  return parts.length ? parts.join(' · ') : null;
}

/** Review controls (Ability Audit rows, the preview sheet, the Playbook Audit). */
export function reviewHtml(ns, id, { open = false } = {}) {
  const r = reviews(ns)[id] || {}; const st = reviewState(ns, id); const isAb = ns === 'fbability' || ns === 'clashability';
  const showNote = open || r.status === 'needs_work' || (r.note || '').trim() || r.gameplay;
  const since = st === 'changed' ? 'Changed since you approved it. Have another look.' : st === 'updated' ? 'Updated since you asked for work. Have another look.' : '';
  return `<div class="review" data-review="${ns}:${id}">
    ${since ? `<div class="review-since">🔔 ${since}</div>` : ''}
    ${ns === 'ability' ? cardHtml(id) : ''}
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn small review-btn ${st === 'approved' ? 'approved' : ''}" data-action="rv-approve" data-ns="${ns}" data-id="${id}" aria-pressed="${st === 'approved'}">${isAb ? '✓ Approve' : '✓ Looks good'}</button><button class="btn small review-btn ${st === 'needs_work' ? 'needswork' : ''}" data-action="rv-needs" data-ns="${ns}" data-id="${id}" aria-pressed="${st === 'needs_work'}">${isAb ? '✎ Needs revision' : '✎ Needs work'}</button>${showNote ? '' : `<button class="btn small ghost" data-action="rv-note" data-ns="${ns}" data-id="${id}">💬 Note</button>`}</div>
    ${showNote ? `<textarea class="review-note" data-change="rv-text" data-ns="${ns}" data-id="${id}" rows="2" maxlength="2000" placeholder="${ns === 'ability' ? 'What should it look like? Shape, colour, size, timing, label...' : 'What should change? Routes, timing, art, when to call it...'}">${esc(r.note || '')}</textarea>
    <label class="row review-gameplay"><input type="checkbox" data-change="rv-gameplay" data-ns="${ns}" data-id="${id}" ${r.gameplay ? 'checked' : ''}> ⚙ ${ns === 'ability' ? 'The ability should <b>do</b> something different (gameplay, not just looks)' : 'The play should <b>work</b> differently (assignments, not just art)'}</label>
    <div class="dim review-saved" data-saved="${ns}:${id}" style="font-size:11px">${r.updatedAt ? 'Saved' : 'Saves when you tap away'}</div>` : ''}
    ${ns === 'play' && PLAYS[id]?.reserve ? `<label class="row review-practice" style="gap:6px;margin-top:8px"><input type="checkbox" data-change="rv-practice" data-ns="${ns}" data-id="${id}" ${r.practice ? 'checked' : ''} style="width:auto;min-height:0;margin:0"> 🎯 OK to add this play to the practice field</label>` : ''}
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
    'rv-practice': (el) => { save(el.dataset.ns, el.dataset.id, { practice: el.checked }); },
    'rv-proposal': (el) => { const { ns, id, v } = el.dataset; const cur = reviews(ns)[id]?.proposal; save(ns, id, { proposal: cur === v ? null : v }); refresh(); },
    'rv-mismatch': (el) => { const { ns, id } = el.dataset; save(ns, id, { mismatch: !reviews(ns)[id]?.mismatch }); refresh(); },
  };
}

/**
 * Playbook Audit "Flag this moment": marks the play Needs work and adds a line to its note saying
 * exactly what was on screen (mode, opponent, seed, time), so the developer can replay it.
 */
export function flagPlayMoment(id, line) {
  const r = reviews('play')[id] || {}; const note = [(r.note || '').trim(), line].filter(Boolean).join('\n');
  return setReview('play', id, { status: 'needs_work', note }, fpOf('play', id));
}

/** Plain-text summary for copying (builds outside claude.ai have no shared database). */
export function reviewsText() {
  const lines = []; const tag = (r) => (r.status === 'approved' ? 'APPROVED' : r.status === 'needs_work' ? 'NEEDS WORK' : 'NOTE') + (r.gameplay ? ' + GAMEPLAY' : '') + (r.mismatch ? ' + CARD MISMATCH' : '') + (r.proposal ? ` + NEW CARD ${r.proposal.toUpperCase()}` : '') + (r.practice ? ' + OK FOR PRACTICE' : '');
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

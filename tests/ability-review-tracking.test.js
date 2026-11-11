// Ability review tracking and notifications (owner 2026-11-11): every Football Ability and every Clash Ability has a review status
// (Pending Review, Approved, Needs Revision), kept apart per reviewer, counted by the same derived notification queue the play
// reviews use. Review status is development oversight only: it never changes what an ability does in a game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const D = await import('../src/ui/dev-review.js');
const S = await import('../src/franchise/review-store.js');
const I = await import('../src/ui/ability-review-inventory.js');
const Dex = await import('../src/data/beast-dex.js');
const { registeredFamilies } = await import('../src/sim/abilities/registry.js');
const { registeredClashAbilities } = await import('../src/clash/t8/registry.js');
const inv = I.registerAbilityReviews();
const all = Array.isArray(Dex.ABILITIES) ? Dex.ABILITIES : Object.values(Dex.ABILITIES);
const fp = (ns, id) => { let got = null; const orig = S.setReview; void orig; return got; };
void fp;
// the fingerprint the reviewer's own buttons would save with (reviewHandlers → fpOf): read it by pressing Approve through the handlers
const press = (ns, id, action) => D.reviewHandlers(() => {})[action]({ dataset: { ns, id } });
const reset = () => { for (const k of Object.keys(localStorage._)) delete localStorage._[k]; for (const ns of ['fbability', 'clashability', 'play', 'ability']) { const r = S.reviews(ns); for (const k of Object.keys(r)) delete r[k]; } };

test('inventory: every implemented Football and Clash ability is in its reviewer, once, from the registries', () => {
  const fb = all.filter((a) => a.mode === 'football').map((a) => a.id), cl = all.filter((a) => a.mode === 'clash').map((a) => a.id);
  assert.ok(fb.length > 0 && cl.length > 0);
  assert.deepEqual(inv.football.map((c) => c.abilityId).sort(), [...fb].sort(), 'every Dex football ability');
  assert.deepEqual(inv.clash.map((c) => c.abilityId).sort(), [...cl].sort(), 'every Dex Clash ability');
  assert.deepEqual(inv.clash.map((c) => c.abilityId).sort(), registeredClashAbilities().sort(), 'every Clash ability registered on the engine');
  const fbFamilies = new Set(inv.football.map((c) => c.family)); for (const fam of registeredFamilies()) assert.ok(fbFamilies.has(fam), `registered football family ${fam} is reviewable`);
  assert.deepEqual(I.inventoryGaps(), { missingFootball: [], missingClash: [], duplicates: [], notOnEngine: [] });
  const q = D.reviewQueue(); assert.equal(q.football.total, fb.length); assert.equal(q.clash.total, cl.length);
  assert.equal(inv.football.filter((c) => inv.clash.some((x) => x.abilityId === c.abilityId)).length, 0, 'football and Clash ids never collide');
  assert.equal(I.registerAbilityReviews(), inv, 'registering twice adds nothing');
});

test('initial status: with no recorded approval every ability is Pending Review, and both reviewers are fully outstanding', () => {
  reset(); const q = D.reviewQueue();
  for (const r of [q.football, q.clash]) { assert.equal(r.pending.length, r.total); assert.equal(r.approved.length, 0); assert.equal(r.revision.length, 0); assert.equal(r.outstanding, r.total); }
  assert.equal(D.abilityStatus('fbability', inv.football[0].abilityId), 'pending'); assert.match(D.abilityStateBadge('fbability', inv.football[0].abilityId), /PENDING REVIEW/);
  assert.equal(q.total, q.plays.length + q.football.total + q.clash.total, 'the notification total: plays plus both ability reviewers (the retired legacy audit is not counted)');
  assert.equal(D.abilityQueueText(q.football), `Ability Reviewer — ${q.football.total} abilities need review`);
  assert.equal(D.abilityQueueText(q.clash), `Clash Ability Reviewer — ${q.clash.total} abilities need review`);
});

test('approve and needs revision: saved, counted, independent between the two reviewers, and still there after a reload', async () => {
  reset(); const a = inv.football[0].abilityId, b = inv.football[1].abilityId, family = inv.football[0].family;
  const twin = inv.clash.find((c) => c.family === family) || inv.clash[0];
  press('fbability', a, 'rv-approve'); press('fbability', b, 'rv-needs');
  assert.equal(D.abilityStatus('fbability', a), 'approved'); assert.equal(D.abilityStatus('fbability', b), 'revision');
  assert.match(D.abilityStateBadge('fbability', a), /APPROVED/); assert.match(D.abilityStateBadge('fbability', b), /NEEDS REVISION/);
  let q = D.reviewQueue();
  assert.equal(q.football.approved.length, 1); assert.equal(q.football.revision.length, 1); assert.equal(q.football.pending.length, q.football.total - 2);
  assert.equal(q.football.outstanding, q.football.total - 1, 'approved leaves the count; needs revision stays outstanding');
  assert.equal(D.abilityQueueText(q.football), `Ability Reviewer — ${q.football.total - 2} abilities need review · 1 needs revision`);
  assert.equal(D.abilityStatus('clashability', twin.abilityId), 'pending', 'approving the football ability did not approve its Clash counterpart');
  assert.equal(q.clash.outstanding, q.clash.total); assert.deepEqual(Object.keys(S.reviews('clashability')), []);
  press('clashability', twin.abilityId, 'rv-approve'); q = D.reviewQueue();
  assert.equal(q.clash.approved.length, 1); assert.equal(q.football.approved.length, 1, 'and the reverse');
  // separate storage keys; a reload (a fresh module instance reading localStorage) shows the same statuses
  const keys = Object.keys(localStorage._); assert.ok(keys.includes('gridiron-beast-football-ability-reviews') && keys.includes('gridiron-beast-clash-ability-reviews'));
  const fresh = await import('../src/franchise/review-store.js?reload-1');
  assert.equal(fresh.reviews('fbability')[a].status, 'approved'); assert.equal(fresh.reviews('fbability')[b].status, 'needs_work'); assert.equal(fresh.reviews('clashability')[twin.abilityId].status, 'approved');
  assert.ok(fresh.reviews('fbability')[a].fp, 'the verdict records the version it was given on');
  // approving the corrected ability clears it
  press('fbability', b, 'rv-approve'); assert.equal(D.reviewQueue().football.revision.length, 0); assert.equal(D.reviewQueue().football.approved.length, 2);
  assert.equal(D.abilityQueueText({ ...D.reviewQueue().football, pending: [], revision: [{ id: 'x' }, { id: 'y' }] }), 'Ability Reviewer — 2 abilities need revision');
  assert.equal(D.abilityQueueText({ ...D.reviewQueue().football, pending: [], revision: [] }), '');
});

test('a materially changed ability returns to Pending Review; unrelated approvals and existing valid approvals are kept', async () => {
  reset(); const [a, b, c] = inv.football.map((x) => x.abilityId);
  press('fbability', a, 'rv-approve'); press('fbability', b, 'rv-approve'); press('fbability', c, 'rv-needs');
  const savedFp = S.reviews('fbability')[a].fp;
  // (1) the contract changed: the saved verdict was given on another version
  await S.setReview('fbability', a, { status: 'approved' }, 'an-older-version');
  assert.equal(D.reviewState('fbability', a), 'changed'); assert.equal(D.abilityStatus('fbability', a), 'pending'); assert.match(D.abilityStateBadge('fbability', a), /CHANGED · PENDING REVIEW/);
  assert.equal(D.abilityStatus('fbability', b), 'approved', 'an unrelated approval is untouched');
  await S.setReview('fbability', c, { status: 'needs_work' }, 'an-older-version'); assert.equal(D.abilityStatus('fbability', c), 'pending', 'a revised ability comes back for review'); assert.match(D.abilityStateBadge('fbability', c), /UPDATED · PENDING REVIEW/);
  // (2) a change the contract text does not show: the revision number. Only that ability's fingerprint moves.
  const row = inv.football.find((x) => x.abilityId === b); const ab = Dex.abilityById(b); const data = [ab.name, ab.category, ab.activation, ab.mechanic, ab.details, ab.ruling, ab.values, row.registered];
  D.setFootballFingerprint(b, data, { name: row.name, rev: 1 }); assert.equal(D.abilityStatus('fbability', b), 'pending', 'revision 1: approval lapsed');
  D.setFootballFingerprint(b, data, { name: row.name, rev: 0 }); assert.equal(D.abilityStatus('fbability', b), 'approved', 'no revision entry: the fingerprint is the one the approval was saved with');
  // (3) an approval saved by the reviewer before this change (same fingerprint data) is still valid
  await S.setReview('fbability', a, { status: 'approved' }, savedFp); assert.equal(D.abilityStatus('fbability', a), 'approved');
  const { FOOTBALL_REVISION, CLASH_REVISION } = await import('../src/data/ability-review-revisions.js');
  for (const id of [...Object.keys(FOOTBALL_REVISION), ...Object.keys(CLASH_REVISION)]) assert.ok(Dex.abilityById(id), `revision entry ${id} is a real ability`);
});

test('notifications: derived counts, told once per batch, never duplicated, updated by verdicts; play-review notices unchanged', async () => {
  reset(); const q0 = D.reviewQueue();
  assert.equal(D.freshAnnouncement({ devNotices: false }), null, 'notices off: silent');
  const msg = D.freshAnnouncement({});
  assert.match(msg, /New to review in Developer: \d+ plays/, 'the play-review notice is still there');
  assert.ok(msg.includes(`Ability Reviewer — ${q0.football.total} abilities need review`)); assert.ok(msg.includes(`Clash Ability Reviewer — ${q0.clash.total} abilities need review`));
  assert.equal(D.freshAnnouncement({}), null, 'opening again announces nothing: no duplicates'); assert.equal(D.freshAnnouncement({}), null);
  assert.deepEqual(D.reviewQueue(), q0, 'reading the queue changes nothing');
  press('fbability', inv.football[0].abilityId, 'rv-approve');
  assert.equal(D.reviewQueue().total, q0.total - 1); assert.equal(D.freshAnnouncement({}), null, 'approving never re-announces');
  press('clashability', inv.clash[0].abilityId, 'rv-needs');
  assert.equal(D.reviewQueue().clash.outstanding, q0.clash.total, 'needs revision is still outstanding');
  const m2 = D.freshAnnouncement({}); assert.ok(m2.includes('Clash Ability Reviewer') && m2.includes('1 needs revision') && !m2.includes('🧪'), 'a new Needs Revision is told once, for its own reviewer only'); assert.equal(D.freshAnnouncement({}), null);
  // a play approval still works exactly as before and does not touch the ability counts
  const before = D.reviewQueue(); await S.setReview('play', 'mesh', { status: 'approved' }, D.playFingerprint('mesh')); const after = D.reviewQueue();
  assert.equal(after.plays.length, before.plays.length - 1); assert.equal(after.football.outstanding, before.football.outstanding); assert.equal(after.clash.outstanding, before.clash.outstanding);
  assert.equal(D.devBadge({}, 0), ''); assert.match(D.devBadge({}, 12), />12</); assert.equal(D.devBadge({ devNotices: false }, 12), '');
  // navigation: a notice opens its own reviewer, on what is outstanding, optionally on one ability
  assert.equal(D.ABILITY_REVIEWERS.fbability.screen, 'ability-reviewer'); assert.equal(D.ABILITY_REVIEWERS.clashability.screen, 'clash-ability-reviewer');
  assert.equal(D.ABILITY_REVIEWERS.fbability.title, 'Ability Reviewer'); assert.equal(D.ABILITY_REVIEWERS.clashability.title, 'Clash Ability Reviewer');
  D.focusReviewer('clashability', { status: 'revision', id: inv.clash[0].abilityId });
  assert.equal(D.takeReviewerFocus('fbability'), null); assert.deepEqual(D.takeReviewerFocus('clashability'), { status: 'revision', id: inv.clash[0].abilityId, anchor: `cl-${inv.clash[0].abilityId}` }); assert.equal(D.takeReviewerFocus('clashability'), null, 'taken once');
});

test('Developer Tools: no Legacy Ability Audit entry, exact reviewer titles, notices wired to the reviewers; review status never gates gameplay', () => {
  const menu = fs.readFileSync(new URL('../src/ui/screens/menu.js', import.meta.url), 'utf8');
  assert.ok(!/Legacy Ability Audit/.test(menu) && !/data-screen="ability-audit"/.test(menu), 'the legacy entry is gone from the menu');
  assert.match(menu, /data-screen="ability-reviewer">🧪 Ability Reviewer\$\{devBadge/); assert.match(menu, /data-screen="clash-ability-reviewer">⚔️ Clash Ability Reviewer\$\{devBadge/);
  assert.ok(!/Ability Reviewer \(/.test(menu), 'no descriptive text after either title');
  assert.match(fs.readFileSync(new URL('../src/ui/screens/ability-reviewer.js', import.meta.url), 'utf8'), /title: 'Ability Reviewer',/);
  assert.match(fs.readFileSync(new URL('../src/ui/screens/clash-ability-reviewer.js', import.meta.url), 'utf8'), /title: 'Clash Ability Reviewer',/);
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /syncReviews\('fbability'\), syncReviews\('clashability'\)/, 'saved review data is loaded before the counts are announced');
  assert.match(main, /registerAbilityBalance\(Router\)/, 'Ability Balance, which shares the legacy module, still registers');
  // nothing under the engines reads the review store
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [`${dir}/${e.name}`] : []));
  for (const dir of ['src/sim', 'src/clash', 'src/core']) for (const file of walk(new URL(`../${dir}`, import.meta.url).pathname)) { const src = fs.readFileSync(file, 'utf8'); assert.ok(!/review-store|dev-review|ability-review-inventory/.test(src), `${file} does not read review status`); }
});

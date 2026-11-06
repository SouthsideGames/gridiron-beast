// Task 7 — the hidden monster Ambition (owner approval 2026-11-05 §1). Probabilities, never rules; hidden from the player; separate
// from Nature, Temper and training.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as E from '../src/franchise/fa-engine.js';
import * as Save from '../src/franchise/save.js';
import { AMBITIONS, AMBITION, ambitionFor, ambitionOf, talkChance } from '../src/franchise/ambition.js';
import { personaOf } from '../src/franchise/fa-personality.js';
import { generateMonster, tryEvolve, nextEvolution, pointCost, monsterOverall } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';
import { leagueClubs, clubRoster } from '../src/franchise/league-registry.js';
import { releaseFromClub } from '../src/franchise/league.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { t7Settle } from './t7-support.js';

const everyone = (f) => { const out = [...f.roster]; for (const c of leagueClubs(f)) out.push(...clubRoster(f, c)); for (const l of Object.values(f.pool || {})) out.push(...l); out.push(...(f.league?.waivers || []), ...(f.draft?.class || [])); return out; };
function seasonDone(seed) {
  const f = newFranchise(seed);
  for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  return f;
}
/** A copy of `m` with another Ambition (the same id, so the same personality and the same mood). */
const as = (m, a) => Object.assign(Object.create(Object.getPrototypeOf(m)), m, { ambition: a });

test('assignment: every monster has exactly one Ambition, individually (not by family), about equally, reproducibly', () => {
  const f = newFranchise(71); const all = everyone(f);
  assert.ok(all.length > 500);
  for (const m of all) assert.ok(AMBITIONS.includes(m.ambition), `${m.name} has ${m.ambition}`);
  const n = {}; for (const m of all) n[m.ambition] = (n[m.ambition] || 0) + 1;
  for (const a of AMBITIONS) assert.ok(n[a] / all.length > 0.18 && n[a] / all.length < 0.32, JSON.stringify(n));
  const bySpecies = {}; for (const m of all) (bySpecies[m.species] ||= new Set()).add(m.ambition);
  assert.ok(Object.values(bySpecies).filter((s) => s.size >= 2).length >= Object.keys(bySpecies).length * 0.5, 'one family holds several Ambitions');
  const g = newFranchise(71); const again = new Map(everyone(g).map((m) => [m.id, m.ambition]));
  for (const m of all) if (again.has(m.id)) assert.equal(again.get(m.id), m.ambition, 'the same seed gives the same Ambitions');
  const r = createRng(5); const m = generateMonster(r, { position: 'QB', quality: 60 }); assert.equal(m.ambition, ambitionFor(m.id), 'a newly generated monster');
});

test('persistence: save and load, evolution, release and a new club never change an Ambition; old saves migrate once, deterministically', () => {
  const f = newFranchise(72); const before = new Map(everyone(f).map((m) => [m.id, m.ambition]));
  const back = Save.importJson(Save.exportJson(f)); for (const m of everyone(back)) assert.equal(m.ambition, before.get(m.id));
  // evolution
  const ev = f.roster.find((m) => nextEvolution(m)); if (ev) { const a = ev.ambition; ev.level = Math.max(ev.level, nextEvolution(ev).level); tryEvolve(ev); assert.equal(ev.ambition, a); }
  // release to the pools and a signing elsewhere
  const club = leagueClubs(f).slice().sort()[0]; const x = clubRoster(f, club).find((m) => !m.legendary && !m.signature); const a = x.ambition;
  releaseFromClub(f, club, x.id, { year: f.season.year }); const pooled = Object.values(f.pool).flat().find((m) => m.id === x.id) || f.league.waivers.find((m) => m.id === x.id); assert.equal(pooled?.ambition ?? x.ambition, a);
  // an old save: no Ambitions at all → each gets ambitionFor(id), once; nothing else changes
  const old = JSON.parse(Save.exportJson(f)); const strip = (o) => { for (const m of [...o.franchise.roster, ...Object.values(o.franchise.league.monsters)]) delete m.ambition; for (const l of Object.values(o.franchise.pool || {})) for (const m of l) delete m.ambition; delete o.franchise.ambitionMigration; };
  strip(old); const natureBefore = old.franchise.roster.map((m) => [m.id, m.nature, JSON.stringify(m.attributes), m.potential]);
  const g = Save.importJson(JSON.stringify(old)); assert.ok(g.ambitionMigration && g.ambitionMigration.assigned > 0);
  for (const m of everyone(g)) assert.equal(m.ambition, ambitionFor(m.id));
  assert.deepEqual(g.roster.map((m) => [m.id, m.nature, JSON.stringify(m.attributes), m.potential]), natureBefore, 'nature, attributes and potential untouched');
  const h = Save.importJson(Save.exportJson(g)); assert.deepEqual(h.ambitionMigration, g.ambitionMigration, 'the migration runs once');
  for (const m of everyone(h)) assert.equal(m.ambition, ambitionFor(m.id), 'never rerandomized on load');
});

test('hidden: no player-facing screen or helper prints a monster’s Ambition or its weights', async () => {
  const dir = new URL('../src/ui/', import.meta.url); const files = [];
  const walk = (u) => { for (const e of fs.readdirSync(u, { withFileTypes: true })) { if (e.isDirectory()) walk(new URL(`${e.name}/`, u)); else if (e.name.endsWith('.js')) files.push(new URL(e.name, u)); } }; walk(dir);
  for (const u of files) { const src = fs.readFileSync(u, 'utf8'); assert.doesNotMatch(src, /ambition/i, `${u.pathname} must not read the Ambition`); }
  const f = seasonDone(73); t7Settle(f); assert.ok(F.openFreeAgency(f).ok);
  const ui = await import('../src/ui/fa-ui.js'); f.settings.gmAssistant = true;
  const html = [ui.assistantHtml(f), ui.extensionAdviceHtml(f), ...f.roster.map((m) => JSON.stringify(ui.renewalOutlook(f, m))), ...F.freeAgentMarket(f).slice(0, 40).map((x) => JSON.stringify(ui.interestOf(f, x.monster, x.ask)))].join('\n');
  assert.doesNotMatch(html, /ambition|loyalty|championship|opportunity/i);
  for (const a of AMBITIONS) assert.ok(!html.includes(`"${a}"`));
});

test('probabilities: each Ambition moves the relevant decision, and none guarantees an outcome', () => {
  const f = seasonDone(74); t7Settle(f); assert.ok(F.openFreeAgency(f).ok);
  const pool = [...F.freeAgentMarket(f).map((x) => x.monster), ...leagueClubs(f).flatMap((c) => clubRoster(f, c))].filter((m) => !m.legendary && !m.signature && !m.contract?.permanent).slice(0, 300); assert.ok(pool.length >= 150);
  const clubs = E.allClubs(f); const out = clubs.map((c) => [c, E.clubOutlook(f, c)]).sort((a, b) => a[1] - b[1]); const weak = out[0][0], strong = out.at(-1)[0];
  const acc = (a, club, share) => pool.filter((m) => { const t = { salary: Math.round(E.askOf(f, m).salary * share / 100) * 100, years: E.askOf(f, m).years, bonus: 0 }; const r = E.rateOffer(f, as(m, a), club, t); return r.score >= r.need; }).length / pool.length;
  const others = (a, club, share) => AMBITIONS.filter((x) => x !== a).reduce((s, x) => s + acc(x, club, share), 0) / 3;
  // Money: below-ask offers are refused more often; some are still accepted
  const mid = clubs[Math.floor(clubs.length / 2)];
  assert.ok(acc('money', mid, 0.9) < others('money', mid, 0.9), 'money refuses low offers more');
  assert.ok(acc('money', mid, 0.9) > 0, 'a money-driven monster can accept a lower offer');
  // Championship: a strong club more attractive, a struggling one less, than for the others
  assert.ok(acc('championship', strong, 1) - acc('championship', weak, 1) > others('championship', strong, 1) - others('championship', weak, 1), 'direction matters more');
  assert.ok(acc('championship', weak, 1.05) > 0, 'a championship-driven monster can still sign with a struggling club');
  // Talks: championship less willing at a struggling club; opportunity less willing as a blocked backup; loyalty most willing at home
  const T = (x) => talkChance({ ambition: 'championship', outlook: 0.5, role: 'starter', marketRole: 'starter', home: false, veteran: false, ...x });
  assert.ok(T({ outlook: 0.2 }) < T({ outlook: 0.9 }));
  assert.ok(talkChance({ ambition: 'opportunity', outlook: 0.5, role: 'backup', marketRole: 'starter' }) < talkChance({ ambition: 'opportunity', outlook: 0.5, role: 'starter', marketRole: 'starter' }));
  assert.ok(talkChance({ ambition: 'loyalty', outlook: 0.2, role: 'depth', marketRole: 'starter', home: true }) > talkChance({ ambition: 'loyalty', outlook: 0.2, role: 'depth', marketRole: 'starter', home: false }));
  for (const a of AMBITIONS) for (const x of [{ outlook: 0, role: 'depth', marketRole: 'starter' }, { outlook: 1, role: 'starter', marketRole: 'starter', home: true, veteran: true }]) { const p = talkChance({ ambition: a, ...x }); assert.ok(p > 0.1 && p < 0.99, `${a}: never certain (${p})`); }
  // Opportunity: a monster who would be a backup here is harder to sign than for the others
  const strongRoster = E.rosterOf(f, strong); const blocked = pool.filter((m) => E.roleAt(f, strong, m) !== 'starter' && E.marketRole(f, m) === 'starter');
  if (blocked.length >= 5) { const rate = (a) => blocked.filter((m) => { const r = E.rateOffer(f, as(m, a), strong, { ...E.askOf(f, m), bonus: 0 }); return r.score >= r.need; }).length; assert.ok(rate('opportunity') <= Math.min(rate('money'), rate('loyalty')), 'role matters more'); }
  assert.ok(strongRoster.length > 0);
  // the loyalty value is bounded: never more than AMBITION.loyalHome of the money part
  for (const m of f.roster.slice(0, 20)) { const r = E.rateOffer(f, as(m, 'loyalty'), f.club, { ...E.askOf(f, m), bonus: 0 }); assert.ok(r.home <= AMBITION.loyalHome + 1e-9); }
  // no outcome is certain for a borderline offer: across the pool, each Ambition both accepts and refuses at 95% of the ask
  for (const a of AMBITIONS) { const x = acc(a, mid, 0.95); assert.ok(x > 0 && x < 1, `${a}: ${x}`); }
});

test('extension agency: a monster may decline to talk in a window; asking again changes nothing; owner and AI use the same negotiation', () => {
  const f = seasonDone(75); t7Settle(f); assert.ok(F.openFreeAgency(f).ok); F.finishFreeAgency(f);
  let declined = 0, eligible = 0;
  for (const club of E.allClubs(f)) for (const m of E.rosterOf(f, club)) {
    if (!E.extensionEligible(f, m)) continue; eligible++;
    const neg = E.negotiation(f, m, club, E.extWindow(f), { peek: true }); if (neg.state !== 'no-talks' || declined >= 3) continue;
    const terms = { salary: Math.round(E.askOf(f, m).salary * 1.3 / 100) * 100, years: E.askOf(f, m).years, bonus: 0 }; const before = JSON.stringify(m.contract);
    const x = E.extend(f, club, m, terms); assert.equal(x.outcome, 'declined', 'even a generous offer: he will not talk in this window'); assert.equal(JSON.stringify(m.contract), before);
    assert.equal(E.extend(f, club, m, terms).outcome, 'declined', 'asking again draws nothing new'); assert.ok(!/ambition/i.test(x.reason)); declined++;
  }
  assert.ok(eligible > 10); assert.ok(declined >= 1);
  // the owner's extensions are the shared engine: F.extendContract is E.extend for the owner's club
  const mine = f.roster.find((m) => E.extensionEligible(f, m) && E.negotiation(f, m, f.club, E.extWindow(f), { peek: true }).state === 'active');
  if (mine) { const r = F.extendContract(f, mine.id, null, { accept: true }); assert.ok(r.ok && r.outcome === 'signed', JSON.stringify(r)); assert.equal(mine.contract.next.salary, r.neg.opening.salary); }
});

test('Nature, Temper, training and development are untouched by the Ambition', () => {
  const f = newFranchise(76); const ms = f.roster.slice(0, 12);
  for (const m of ms) { const p0 = JSON.stringify(personaOf(m)); const c0 = Object.keys(m.attributes).map((k) => pointCost(m, k)).join(); const o0 = monsterOverall(m);
    for (const a of AMBITIONS) { const x = as(m, a); assert.equal(JSON.stringify(personaOf(x)), p0, 'personality (nature-based) unchanged'); assert.equal(Object.keys(x.attributes).map((k) => pointCost(x, k)).join(), c0, 'training cost unchanged'); assert.equal(monsterOverall(x), o0); assert.equal(x.nature, m.nature); } }
  const src = ['../src/franchise/development.js', '../src/franchise/progression.js', '../src/data/aging.js', '../src/franchise/fa-personality.js'].map((p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(src, /ambition/i, 'development, ageing and personality code never reads it');
  assert.equal(ambitionOf({ id: 'x1' }), ambitionFor('x1'));
});

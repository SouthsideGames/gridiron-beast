// Task 7 — the lineup safeguard (owner's final decision, 2026-11-05): before a season starts or a game is played, an owner without a complete
// legal lineup is told which slots are open, why, and what would fix them; nothing is signed, released, generated or moved out of position;
// he may continue deliberately under the unchanged forfeit rule, and saving or reloading neither bypasses nor corrupts the check.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { canPlay } from '../src/data/personnel.js';
import { leagueClubs, clubRoster, isProtected } from '../src/franchise/league-registry.js';
import { releaseFromClub, POOL_WORTH } from '../src/franchise/league.js';
import { monsterOverall } from '../src/data/monsters.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { t7Settle, t7FillToMin } from './t7-support.js';

/** Leave the owner with one healthy CB (CB2 open): the others are hurt for the season. Two AI clubs release a CB each, so the market has
 *  CBs the owner may sign (a monster the owner released himself is locked against him for the league year, and is not offered). */
function openCB(f) {
  const cbs = f.roster.filter((m) => m.position === 'CB'); for (const m of cbs.slice(1)) m.injury = { weeks: 12, name: 'test injury' };
  for (const k of Object.keys(f.lineupManual)) delete f.lineupManual[k];
  // Task 8 M1 (fixture drift): a castoff reaches the owner's market only at the pool grade (POOL_WORTH: OVR 52–60, or 24 and under);
  // Dex CBs are often weaker and older, so they left the league and the market had no CB. Each released CB is chosen within the
  // market grade and made pool-worthy explicitly (aged 24 at most) so he enters the pool, as the scenario needs.
  let n = 0; for (const c of leagueClubs(f).slice().sort()) { const cb = clubRoster(f, c).find((m) => m.position === 'CB' && !isProtected(m) && monsterOverall(m) <= POOL_WORTH.market); if (cb) cb.age = Math.min(cb.age, POOL_WORTH.age); if (cb && releaseFromClub(f, c, cb.id, { year: f.season.year }).ok) n++; if (n >= 2) break; }
  return cbs.slice(1);
}
function toNextSeason(seed) {
  const f = newFranchise(seed);
  for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  t7Settle(f); assert.ok(F.openFreeAgency(f).ok); F.finishFreeAgency(f); assert.ok(F.beginDraft(f).ok);
  for (let g = 0; g < 80 && !f.draft.done; g++) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  t7FillToMin(f); return f;
}

test('a complete lineup progresses normally; an incomplete one is named exactly, with legal fixes only', () => {
  const f = newFranchise(131); assert.ok(F.lineupGate(f).ok, 'a complete lineup passes');
  openCB(f); const g = F.lineupGate(f);
  assert.equal(g.ok, false); assert.deepEqual(g.holes.map((h) => h.slot), ['CB2']); assert.equal(g.holes[0].position, 'CB'); assert.equal(g.holes[0].healthy, 1); assert.ok(g.holes[0].injured >= 1);
  assert.match(g.reason, /CB2 \(CB\)/); assert.match(g.reason, /one position per family/);
  assert.ok((g.fixes.CB || []).length > 0, 'cheapest legal free agents are listed');
  for (const x of g.fixes.CB) assert.equal(F.freeAgentMarket(f).find((y) => y.monster.id === x.id).monster.position, 'CB', 'only CBs are offered for a CB slot');
  assert.equal(canPlay('S', 'CB2'), false, 'a safety may not play CB');
  // the game cannot be played: Sunday is a forfeit and the engine refuses a game
  F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); }
  const m = F.sundayMatchup(f); assert.ok(m.forfeit); assert.equal(F.pregamePreview(f).ok, false, 'the game screen refuses an illegal lineup (the established forfeit rule)');
});

test('signing an eligible monster resolves it; an ineligible one does not; cap and roster limits are reported accurately', () => {
  const f = newFranchise(132); openCB(f);
  const s = F.freeAgentMarket(f).find((x) => x.monster.position === 'S' && !x.monster.injury);
  if (s) { let r = F.negotiateFreeAgent(f, s.monster.id, s.ask); if (r.ok && r.outcome === 'countered') r = F.negotiateFreeAgent(f, s.monster.id, r.counter); assert.equal(F.lineupGate(f).ok, false, 'a safety does not fill CB2'); }
  // cap: with almost no usable cap, the listed CBs say how much more is needed
  const keep = f.deadCap; f.deadCap = (f.deadCap || 0) + Math.max(0, F.freeAgencyCap(f).usable - 1000);
  const g = F.lineupGate(f); assert.ok(g.fixes.CB.every((x) => !x.fits && x.short > 0), 'insufficient cap shown'); f.deadCap = keep;
  // sign a CB within the rules: resolved
  let done = false; for (const x of F.lineupGate(f).fixes.CB) { let r = F.negotiateFreeAgent(f, x.id, { salary: x.ask, years: 1 }); if (r.ok && r.outcome === 'countered') r = F.negotiateFreeAgent(f, x.id, r.counter); if (r.ok && r.outcome === 'signed') { done = true; break; } }
  assert.ok(done, 'a legal CB signed'); assert.ok(F.lineupGate(f).ok, 'the gate re-checks and passes');
  // roster full: the fix says a release is needed first
  const h = newFranchise(133); openCB(h); while (h.roster.length < F.ROSTER_MAX) h.roster.push({ ...h.roster.find((m) => m.position === 'K'), id: `pad${h.roster.length}`, name: `Pad ${h.roster.length}` });
  assert.ok(F.lineupGate(h).fixes.CB.every((x) => x.needsRoomOnRoster));
});

test('season start: the gate stops the season unknowingly starting into forfeits; a deliberate start continues under the forfeit rule; save/load neither bypasses nor corrupts it', () => {
  const f = toNextSeason(134); openCB(f);
  const r = F.startNextSeason(f); assert.equal(r.ok, false); assert.equal(r.code, 'lineup'); assert.deepEqual(r.gate.holes.map((x) => x.slot), ['CB2']);
  const back = Save.importJson(Save.exportJson(f)); const r2 = F.startNextSeason(back); assert.equal(r2.code, 'lineup', 'still checked after a reload');
  assert.ok(!JSON.stringify(back).includes('acceptForfeits'), 'no bypass is saved');
  const year = back.season.year; const ok = F.startNextSeason(back, { acceptForfeits: true }); assert.ok(ok.ok, ok.reason); assert.equal(back.season.year, year + 1, 'a deliberate start is never a dead end');
  // the forfeit rule is unchanged: Sunday's game is a forfeit, recorded as 0-21
  F.autoRunToSunday(back); if (F.isBye(back)) { F.takeBye(back); F.autoRunToSunday(back); }
  const m = F.sundayMatchup(back); assert.ok(m.forfeit); const res = F.forfeitSunday(back); assert.ok(res.ok); assert.equal(back.lastGame.forfeit, true); assert.equal(back.lastGame.oppScore, 21);
});

test('no legal replacement on the market: the owner is told and is not trapped', () => {
  const f = newFranchise(135); openCB(f);
  for (const list of Object.values(f.pool || {})) for (let i = list.length - 1; i >= 0; i--) if (list[i].position === 'CB') list.splice(i, 1);
  f.league.waivers = (f.league.waivers || []).filter((m) => m.position !== 'CB');
  const g = F.lineupGate(f); assert.equal(g.ok, false); assert.equal(g.noLegalReplacement, true); assert.equal((g.fixes.CB || []).length, 0);
  F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); } assert.ok(F.forfeitSunday(f).ok, 'continuing under the forfeit rule is always possible');
});

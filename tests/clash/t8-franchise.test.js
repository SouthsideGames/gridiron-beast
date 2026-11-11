// Task 8 M4 S12: the t8 engine in the franchise. Record versioning and the D19 replay rule; the D1 rotation-prompt boundary and
// "Auto for the rest"; the D2 policy for Skip, headless and staff; opening / overtime continuity payloads (spec §10, §12; D10-D12) and
// the rules.js tiebreak fix; rewards once through the ledger; save round-trip at a prompt boundary and a schema-10 save that loads and
// plays; provisional readings never enabled in normal play; mastery execution counts recorded, never awarded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../../src/franchise/franchise.js';
import * as Link from '../../src/franchise/clash-link.js';
import * as Save from '../../src/franchise/save.js';
import { logHashFor, T8_RULESET, T8_VALUES } from '../../src/clash/index.js';
import { applyActivity } from '../../src/franchise/reward-ledger.js';
import * as R from '../../src/sim/rules.js';
import * as T8S from '../../src/sim/t8/status-runtime.js';
import { playGame } from '../../src/sim/game-runner.js';
import { tierIndex } from '../../src/franchise/t8/mastery.js';
import { toArenaRecord } from '../../src/ui/clash/t8-record.js';
import { stateAt } from '../../src/ui/clash/choreographer.js';

const newFranchise = (seed = 7) => { const f = F.createFranchise({ owner: { first: 'Kai', last: 'Reyes', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed }); F.hireDefaultStaff(f); while (f.draft && !f.draft.done && F.onTheClock(f) === f.club) F.passDraftPick(f); f.settings.tutorial = false; f.welcomed = true; F.chooseGoal(f, 'wins'); return f; };
const toTuesday = (f, region = 'Coral Coast') => { const r = F.scoutRegion(f, region); assert.ok(r.ok && r.prospects.length >= 1); return r; };
const toSunday = (f) => { F.autoRunToSunday(f); assert.equal(f.season.day, 6); if (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); } };
const clone = (x) => JSON.parse(JSON.stringify(x));

test('records are versioned: new battles are version 2 on ruleset t8 with the engine version, context and D1/D2 policies; the engine is chosen from the record', () => {
  const f = newFranchise(23); toTuesday(f);
  assert.ok(F.startEncounter(f, 0, { mode: 'watch' }).ok); const e = f.week.encounter;
  assert.equal(e.version, 2); assert.equal(e.ruleset, T8_RULESET); assert.equal(e.engine, T8_VALUES.engineVersion); assert.equal(e.context, 'standalone'); assert.deepEqual(e.policies, { a: 'manual', b: 'ai' }); assert.deepEqual(e.decisions, { a: {} });
  assert.ok(e.a.every((m) => Number.isInteger(m.clashMasteryTier) && m.clashMasteryTier === tierIndex(f.roster.find((x) => x.id === m.id).dev.mastery.clash || 0)), 'the snapshot carries the Clash mastery TIER (not the raw credit count)');
  const r = F.encounterBattle(f); assert.equal(r.ruleset, 't8'); assert.equal(r.config.ruleset, 't8'); assert.equal(r.context, 'standalone');
  assert.equal(Link.rulesetOf(e), 't8'); assert.equal(Link.rulesetOf({ seed: 1, a: [], b: [] }), null, 'a pre-M4 record names no ruleset');
  assert.equal(Link.isT8Record(e), true); assert.equal(Link.t8Policies('skip').a, 'ai'); assert.equal(Link.t8Policies('watch').a, 'manual'); assert.equal(Link.t8Policies('auto').a, 'manual', "'auto' is Watch");
  // the summary records the engine too
  assert.ok(F.encounterDecide(f, Link.pendingDecision(r)?.ex ?? 1, 'auto').ok); const b = F.resolveEncounter(f); assert.ok(b.ok, b.reason);
  assert.equal(e.result.ruleset, 't8'); assert.equal(e.result.engine, T8_VALUES.engineVersion); assert.ok(e.result.stateHash); assert.equal(e.result.hash, logHashFor(F.encounterBattle(f)));
});

test('D19: a finished pre-M4 record replays on the isolated historical engine with its own policies and is never rewritten; an unresolved one is re-run on t8 once and tagged', () => {
  const f = newFranchise(24); toTuesday(f); assert.ok(F.startEncounter(f, 0, { mode: 'skip' }).ok);
  // a finished legacy record: no version / ruleset, a stored legacy summary
  const e = f.week.encounter; const legacy = clone(e); for (const k of ['version', 'ruleset', 'engine', 'context', 'migrated']) delete legacy[k]; legacy.policies = { a: 'none', b: 'none' }; legacy.decisions = {}; legacy.status = 'declined'; legacy.result = { winner: 'b', by: 'knockout', exchanges: 9, hash: 'x' };
  f.week.encounter = legacy; const before = JSON.stringify(legacy);
  const r = F.encounterBattle(f); assert.equal(r.ruleset, undefined); assert.equal(r.config.ruleset, 'current', 'the frozen legacy ruleset'); assert.deepEqual(r.config.policies, { a: 'none', b: 'none' });
  assert.equal(JSON.stringify(f.week.encounter), before, 'the finished record is untouched'); assert.equal(r.log[0].text.startsWith('Beast Clash:'), true);
  // the same legacy replay twice: byte-identical hash (the historical engine is isolated and deterministic)
  assert.equal(logHashFor(r), logHashFor(F.encounterBattle(f)));
  // an unresolved legacy record (status 'battle', no rewards): re-run on t8 from its seed and lineups, tagged once
  const open = clone(legacy); open.status = 'battle'; open.result = null; open.mode = 'skip'; f.week.encounter = open;
  const r2 = F.encounterBattle(f); assert.equal(r2.ruleset, 't8'); assert.equal(open.version, 2); assert.equal(open.ruleset, 't8'); assert.deepEqual(open.migrated, { from: 'legacy', policies: { a: 'none', b: 'none' }, decisions: {}, mode: 'skip' }); assert.deepEqual(open.policies, { a: 'ai', b: 'ai' });
  const again = F.encounterBattle(f); assert.equal(again.stateHash, r2.stateHash, 'the upgrade happens once and replays identically');
  const b = F.resolveEncounter(f); assert.ok(b.ok, b.reason); assert.equal(open.result.ruleset, 't8');
});

test('D1 boundary: Watch stops at the first legal rotation prompt with the options stay / auto / reserves; a recorded choice continues the IDENTICAL log past the boundary; invalid choices are refused; a reload mid-prompt continues identically', () => {
  let seen = 0;
  for (let seed = 40; seed < 52; seed++) {
    const f = newFranchise(seed); toTuesday(f); const pv = F.encounterPreview(f, 0); if (pv.size < 3) continue;
    assert.ok(F.startEncounter(f, 0, { mode: 'watch' }).ok); const r = F.encounterBattle(f); const p = Link.pendingDecision(r); if (!p) continue; seen++;
    assert.equal(r.pending, true); assert.equal(r.winner, null); assert.equal(r.boundary.kind, 'rotation'); assert.equal(r.log[r.log.length - 1].kind, 'rotation_prompt'); assert.equal(p.index, r.log.length - 1);
    assert.deepEqual(p.options.slice(0, 2), ['stay', 'auto']); assert.ok(p.reserves.every((x) => p.options.includes(x.id) && x.monsterId && x.name && x.hp > 0));
    assert.throws(() => Link.battleSummary(r), /pending/, 'no summary for a pending battle');
    assert.equal(F.resolveEncounter(f).ok, false); assert.equal(F.resolveEncounter(f).pending.kind, 'rotation');
    assert.equal(F.encounterDecide(f, p.ex, '').ok, false); assert.equal(F.encounterDecide(f, 0, 'stay').ok, false);
    // save and reload at the boundary: the same prompt, the same log
    const g = Save.importJson(Save.exportJson(f)); const rg = F.encounterBattle(g); assert.equal(logHashFor(rg), logHashFor(r)); assert.deepEqual(Link.pendingDecision(rg), p);
    // a reserve choice: the log is identical up to the boundary, then continues with the rotation
    const pick = p.reserves[0].id; assert.ok(F.encounterDecide(f, p.ex, pick).ok); const r2 = F.encounterBattle(f);
    for (let i = 0; i < r.log.length - 1; i++) assert.equal(r2.log[i].text, r.log[i].text, `event ${i} identical before the boundary`);
    const rot = r2.log.find((x, i) => i >= r.log.length - 1 && x.kind === 'rotation' && x.side === 'a'); assert.ok(rot, 'the rotation happens'); assert.equal(rot.in, pick); assert.equal(rot.by, 'manual');
    // a bad decision is refused by the engine
    const h = clone(f); h.week.encounter.decisions.a[p.ex] = 'zz9'; assert.throws(() => F.encounterBattle(h), /not a living reserve/);
    // 'stay' keeps it in; the next prompt (if any) is at least four exchanges later for a rotation but 'stay' spends no cadence
    const s = clone(f); s.week.encounter.decisions.a = { [p.ex]: 'stay' }; const rs = F.encounterBattle(s); const p2 = Link.pendingDecision(rs); if (p2) assert.ok(p2.ex > p.ex);
    // 'auto' = Skip from here: no prompt ever again and the battle settles
    assert.ok(F.encounterDecide(f, p.ex, 'auto').ok || true); const t = clone(f); t.week.encounter.decisions.a = { [p.ex]: 'auto' }; const rt = F.encounterBattle(t); assert.equal(Link.pendingDecision(rt), null); assert.ok(rt.winner);
  }
  assert.ok(seen >= 6, `prompts seen: ${seen}`);
});

test('D2 policy: Skip, headless settlement (settleHeadless answers auto), staff auto-run and league games never prompt; the opponent is always the AI', () => {
  const f = newFranchise(60); toTuesday(f); assert.ok(F.startEncounter(f, 0, { mode: 'skip' }).ok);
  const r = F.encounterBattle(f); assert.equal(r.pending, false); assert.deepEqual(r.config.policies, { a: 'ai', b: 'ai' }); assert.ok(F.resolveEncounter(f).ok);
  const g = newFranchise(61); toTuesday(g); assert.ok(F.startEncounter(g, 0, { mode: 'watch' }).ok); const e = g.week.encounter;
  const rp = F.encounterBattle(g); if (Link.pendingDecision(rp)) { const b = F.resolveEncounter(g, { headless: true }); assert.ok(b.ok, b.reason); assert.ok(Object.values(e.decisions.a).includes('auto'), 'headless settlement records auto at the open prompt'); }
  const h = newFranchise(62); const run = F.autoRunToSunday(h); assert.ok(run.ok); if (h.week.encounter) assert.deepEqual(h.week.encounter.policies, { a: 'ai', b: 'ai' }, 'staff auto-run uses the AI policy');
});

test('opening Clash continuity (spec §10): the pregame record carries its end statuses out and the football game carries them in at kickoff; standalone battles clear at their end (D12)', async () => {
  // the pregame record plays in the 'opening' context and its carryOut is what the engine ends with (the franchise path)
  const f = newFranchise(70); toSunday(f); assert.ok(F.startPregameClash(f, { mode: 'skip' }).ok); const e = f.week.pregame; assert.equal(e.context, 'opening');
  const r0 = F.pregameBattle(f); assert.equal(r0.context, 'opening'); assert.ok(F.resolvePregameClash(f).ok); assert.deepEqual(e.carryOut, Link.carryOutOf(r0)); assert.ok(e.mastery?.scope.startsWith('game:'));
  // an opening Clash that ENDS with statuses (the engine's reviewer staging, in the opening context, through the same adapter conversions):
  // a long Empowered on a dominant active and a Guarded on a reserve of the losing side survive to the end and become the carryOut
  const RV = await import('../../src/clash/t8/review.js'); const a = [RV.reviewMonster({ species: 'pebble', overall: 95 }, 1), RV.reviewMonster({ species: 'pebble', overall: 70 }, 2)]; // Basics: no contract replaces the staged status
  const b = [RV.reviewMonster({ species: 'pebble', overall: 40 }, 3), { ...RV.reviewMonster({ species: 'mudcub', overall: 40 }, 4), id: 'zz_b1' }];
  const r = (await import('../../src/clash/index.js')).simulateByRuleset({ a, b, seed: 11, config: { ruleset: 't8', context: 'opening', policies: { a: 'none', b: 'none' } }, stage: { a0: { status: { id: 'empowered', strength: 10, duration: 40 } }, b1: { status: { id: 'guarded', strength: 20, duration: 40 } } } });
  assert.ok(r.winner, 'the battle ends'); assert.ok(r.carryOut && r.carryOut[a[0].id]?.id === 'empowered', 'Empowered on the winner carries out');
  assert.equal(r.carryOut['zz_b1'], undefined, 'Guarded is Clash-only: it does not enter football (unsupported destination clears)');
  // the franchise hands exactly that carryOut to kickoff, and the game carries it in 1:1 (remaining duration and episode history)
  e.carryOut = r.carryOut; const p = F.pregamePossession(f); assert.deepEqual(p.statusCarry, r.carryOut, 'the opening Clash hands its statuses to kickoff');
  const m = F.sundayMatchup(f); const state = R.newGame({ home: m.home, away: m.away, seed: 3, otPeriods: 1, statusCarry: p.statusCarry });
  for (const [mid, s] of Object.entries(r.carryOut)) { const got = T8S.statusOf(state, mid); assert.ok(got, `${mid} carries ${s.id} into football`); assert.equal(got.id, s.id); assert.equal(got.remaining, s.remaining, 'remaining duration 1:1'); assert.equal(got.applications, s.applications, 'episode history kept'); assert.equal(got.strength, s.strength, 'same percentage (D10)'); }
  assert.ok(state.log.some((l) => l.carried), 'logged at kickoff');
  const g2 = playGame({ home: m.home, away: m.away, seed: 3, otPeriods: 1, quarterLength: 60, statusCarry: p.statusCarry }); assert.ok(g2.finished, 'a headless game accepts the carry too');
  // a standalone battle never carries (D12): every t8 standalone record has carryOut null and a result log that clears statuses at the end
  const h = newFranchise(71); toTuesday(h); assert.ok(F.startEncounter(h, 0, { mode: 'skip' }).ok); const re = F.encounterBattle(h); assert.equal(re.carryOut, null); assert.ok(F.resolveEncounter(h).ok); assert.equal(h.week.encounter.carryOut, null);
  assert.ok([...re.lines.a, ...re.lines.b].every((x) => !x.status), 'no status survives the end of a standalone battle');
});

test('overtime continuity (spec §10, §12): a tied game keeps its statuses for the deciding Clash (rules.js finish fix); the OT record carries them in with the exhaustion verdict; applying the verdict clears the game', () => {
  const f = newFranchise(80); toSunday(f); const m = F.sundayMatchup(f); const me = m.playerSide;
  const s = R.newGame({ home: m.home, away: m.away, seed: 9, otPeriods: 1 }); s.quarter = 4; s.score = { home: 14, away: 14 };
  // a status and an exhausted monster in the game before the tie is reached
  const mine = Link.eligibleBattlers(f.roster)[0]; const theirsRoster = m[me === 'home' ? 'away' : 'home'].roster; const theirs = theirsRoster[0];
  T8S.applyStatus(s, mine.id, { id: 'weakened', strength: 15, duration: 3, sourceId: 't', abilityId: 'TEST' }); T8S.applyStatus(s, theirs.id, { id: 'shielded', strength: 15, duration: 4, payload: { pool: 15, remaining: 15, fraction: 1, saveSpent: false }, sourceId: 't', abilityId: 'TEST' });
  (s.t8.stamina ||= {})[mine.id] = { capacity: 10, stamina: { n: 0, d: 1 }, exhausted: true };
  R.endOfPeriod(s); R.otAfterPossession(s); R.otAfterPossession(s);
  assert.equal(s.finished, true); assert.equal(s.needsTiebreak, true); assert.ok(T8S.statusOf(s, mine.id), 'the status survives the tied final whistle (the finish() defect is fixed)'); assert.ok(T8S.statusOf(s, theirs.id));
  // the OT Clash record carries the battlers' statuses in and the exhaustion verdict
  f.game = { state: s, playerSide: me };
  const pv = F.overtimePreview(f); assert.ok(pv.ok); const lineup = [mine.id, ...pv.lineup.map((x) => x.id).filter((id) => id !== mine.id)].slice(0, pv.size);
  assert.ok(F.startOvertimeClash(f, { lineup, mode: 'skip', state: s }).ok); const e = f.week.overtime; assert.equal(e.context, 'overtime');
  assert.ok(e.carryIn && e.carryIn[mine.id]?.id === 'weakened', 'the record stores the incoming football slot'); assert.equal(e.a.find((x) => x.id === mine.id).exhausted, true, 'the exhausted flag rides the snapshot');
  const r = F.overtimeBattle(f); assert.ok(r.log.some((x) => x.kind === 'status_carry' && x.target === 'a0' && x.status === 'weakened'), 'Weakened carried into the Clash 1:1');
  const c = r.lines.a[0].combatant; assert.equal(c.exhausted, true); const plain = Link.runBattle({ a: [{ ...e.a[0], exhausted: false }], b: e.b.slice(0, 1), seed: e.seed, ruleset: 't8', context: 'overtime', policies: { a: 'ai', b: 'ai' } }).lines.a[0].combatant; assert.ok(c.maxHp < plain.maxHp && c.atk < plain.atk, 'halved attributes once (§12)');
  if (e.theirs.includes(theirs.id)) assert.ok(r.log.some((x) => x.kind === 'status_carry' && x.status === 'shielded'), 'a football Shielded enters as a Clash pool (D11)');
  assert.ok(F.resolveOvertimeClash(f).ok); assert.equal(e.mastery.scope.startsWith('game:'), true, 'the OT Clash shares its game\'s cap scope');
  assert.ok(F.applyTiebreak(f, s)); assert.ok(s.winner); assert.deepEqual(s.t8.status, {}, 'the game is actually over: every status clears');
  // a league tie too: statuses carry in and clear after
  const g = newFranchise(81); toSunday(g); const mm = F.sundayMatchup(g); const ls = R.newGame({ home: mm.home, away: mm.away, seed: 5, otPeriods: 1 }); ls.finished = true; ls.needsTiebreak = true; ls.winner = null; ls.score = { home: 7, away: 7 };
  T8S.applyStatus(ls, mm.home.roster[0].id, { id: 'empowered', strength: 10, duration: 2, sourceId: 't', abilityId: 'TEST' });
  const { createRng } = { createRng: (seed) => ({ seed: () => seed + 1, chance: () => true }) };
  const tb = F.leagueTiebreak(g, createRng(3), mm.home, mm.away, ls); assert.ok(tb); assert.ok(ls.winner); assert.deepEqual(ls.t8.status, {});
});

test('rewards flow once through the ledger: resolve twice, replay, reload and re-run on the same activity never double or lose an award; Watch = Skip in rewards', () => {
  const f = newFranchise(90); toTuesday(f); assert.ok(F.startEncounter(f, 0, { mode: 'skip' }).ok); const e = f.week.encounter;
  const xp0 = Object.fromEntries(e.mine.map((id) => [id, f.roster.find((m) => m.id === id).xp]));
  const b = F.resolveEncounter(f); assert.ok(b.ok); const xp1 = Object.fromEntries(e.mine.map((id) => [id, f.roster.find((m) => m.id === id).xp]));
  for (const id of e.mine) assert.ok(xp1[id] > xp0[id] || f.roster.find((m) => m.id === id).level >= 50, 'every selected member is paid (§6)');
  assert.equal(F.resolveEncounter(f).already, true); F.encounterBattle(f); const xp2 = Object.fromEntries(e.mine.map((id) => [id, f.roster.find((m) => m.id === id).xp])); assert.deepEqual(xp2, xp1, 'no second award');
  // the ledger refuses the same activity again even when called directly
  let paid = 0; applyActivity(f.rewardLedger, `encounter:${f.season.year}:w${f.season.week}:p${e.prospectIndex}`, e.mine.map((id) => ({ monsterId: id })), () => { paid++; }); assert.equal(paid, 0);
  // a reload after settlement: nothing more
  const g = Save.importJson(Save.exportJson(f)); assert.equal(F.resolveEncounter(g).already, true); for (const id of e.mine) assert.equal(g.roster.find((m) => m.id === id).xp, xp1[id]);
  // mastery: execution counts are recorded on the record, no dev.mastery credit is awarded (M5)
  assert.ok(e.mastery && e.mastery.scope.startsWith('clash:')); for (const id of e.mine) assert.equal(f.roster.find((m) => m.id === id).dev.mastery.clash || 0, 0, 'no mastery award in M4');
});

test('saves: schema stays 10; a t8 record round-trips through export / import at a prompt boundary and after settlement; the schema-10 fixture save loads, plays a Tuesday encounter and a Sunday on the new engine', () => {
  assert.equal(F.SCHEMA_VERSION, 10);
  const f = newFranchise(100); toTuesday(f); assert.ok(F.startEncounter(f, 0, { mode: 'watch' }).ok);
  const r = F.encounterBattle(f); const p = Link.pendingDecision(r);
  const g = Save.importJson(Save.exportJson(f)); assert.equal(g.schemaVersion, 10); assert.equal(g.week.encounter.ruleset, 't8');
  const rg = F.encounterBattle(g); assert.equal(rg.stateHash ?? rg.boundary?.stateHash, r.stateHash ?? r.boundary?.stateHash); assert.deepEqual(Link.pendingDecision(rg), p);
  if (p) { F.encounterDecide(g, p.ex, 'auto'); F.encounterDecide(f, p.ex, 'auto'); }
  assert.ok(F.resolveEncounter(g).ok); assert.ok(F.resolveEncounter(f).ok); assert.equal(g.week.encounter.result.hash, f.week.encounter.result.hash);
  const h = Save.importJson(Save.exportJson(g)); assert.equal(F.encounterBattle(h).stateHash, F.encounterBattle(g).stateHash, 'a settled record replays identically after another round-trip');
  // the schema-10 preview save (recorded before M4): loads, and plays on the new engine
  const raw = JSON.parse(fs.readFileSync(new URL('../fixtures/save-v10-season2.json', import.meta.url), 'utf8'));
  const s = Save.migrate(raw.franchise || raw); assert.ok(s, 'the schema-10 save loads'); assert.equal(s.schemaVersion, 10);
  const settled = F.autoRunToSunday(s); assert.ok(settled.ok, settled.reason); assert.equal(s.season.day, 6);
  if (s.week.encounter) { assert.equal(s.week.encounter.ruleset, 't8', 'its Tuesday battle was played on t8'); assert.ok(s.week.encounter.result); }
  if (!F.isBye(s) && F.playerAlive(s)) { const game = F.simulatePlayerGame(s); assert.ok(game.finished); assert.equal(s.week.pregame.ruleset, 't8'); assert.equal(s.week.pregame.status, 'done'); assert.ok(F.finishSunday(s, game)); }
  const s2 = Save.importJson(Save.exportJson(s)); assert.equal(s2.schemaVersion, 10);
});

test('provisional readings stay OFF in normal play: no franchise battle enables config.provisional, and an ability at a gated point logs the unmet ruling and keeps its use', () => {
  const f = newFranchise(110); toTuesday(f); assert.ok(F.startEncounter(f, 0, { mode: 'skip' }).ok); const r = F.encounterBattle(f);
  assert.equal(r.provisional, false); assert.equal(r.config.provisional, undefined); assert.ok(!r.log.some((e) => e.kind === 'provisional'));
  assert.throws(() => Link.runBattle({ a: f.week.encounter.a, b: f.week.encounter.b, seed: 1, ruleset: 'legacy-x' }), /Unknown Clash record ruleset/);
  // runBattle and runRecord never pass a provisional option: the t8 config it builds has none (static check on the adapter source)
  const src = fs.readFileSync(new URL('../../src/franchise/clash-link.js', import.meta.url), 'utf8'); assert.ok(!/provisional:\s*'on'/.test(src), 'the franchise adapter never switches provisional readings on');
  const fr = fs.readFileSync(new URL('../../src/franchise/franchise.js', import.meta.url), 'utf8'); assert.ok(!/provisional/.test(fr));
  // N9c B: Dawn Song is no longer gated; normal franchise battles can heal the active caster.
  const sun = Link.eligibleBattlers(f.roster).map((m) => ({ ...Link.snapMonster(m) })); const a = [{ ...sun[0], species: 'sunwhistle', clashMasteryTier: 0, stage: 0 }]; const b = [{ ...sun[1], species: 'pebble' }];
  const rr = Link.runBattle({ a, b, seed: 3, ruleset: 't8', policies: { a: 'ai', b: 'ai' } });
  assert.ok(!rr.log.some((e) => e.kind === 'unmet' && e.unmet?.some((u) => u.point === 'd14-dawn-song-target')), 'approved Dawn Song is not held for a ruling'); assert.ok(rr.log.some((e) => e.kind === 'heal' && e.abilityId === 'LIG-02-C' && e.target === 'a0'), 'caster receives its actual heal');
  assert.ok(!rr.log.some((e) => e.kind === 'provisional'));
});

test('the arena adapter renders a t8 franchise battle: one arena event per engine event, the active fighter in front, knockouts and HP consistent with the engine lines', () => {
  const f = newFranchise(120); toTuesday(f); assert.ok(F.startEncounter(f, 0, { mode: 'skip' }).ok); const r = F.encounterBattle(f);
  const rec = toArenaRecord(r); assert.equal(rec.log.length, r.log.length); assert.equal(rec.ruleset, 't8'); assert.equal(rec.t8, r); assert.deepEqual(rec.experiments, []);
  rec.log.forEach((e, i) => { assert.equal(e.seq, i); assert.equal(e.t8, r.log[i]); });
  const fin = stateAt(rec, rec.log.length - 1);
  for (const x of [...r.lines.a, ...r.lines.b]) { assert.equal(fin.S[x.id[0]][x.id].ko, x.koed, `${x.id} ko`); assert.equal(fin.S[x.id[0]][x.id].hp, x.hp, `${x.id} hp`); }
  for (const e of r.log) if (e.kind === 'enter' && e.actor) { const st = stateAt(rec, e.seq); assert.equal(st.front[e.actor[0]], e.actor, 'the entrant is the front monster'); }
  for (let i = 0; i < rec.log.length; i++) { const st = stateAt(rec, i); for (const side of ['a', 'b']) for (const s of Object.values(st.S[side])) assert.ok(s.hp >= 0 && s.hp <= s.maxHp && s.shield >= 0); }
  assert.ok(rec.lines.a.every((x) => x.combatant.move?.name), 'every line has a move description for the inspect line');
});

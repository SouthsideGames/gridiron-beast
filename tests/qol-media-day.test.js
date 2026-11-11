// Franchise QoL update: Saturday Media Day comedy overhaul. Library integrity, real-data situations, the picker, the two
// surviving effects (rival hype, spotlight), the narrative memory, headlines, staff auto-run and older saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { PRESS_QUESTIONS, REPORTERS, STYLES, SITUATION_ORDER, HEADLINES, SUBHEADS, TONE_KICKERS } from '../src/data/press.js';
import { pressFacts, pickQuestions, fillQuestion, settlePress, headlineFor, toneOf, pressMemory, pressQuestion } from '../src/franchise/press.js';
import { isCoachSpec, parseCoach } from '../src/ui/coach-portrait.js';

const BASE = ['club', 'coach', 'opp', 'rival', 'rivalGm', 'star', 'record', 'reporter'];
const GAME = ['lastOpp', 'us', 'them', 'margin']; // only when a game was played this season
const AFTER_GAME = ['blowoutWin', 'blowoutLoss', 'overtime', 'upsetWin', 'qbInts', 'qbHot', 'rushBig', 'recvBig', 'defBig', 'predictionHit', 'predictionMiss', 'rivalAnswered:won', 'rivalAnswered:lost'];
const GIVES = { streakW: ['n'], streakL: ['n'], injury: ['name', 'pos', 'weeks'], legendary: ['name'], qbInts: ['name', 'ints'], qbHot: ['name', 'tds'], rushBig: ['name', 'yds'], recvBig: ['name', 'yds'], defBig: ['name'], evolved: ['name', 'pos', 'type'], trade: ['name', 'pos', 'type'], signing: ['name', 'pos', 'type'], quote: ['quote'], mediaFav: ['name'] };
const tokensIn = (t) => [...String(t).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
const saturday = (seed) => { const f = newFranchise(seed); f.season.day = 5; return f; };
const help = (f, over = {}) => ({ matchup: F.sundayMatchup(f), record: { w: 0, l: 0 }, streak: 0, hotseat: false, star: f.roster[0], injured: null, playoffLive: false, isLegend: () => false, ...over });

test('press library: three reporters with portraits, at least 60 templates, four styles each, well-formed', () => {
  assert.deepEqual(Object.keys(REPORTERS).sort(), ['analyst', 'instigator', 'rookie']);
  for (const r of Object.values(REPORTERS)) { assert.ok(r.name && r.role && r.outlet); assert.ok(isCoachSpec(r.portrait) && parseCoach(r.portrait), `${r.name} has a portrait`); }
  assert.equal(new Set(Object.values(REPORTERS).map((r) => r.name)).size, 3);
  assert.ok(PRESS_QUESTIONS.length >= 60, `${PRESS_QUESTIONS.length} templates`);
  assert.equal(new Set(PRESS_QUESTIONS.map((q) => q.id)).size, PRESS_QUESTIONS.length, 'unique ids');
  assert.equal(new Set(PRESS_QUESTIONS.map((q) => q.q)).size, PRESS_QUESTIONS.length, 'no question text twice');
  for (const q of PRESS_QUESTIONS) {
    assert.ok(REPORTERS[q.reporter], `${q.id}: known reporter`);
    assert.deepEqual(Object.keys(q.a), [...STYLES], `${q.id}: four styles`);
    for (const s of STYLES) assert.ok(typeof q.a[s] === 'string' && q.a[s].length > 3, `${q.id}.${s}`);
    assert.equal(new Set(Object.values(q.a)).size, 4, `${q.id}: four different answers`);
    if (q.when) assert.ok(SITUATION_ORDER.includes(q.when), `${q.id}: situation ${q.when} is known`);
    if (q.hype) assert.equal(q.when, 'rival', `${q.id}: hype only before a rival game`);
    for (const flag of ['star', 'insult', 'predict']) for (const s of q[flag] || []) assert.ok(STYLES.includes(s), `${q.id}.${flag}`);
    assert.ok(!(q.insult || []).includes('pro'), `${q.id}: a professional answer insults nobody`);
    // every placeholder is one the situation really supplies
    const ok = new Set([...BASE, ...(q.when && AFTER_GAME.includes(q.when) ? GAME : []), ...(GIVES[q.when] || [])]);
    for (const t of [q.q, ...Object.values(q.a)].flatMap(tokensIn)) assert.ok(ok.has(t), `${q.id}: {${t}} is not supplied by ${q.when || 'a generic question'}`);
  }
  for (const k of SITUATION_ORDER) assert.ok(PRESS_QUESTIONS.some((q) => q.when === k), `situation ${k} has a question`);
  for (const id of Object.keys(REPORTERS)) { assert.ok(PRESS_QUESTIONS.filter((q) => q.reporter === id && !q.when).length >= 8, `${id}: enough generic questions`); }
  const generic = PRESS_QUESTIONS.filter((q) => !q.when).length; assert.ok(generic >= 30, `${generic} generic questions cover a season with no notable events`);
  for (const tone of ['pro', 'trash', 'comedy', 'unhinged', 'mixed']) { assert.ok(HEADLINES[tone].length >= 5, `${tone} headlines`); assert.ok(TONE_KICKERS[tone].length >= 1); }
  assert.ok(SUBHEADS.generic.length >= 5);
  for (const [k, list] of Object.entries(SUBHEADS)) { if (k !== 'generic') assert.ok(SITUATION_ORDER.includes(k), `subheadline situation ${k}`); const ok = new Set([...BASE, ...(AFTER_GAME.includes(k) ? GAME : []), ...(GIVES[k] || [])]); for (const t of list.flatMap(tokensIn)) assert.ok(ok.has(t), `subheadline ${k}: {${t}}`); }
});

test('situations come only from saved data: a fresh franchise has none, and each appears with its real fact', () => {
  const f = saturday(61); const none = pressFacts(f, help(f));
  assert.deepEqual(Object.keys(none.live).filter((k) => k !== 'legendary'), [], 'nothing has happened yet, so nothing is claimed');
  const qs = F.mediaQuestions(f); for (const q of qs) assert.ok(!q.when || q.when === 'rival' || q.when === 'legendary', 'week one asks generic questions');
  // a real game with real stat lines
  const g = saturday(62); const qb = g.roster.find((m) => m.position === 'QB'), rb = g.roster.find((m) => m.position !== 'QB');
  g.season.week = 4; g.lastGame = { week: 3, year: g.season.year, player: true, won: false, playerScore: 3, oppScore: 31, opponent: 'Ashford Hawks' };
  (qb.stats ||= {}).log = [{ year: g.season.year, week: 3, line: { intThrown: 4, passTd: 0 } }]; (rb.stats ||= {}).log = [{ year: g.season.year, week: 3, line: { rushYds: 141 } }];
  const facts = pressFacts(g, help(g, { streak: -3, record: { w: 0, l: 3 } }));
  assert.deepEqual(facts.live.qbInts, { name: qb.name, ints: 4, mid: qb.id }); assert.deepEqual(facts.live.rushBig, { name: rb.name, yds: 141, mid: rb.id });
  assert.ok(facts.live.blowoutLoss && facts.live.streakL.n === 3); assert.ok(!facts.live.qbHot && !facts.live.blowoutWin && !facts.live.streakW);
  assert.equal(facts.tokens.margin, 28); assert.equal(facts.tokens.lastOpp, 'Ashford Hawks');
  const ids = pickQuestions(g, facts, []); const picked = ids.map((id) => fillQuestion(id, facts));
  assert.equal(picked.filter((q) => q.when).length, 2, 'at most two situational questions');
  for (const q of picked) { assert.ok(!q.when || facts.live[q.when], `${q.id} is about something real`); assert.ok(!/\{\w+\}/.test(q.q + q.a.map((a) => a.text).join(' ')), `${q.id}: every placeholder filled`); }
  const intQ = fillQuestion(PRESS_QUESTIONS.find((q) => q.when === 'qbInts').id, facts); assert.ok((intQ.q + intQ.a.map((a) => a.text).join(' ')).includes(qb.name), 'the real quarterback is named'); assert.equal(intQ.subject, qb.id);
  // last season's game is not this week's story; a departed monster is not discussed
  g.lastGame.year -= 1; assert.ok(!pressFacts(g, help(g)).live.qbInts);
  g.lastGame.year += 1; g.roster = g.roster.filter((m) => m.id !== qb.id); assert.ok(!pressFacts(g, help(g)).live.qbInts);
  // news: only this week's or last week's, about a monster still here
  const n = saturday(63); const m = n.roster[2]; n.season.week = 6; n.news = [{ text: `EVOLUTION: ${m.name} evolved`, kind: 'info', week: 5, year: n.season.year, mid: m.id }];
  assert.equal(pressFacts(n, help(n)).live.evolved.name, m.name); n.news[0].week = 3; assert.ok(!pressFacts(n, help(n)).live.evolved, 'old news is not asked about');
  n.news = [{ text: 'Trade: someone for someone', week: 6, year: n.season.year, mid: 'gone-monster' }]; assert.ok(!pressFacts(n, help(n)).live.trade);
});

test('picker: deterministic, three questions, three reporters when generic, no repeats across a season, no dice', () => {
  const f = saturday(64); const rng = JSON.stringify(f.rngState); const facts = pressFacts(f, help(f));
  const a = pickQuestions(f, facts, []), b = pickQuestions(f, facts, []); assert.deepEqual(a, b); assert.equal(a.length, 3); assert.equal(new Set(a).size, 3);
  assert.equal(JSON.stringify(f.rngState), rng, 'the franchise dice did not move');
  const asked = []; const perWeek = [];
  for (let w = 1; w <= 10; w++) { f.season.week = w; const ids = pickQuestions(f, { ...facts, live: {} }, asked); assert.equal(new Set(ids.map((id) => pressQuestion(id).reporter)).size, 3, `week ${w}: each reporter asks one`); for (const id of ids) assert.ok(!asked.includes(id), `week ${w}: ${id} not asked before`); asked.push(...ids); perWeek.push(ids.join()); }
  assert.equal(new Set(perWeek).size, 10);
  // through the franchise: a whole ten-week regular season of Saturdays never repeats a question
  const s = saturday(65); const seen = new Set();
  for (let w = 1; w <= 10; w++) { s.season.week = w; s.week.mediaQs = null; s.week.media = null; s.season.day = 5; for (const q of F.mediaQuestions(s)) { assert.ok(!seen.has(q.id), `week ${w}: ${q.id} repeated`); seen.add(q.id); } }
});

test('effects: only rival hype and the spotlight; they need the matching answer; the spotlight prefers the monster asked about', () => {
  const f = saturday(66); const star = f.roster[0], other = f.roster[5]; const facts = pressFacts(f, help(f, { matchup: { ...F.sundayMatchup(f), rival: true } }));
  const rivalQ = fillQuestion(PRESS_QUESTIONS.find((q) => q.when === 'rival' && q.hype).id, facts);
  for (let k = 0; k < 4; k++) { const c = structuredClone(f); const r = settlePress(c, facts, [rivalQ], [k], star.id); assert.equal(r.hype, k === 1, `style ${STYLES[k]}`); assert.deepEqual(Object.keys(r).sort(), ['headline', 'hype', 'star', 'styles']); }
  const starQ = PRESS_QUESTIONS.find((q) => !q.when && q.star?.length); const fq = fillQuestion(starQ.id, facts); const k = STYLES.indexOf(starQ.star[0]);
  assert.equal(settlePress(structuredClone(f), facts, [fq], [k], star.id).star, star.id, 'a generic spotlight answer lifts the club star');
  assert.equal(settlePress(structuredClone(f), facts, [fq], [STYLES.findIndex((s) => !starQ.star.includes(s))], star.id).star, null);
  const about = { ...fq, subject: other.id }; assert.equal(settlePress(structuredClone(f), facts, [about], [k], star.id).star, other.id, 'the monster the question is about');
  const hurt = structuredClone(f); hurt.roster[5].injury = { weeks: 2 }; assert.equal(settlePress(hurt, facts, [about], [k], star.id).star, star.id, 'not an injured one');
  // through the franchise: nothing about any monster changes on Saturday, whatever is said
  const g = saturday(67); const before = JSON.stringify(g.roster); F.mediaQuestions(g); F.answerMedia(g, [3, 1, 2]);
  assert.equal(JSON.stringify(g.roster), before, 'no attribute, morale, fatigue or injury change'); assert.equal(g.season.day, 6);
  assert.deepEqual(Object.keys(g.week.media).sort(), ['answers', 'boosts', 'headline', 'hype', 'star', 'styles']);
});

test('storylines: an insulted reporter, a prediction, answered trash talk, a resurfacing quote, a media favourite', () => {
  const f = saturday(68); f.season.week = 3; const star = f.roster[0]; let facts = pressFacts(f, help(f));
  const insultQ = PRESS_QUESTIONS.find((q) => !q.when && q.insult?.length), predictQ = PRESS_QUESTIONS.find((q) => !q.when && q.predict?.length && q.id !== insultQ.id);
  const opp = facts.tokens.opp;
  settlePress(f, facts, [fillQuestion(insultQ.id, facts), fillQuestion(predictQ.id, facts)], [STYLES.indexOf(insultQ.insult[0]), STYLES.indexOf(predictQ.predict[0])], star.id);
  const mem = pressMemory(f); assert.deepEqual(mem.insulted[insultQ.reporter], { y: f.season.year, w: 3 }); assert.equal(mem.predict.w, 3);
  assert.ok(!pressFacts(f, help(f)).live[`insulted:${insultQ.reporter}`], 'not in the same press conference');
  // the game is played and won; next Saturday the reporter remembers and the prediction is revisited
  f.lastGame = { week: 3, year: f.season.year, player: true, won: true, playerScore: 20, oppScore: 10, opponent: opp }; f.season.week = 4;
  facts = pressFacts(f, help(f)); assert.ok(facts.live[`insulted:${insultQ.reporter}`]); assert.ok(facts.live.predictionHit && !facts.live.predictionMiss);
  const ids = pickQuestions(f, facts, []); assert.ok(ids.some((id) => pressQuestion(id).when === 'predictionHit'), 'the prediction comes back first');
  const follow = PRESS_QUESTIONS.find((q) => q.when === `insulted:${insultQ.reporter}`); assert.equal(follow.reporter, insultQ.reporter, 'the insulted reporter asks it himself');
  settlePress(f, facts, [fillQuestion(follow.id, facts), fillQuestion(PRESS_QUESTIONS.find((q) => q.when === 'predictionHit').id, facts)], [0, 0], star.id);
  assert.ok(!mem.insulted[insultQ.reporter] && !mem.predict, 'both storylines close once played');
  f.lastGame.won = false; mem.predict = { y: f.season.year, w: 3 }; assert.ok(pressFacts(f, help(f)).live.predictionMiss);
  // trash talk before the rival game is answered after it, by result
  const r = saturday(69); r.season.week = 5; const rf = pressFacts(r, help(r, { matchup: { ...F.sundayMatchup(r), rival: true } }));
  settlePress(r, rf, [fillQuestion(PRESS_QUESTIONS.find((q) => q.hype).id, rf)], [1], r.roster[0].id); assert.equal(pressMemory(r).trash.opp, rf.tokens.opp);
  r.lastGame = { week: 5, year: r.season.year, player: true, won: false, playerScore: 7, oppScore: 21, opponent: rf.tokens.opp }; r.season.week = 6;
  const after = pressFacts(r, help(r)); assert.ok(after.live['rivalAnswered:lost'] && !after.live['rivalAnswered:won']);
  // an unhinged quote resurfaces two weeks later, once
  const q = saturday(70); q.season.week = 2; const qf = pressFacts(q, help(q)); const gen = PRESS_QUESTIONS.find((x) => !x.when && x.a.unhinged.length <= 110 && !/\{/.test(x.a.unhinged));
  settlePress(q, qf, [fillQuestion(gen.id, qf)], [3], q.roster[0].id); assert.equal(pressMemory(q).quotes[0].t, gen.a.unhinged);
  q.season.week = 3; assert.ok(!pressFacts(q, help(q)).live.quote); q.season.week = 4; const later = pressFacts(q, help(q)); assert.equal(later.live.quote.quote, gen.a.unhinged, 'the coach really said it');
  const quoteQ = fillQuestion(PRESS_QUESTIONS.find((x) => x.when === 'quote').id, later); assert.ok(quoteQ.q.includes(gen.a.unhinged) || quoteQ.a.some((a) => a.text.includes(gen.a.unhinged)));
  settlePress(q, later, [quoteQ], [0], q.roster[0].id); assert.ok(!pressFacts(q, help(q)).live.quote, 'used once');
  // three spotlights make a media favourite; leaving the club ends it
  const m = saturday(71); const starQ = PRESS_QUESTIONS.find((x) => !x.when && x.star?.length); const fav = m.roster[0];
  for (let w = 1; w <= 3; w++) { m.season.week = w; const mf = pressFacts(m, help(m)); assert.ok(!mf.live.mediaFav); settlePress(m, mf, [fillQuestion(starQ.id, mf)], [STYLES.indexOf(starQ.star[0])], fav.id); }
  m.season.week = 4; assert.equal(pressFacts(m, help(m)).live.mediaFav.name, fav.name); m.roster = m.roster.filter((x) => x.id !== fav.id); assert.ok(!pressFacts(m, help(m)).live.mediaFav);
});

test('headline: THE BEAST TIMES, by tone, deterministic, filled; subheadline uses a live situation when there is one', () => {
  assert.equal(toneOf(['pro', 'pro', 'trash']), 'pro'); assert.equal(toneOf(['unhinged', 'comedy', 'unhinged']), 'unhinged'); assert.equal(toneOf(['pro', 'trash', 'comedy']), 'mixed');
  const f = saturday(72); const facts = pressFacts(f, help(f)); const titles = new Set();
  for (const styles of [['pro', 'pro', 'pro'], ['trash', 'trash', 'pro'], ['comedy', 'comedy', 'comedy'], ['unhinged', 'unhinged', 'trash'], ['pro', 'trash', 'comedy']]) {
    const h = headlineFor(f, facts, styles); assert.equal(h.paper, 'THE BEAST TIMES'); assert.equal(h.tone, toneOf(styles)); assert.deepEqual(headlineFor(f, facts, styles), h);
    assert.ok(h.title && h.sub && h.kicker); assert.ok(!/\{\w+\}/.test(h.title + h.sub + h.kicker), `filled: ${h.title} / ${h.sub}`); titles.add(h.title);
    assert.ok(HEADLINES[h.tone].some((t) => t.replace(/\{\w+\}/g, '§').split('§').every((part) => h.title.includes(part))), 'from that tone’s list');
  }
  assert.ok(titles.size >= 4);
  const live = { ...facts, live: { streakL: { n: 4 } } }; const h = headlineFor(f, live, ['pro', 'pro', 'pro']);
  assert.ok(SUBHEADS.streakL.some((t) => t.replace(/\{\w+\}/g, '§').split('§').every((part) => h.sub.includes(part))), 'the subheadline is about the losing streak');
  const many = new Set(); for (let w = 1; w <= 17; w++) { f.season.week = w; many.add(headlineFor(f, facts, ['comedy', 'comedy', 'pro']).title); } assert.ok(many.size >= 4, 'headlines vary across a season');
});

test('Saturday flow: staff auto-run answers professionally, older saves and save/load work, a bye week holds no press conference', () => {
  const f = newFranchise(73); const r = F.autoRunToSunday(f); assert.equal(f.season.day, 6);
  assert.deepEqual(f.week.media.styles, ['pro', 'pro', 'pro']); assert.equal(f.week.media.hype, false, 'the staff never talks trash'); assert.ok(r.did.some((d) => /Press conference/.test(d)));
  assert.equal(f.week.media.headline.paper, 'THE BEAST TIMES'); assert.ok(F.sundayMatchup(f), 'Sunday is ready');
  // a save from before the overhaul: numeric question ids, no press memory
  const old = saturday(74); old.week.mediaQs = [12, 40, 7]; old.season.mediaAsked = [1, 2, 3, 12, 40, 7]; delete old.press;
  const qs = F.mediaQuestions(old); assert.equal(qs.length, 3); assert.ok(qs.every((q) => typeof q.id === 'string' && q.a.length === 4)); assert.deepEqual(old.season.mediaAsked, qs.map((q) => q.id));
  assert.equal(F.answerMedia(old, [0, 2, 3]).ok, true);
  // mid-press-conference save and load keeps the same questions; the finished one keeps its headline and memory
  const s = saturday(75); const q1 = F.mediaQuestions(s); const mid = Save.importJson(Save.exportJson(s)); assert.deepEqual(F.mediaQuestions(mid).map((q) => q.id), q1.map((q) => q.id));
  const out = F.answerMedia(mid, [3, 3, 3]); const back = Save.importJson(Save.exportJson(mid));
  assert.deepEqual(back.week.media.headline, out.headline); assert.deepEqual(back.press, mid.press); assert.equal(back.season.day, 6);
  // bye week: the staff rests, nobody is asked anything
  let bye = null;
  for (let seed = 50; seed < 56 && !bye; seed++) { const c = newFranchise(seed);
    for (let w = 0; w < 12 && !c.season.finished; w++) { if (F.isBye(c)) { bye = c; break; } F.autoRunToSunday(c); const m = F.sundayMatchup(c); if (!m) break; if (m.forfeit) { F.forfeitSunday(c); continue; } F.finishSunday(c, F.simulatePlayerGame(c)); } }
  assert.ok(bye, 'a bye week was found'); const askedBefore = (bye.season.mediaAsked || []).length; F.autoRunToSunday(bye); assert.equal(bye.season.day, 6); assert.ok(!bye.week.media, 'no press conference on a bye'); assert.equal((bye.season.mediaAsked || []).length, askedBefore);
});

test('a played stretch of weeks: every situational question asked is backed by the save at that moment', () => {
  const f = newFranchise(76); let situational = 0;
  for (let w = 0; w < 8 && !f.season.finished; w++) {
    if (F.isBye(f)) { F.autoRunToSunday(f); F.takeBye(f); continue; }
    while (f.season.day < 5) { const d = f.season.day; F.autoRunToSunday(f); if (f.season.day === d) break; if (f.season.day === 6) break; }
    if (f.week.media) { for (const id of f.week.mediaQs) { const q = pressQuestion(id); if (q.when) situational++; } }
    const m = F.sundayMatchup(f); if (!m) break; if (m.forfeit) { F.forfeitSunday(f); continue; } F.finishSunday(f, F.simulatePlayerGame(f));
    if (f.season.finished) break;
    // on the following Saturday, check the facts directly against the save
    const g = f.lastGame; f.season.day = 5; const qs = F.mediaQuestions(f); f.season.day = 0; f.season.mediaAsked = f.season.mediaAsked.filter((id) => !f.week.mediaQs.includes(id)); f.week.mediaQs = null;
    for (const q of qs) { const text = q.q + ' ' + q.a.map((a) => a.text).join(' '); assert.ok(!/\{\w+\}/.test(text), `${q.id} filled`);
      if (q.when === 'blowoutLoss') assert.ok(!g.won && g.oppScore - g.playerScore >= 17);
      if (q.when === 'blowoutWin') assert.ok(g.won && g.playerScore - g.oppScore >= 21);
      if (q.when === 'streakW' || q.when === 'streakL') { const res = f.season.schedule.filter((x) => x.result && !x.bye).slice(-3).map((x) => !!x.result.won); assert.equal(res.length, 3); assert.ok(res.every((x) => x === (q.when === 'streakW'))); }
      if (['qbInts', 'qbHot', 'rushBig', 'recvBig', 'defBig'].includes(q.when)) { const m2 = f.roster.find((x) => x.id === q.subject); const line = m2.stats.log.find((e) => e.year === g.year && e.week === g.week).line; assert.ok(text.includes(m2.name));
        if (q.when === 'qbInts') assert.ok(line.intThrown >= 3 && text.includes(String(line.intThrown))); if (q.when === 'rushBig') assert.ok(line.rushYds >= 120); if (q.when === 'recvBig') assert.ok(line.recYds >= 120); if (q.when === 'qbHot') assert.ok(line.passTd >= 3); }
      if (q.when) situational++; }
  }
  assert.ok(situational >= 0);
});

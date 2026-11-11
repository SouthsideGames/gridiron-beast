// Saturday Media Day logic (comedy overhaul, owner 2026-11-11). Pure over the franchise save plus a few facts franchise.js passes in.
//   pressFacts     what is really true this week, read from saved data only (results, per-game stat lines, news, roster, history);
//   pickQuestions  three questions: up to two about live situations, the rest generic, spread across the three reporters;
//   fillQuestion   the question and its four answers with the real names and numbers filled in;
//   settlePress    what the chosen answers do: the two approved effects (rival hype, a monster in the spotlight) and the
//                  narrative memory (f.press: an insulted reporter, a prediction, trash talk, a quote, a media favourite);
//   headlineFor    THE BEAST TIMES headline for the three answers.
// Nothing here uses the franchise dice: every choice comes from a hash of the save's seed, year and week, so the same save always
// gets the same press conference and holding one moves no other random number.
import { PRESS_QUESTIONS, REPORTERS, STYLES, SITUATION_ORDER, HEADLINES, SUBHEADS, TONE_KICKERS } from '../data/press.js';

const BY_ID = Object.freeze(Object.fromEntries(PRESS_QUESTIONS.map((q) => [q.id, q])));
export const pressQuestion = (id) => BY_ID[id] || null;
export const PRESS_PER_WEEK = 3;
const MAX_SITUATIONAL = 2;

function hash(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; return (h ^ (h >>> 16)) >>> 0; }
const pick = (list, key) => (list.length ? list[hash(key) % list.length] : null);
const stamp = (f) => `${f.seed}|${f.season.year}|${f.season.week}`;
/** The club's small press history. Narrative only; created on first use, so older saves need no migration. */
export function pressMemory(f) { const p = (f.press ||= {}); p.insulted ||= {}; p.quotes ||= []; p.fav ||= {}; return p; }
const weeksSince = (f, at) => (at ? (f.season.year - at.y) * 100 + (f.season.week - at.w) : Infinity);

/** The player's stat line in the club's most recent game, for each monster still on the roster: [{ m, line }]. */
function lastGameLines(f) {
  const g = f.lastGame; if (!g || !g.player || g.year !== f.season.year) return [];
  const out = [];
  for (const m of f.roster) { const e = (m.stats?.log || []).find((x) => x.year === g.year && x.week === g.week); if (e?.line) out.push({ m, line: e.line }); }
  return out;
}
const best = (rows, key) => rows.reduce((a, b) => ((b.line[key] || 0) > (a?.line[key] || 0) ? b : a), null);
const weeksText = (n) => `${n} week${n === 1 ? '' : 's'}`;

/**
 * Everything that is true about the club this Saturday. `h` (from franchise.js): { matchup, record, streak, hotseat, star,
 * injured (the injured would-be starter, or null), isLegend(m), playoffLive }. Returns { tokens, live } where live[key] is the
 * token set of a situation that is really happening (absent when it is not).
 */
export function pressFacts(f, h) {
  const mem = pressMemory(f); const live = {}; const rec = h.record || { w: 0, l: 0 }; const rv = f.rivals?.[f.tier] || {};
  const tokens = { club: f.club, coach: f.owner?.last || f.owner?.first || 'Coach', opp: h.matchup?.opponent || 'our opponent', rival: rv.team || 'your rival', rivalGm: rv.gm || 'their GM', star: h.star?.name || 'your star', record: `${rec.w}-${rec.l}` };
  const g = f.lastGame && f.lastGame.player && f.lastGame.year === f.season.year ? f.lastGame : null;
  if (g) Object.assign(tokens, { lastOpp: g.opponent, us: g.playerScore, them: g.oppScore, margin: Math.abs(g.playerScore - g.oppScore) });

  if (h.streak >= 3) live.streakW = { n: h.streak }; if (h.streak <= -3) live.streakL = { n: -h.streak };
  if (h.matchup?.rival) live.rival = {};
  if (h.playoffLive) live.playoffs = {};
  else if (f.season.week >= 7 && rec.w + rec.l >= 5 && rec.w >= rec.l) live.playoffRace = {};
  if (f.history?.length && f.history[f.history.length - 1].champion === f.club) live.champion = {};
  if (h.hotseat) live.hotseat = {};
  if (h.injured) live.injury = { name: h.injured.name, pos: h.injured.position, weeks: weeksText(h.injured.injury?.weeks || 1) };
  const legend = f.roster.find((m) => h.isLegend?.(m)); if (legend) live.legendary = { name: legend.name, mid: legend.id };

  if (g) {
    const margin = g.playerScore - g.oppScore;
    if (g.won && margin >= 21) live.blowoutWin = {}; if (!g.won && margin <= -17) live.blowoutLoss = {};
    if (g.ot) live.overtime = {};
    const mine = f.season.records?.[f.club], theirs = f.season.records?.[g.opponent];
    if (g.won && mine && theirs && theirs.w + theirs.l >= 3) { const a = mine.w / Math.max(1, mine.w + mine.l), b = theirs.w / Math.max(1, theirs.w + theirs.l); if (b - a >= 0.25) live.upsetWin = {}; }
    const rows = lastGameLines(f);
    const qbI = best(rows, 'intThrown'); if (qbI && qbI.line.intThrown >= 3) live.qbInts = { name: qbI.m.name, ints: qbI.line.intThrown, mid: qbI.m.id };
    const qbT = best(rows, 'passTd'); if (qbT && qbT.line.passTd >= 3) live.qbHot = { name: qbT.m.name, tds: qbT.line.passTd, mid: qbT.m.id };
    const ru = best(rows, 'rushYds'); if (ru && ru.line.rushYds >= 120) live.rushBig = { name: ru.m.name, yds: ru.line.rushYds, mid: ru.m.id };
    const rc = best(rows, 'recYds'); if (rc && rc.line.recYds >= 120) live.recvBig = { name: rc.m.name, yds: rc.line.recYds, mid: rc.m.id };
    const df = rows.filter((r) => (r.line.sacks || 0) >= 2 || (r.line.int || 0) >= 2 || (r.line.tackles || 0) >= 10).sort((a, b) => ((b.line.sacks || 0) * 3 + (b.line.int || 0) * 4 + (b.line.tackles || 0)) - ((a.line.sacks || 0) * 3 + (a.line.int || 0) * 4 + (a.line.tackles || 0)))[0];
    if (df) live.defBig = { name: df.m.name, mid: df.m.id };
    // storylines that depend on what was said before that game
    if (mem.predict && mem.predict.y === g.year && mem.predict.w === g.week) live[g.won ? 'predictionHit' : 'predictionMiss'] = {};
    if (mem.trash && mem.trash.y === g.year && mem.trash.w === g.week && mem.trash.opp === g.opponent) live[g.won ? 'rivalAnswered:won' : 'rivalAnswered:lost'] = {};
  }
  // roster news of this week and last, for monsters still here (the club's own news log is the record)
  const recent = (f.news || []).filter((n) => n.mid && n.year === f.season.year && f.season.week - n.week <= 1 && f.roster.some((m) => m.id === n.mid));
  const news = (test) => { const n = recent.find(test); if (!n) return null; const m = f.roster.find((x) => x.id === n.mid); return { name: m.name, pos: m.position, type: m.type, mid: m.id }; };
  const evo = news((n) => n.text.startsWith('EVOLUTION:')); if (evo) live.evolved = evo;
  const tr = news((n) => n.text.startsWith('Trade')); if (tr) live.trade = tr;
  const sg = news((n) => n.text.includes('signed as a free agent') || /\bsigned: /.test(n.text)); if (sg) live.signing = sg;
  // the press's own memory
  for (const id of Object.keys(REPORTERS)) if (mem.insulted[id] && weeksSince(f, mem.insulted[id]) >= 1) live[`insulted:${id}`] = {};
  const oldQuote = mem.quotes.find((q) => weeksSince(f, q) >= 2 && !q.used); if (oldQuote) live.quote = { quote: oldQuote.t };
  const fav = Object.entries(mem.fav).filter(([id, n]) => n >= 3 && f.roster.some((m) => m.id === id)).sort((a, b) => b[1] - a[1])[0];
  if (fav) { const m = f.roster.find((x) => x.id === fav[0]); live.mediaFav = { name: m.name, mid: m.id }; }
  return { tokens, live };
}

/** Choose this Saturday's three question ids. `asked` are the ids already used this season. */
export function pickQuestions(f, facts, asked = []) {
  const used = new Set(asked.filter((x) => typeof x === 'string')); const picks = []; const key = stamp(f);
  const fresh = (list) => { const a = list.filter((q) => !used.has(q.id) && !picks.includes(q)); return a.length ? a : list.filter((q) => !picks.includes(q)); };
  for (const k of SITUATION_ORDER) {
    if (picks.length >= MAX_SITUATIONAL) break; if (!facts.live[k]) continue;
    const own = PRESS_QUESTIONS.filter((q) => q.when === k); const pool = own.filter((q) => !used.has(q.id)); // a situation's questions are not repeated in a season
    const q = pick(pool, `sit|${key}|${k}`); if (q) picks.push(q);
  }
  const generic = PRESS_QUESTIONS.filter((q) => !q.when);
  for (let n = 0; picks.length < PRESS_PER_WEEK && n < 6; n++) {
    const have = new Set(picks.map((q) => q.reporter)); const missing = Object.keys(REPORTERS).filter((r) => !have.has(r));
    const pool = fresh(generic.filter((q) => !missing.length || missing.includes(q.reporter)));
    const q = pick(pool, `gen|${key}|${picks.length}|${n}`); if (q) picks.push(q);
  }
  // order: reporters take turns in a stable order for the week
  const order = ['instigator', 'analyst', 'rookie']; const shift = hash(`order|${key}`) % 3;
  return picks.sort((a, b) => ((order.indexOf(a.reporter) + shift) % 3) - ((order.indexOf(b.reporter) + shift) % 3)).map((q) => q.id);
}

const fillText = (t, tokens) => String(t).replace(/\{(\w+)\}/g, (_, k) => (tokens[k] != null ? String(tokens[k]) : k === 'reporter' ? 'you' : `{${k}}`));
/** A question ready to show: text and four answers with real names and numbers, plus what each answer does. */
export function fillQuestion(id, facts) {
  const q = BY_ID[id]; if (!q) return null;
  const tokens = { ...facts.tokens, ...(q.when ? facts.live[q.when] || {} : {}) };
  const rep = REPORTERS[q.reporter];
  return { id: q.id, reporter: rep.id, reporterName: rep.name, when: q.when, q: fillText(q.q, tokens), subject: tokens.mid || null,
    a: STYLES.map((s) => ({ t: s, text: fillText(q.a[s], tokens), ...(q.hype && s === 'trash' ? { hype: true } : {}), ...(q.star?.includes(s) ? { star: true } : {}), ...(q.insult?.includes(s) ? { insult: true } : {}), ...(q.predict?.includes(s) ? { predict: true } : {}) })) };
}

/** Tone of a press conference: the style used at least twice, else 'mixed'. */
export function toneOf(styles) { const n = {}; for (const s of styles) n[s] = (n[s] || 0) + 1; const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0]; return top && top[1] >= 2 ? top[0] : 'mixed'; }
/** THE BEAST TIMES: { paper, title, sub, kicker, tone }. The subheadline is about a real live situation when there is one. */
export function headlineFor(f, facts, styles) {
  const tone = toneOf(styles); const key = `${stamp(f)}|${styles.join(',')}`;
  const caps = { ...facts.tokens, COACH: String(facts.tokens.coach).toUpperCase(), CLUB: String(facts.tokens.club).toUpperCase(), OPP: String(facts.tokens.opp).toUpperCase() };
  const title = fillText(pick(HEADLINES[tone], `head|${key}`), caps);
  const sit = Object.keys(SUBHEADS).find((k) => k !== 'generic' && facts.live[k]); const subKey = sit || 'generic';
  const sub = fillText(pick(SUBHEADS[subKey], `sub|${key}`), { ...facts.tokens, ...(sit ? facts.live[sit] : {}) });
  const kicker = fillText(pick(TONE_KICKERS[tone], `kick|${key}`), facts.tokens);
  return { paper: 'THE BEAST TIMES', title, sub, kicker, tone };
}

/**
 * Settle a press conference. `questions` are the filled questions, `choices` the chosen answer index for each (0..3), `starId`
 * the club's star (the spotlight falls on him unless the question was about another healthy monster on the roster).
 * Returns { hype, star, styles, headline } and updates the narrative memory. No attribute, morale or injury effect is added.
 */
export function settlePress(f, facts, questions, choices, starId) {
  const mem = pressMemory(f); const at = { y: f.season.year, w: f.season.week }; let hype = false, star = null; const styles = [];
  questions.forEach((q, k) => {
    const a = q.a[choices[k]]; if (!a) return; styles.push(a.t);
    if (a.hype) { hype = true; mem.trash = { ...at, opp: facts.tokens.opp }; }
    if (a.star && !star) { const subj = q.subject && f.roster.find((m) => m.id === q.subject && !m.injury); star = subj ? subj.id : starId; }
    if (a.insult) mem.insulted[q.reporter] = { ...at };
    if (a.predict) mem.predict = { ...at, opp: facts.tokens.opp };
    if (a.t === 'unhinged' && a.text.length <= 110) { mem.quotes.push({ t: a.text, ...at }); if (mem.quotes.length > 4) mem.quotes.shift(); }
    // a storyline that has now been played is closed
    if (q.when?.startsWith('insulted:') && !a.insult) delete mem.insulted[q.reporter];
    if (q.when === 'quote') { const used = mem.quotes.find((x) => x.t === facts.live.quote?.quote); if (used) used.used = true; }
    if (q.when === 'mediaFav' && q.subject) mem.fav[q.subject] = 0;
    if ((q.when === 'predictionHit' || q.when === 'predictionMiss') && !a.predict) delete mem.predict;
    if (q.when?.startsWith('rivalAnswered')) delete mem.trash;
  });
  if (star) mem.fav[star] = (mem.fav[star] || 0) + 1;
  for (const id of Object.keys(mem.fav)) if (!f.roster.some((m) => m.id === id)) delete mem.fav[id];
  return { hype, star, styles, headline: headlineFor(f, facts, styles) };
}

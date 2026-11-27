// The player's achievements, kept outside any franchise (GDD §21.4): an
// achievement belongs to the player, not to one save. localStorage is the
// primary copy; inside claude.ai it is mirrored to the per-viewer cloud
// document `achievements`. Each entry remembers the first time it was earned
// (club, league year, difficulty, date), how many franchises have earned it,
// and the cutscene exactly as it played, so the main menu can replay it.

export const ACH_KEY = 'gridiron-beast-achievements';
const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };
let data = null; let mirror = null;
const blank = () => ({ earned: {}, links: {}, disq: {}, achDex: {}, updatedAt: 0 });
// `links` maps an old seed (how pre-v40 entries name a franchise) to the franchise's permanent uid, once linked. Every copy
// merged in later (the cloud's, another device's, a franchise's own list) is read through it, so a seed and its uid never
// count as two franchises (GDD §47.4).
const canon = (d, x) => { for (let i = 0; i < 4 && x != null && d.links?.[String(x)] && d.links[String(x)] !== x; i++) x = d.links[String(x)]; return x; }; // a seed, or a uid replaced by the cloud's (relinkAchievements)
const canonList = (d, fr) => [...new Set((fr || []).map((x) => canon(d, x)))];
function load() {
  if (data) return data;
  try { const raw = storage()?.getItem(ACH_KEY); data = raw ? { ...blank(), ...JSON.parse(raw) } : blank(); } catch { data = blank(); }
  return data;
}
function persist() {
  data.updatedAt = Date.now();
  try { storage()?.setItem(ACH_KEY, JSON.stringify(data)); } catch { /* full or blocked */ }
  if (mirror) { try { mirror(data); } catch { /* ignore */ } }
}
export function achievementsData() { return load(); }
export function setAchievementMirror(fn) { mirror = fn; }
/** Record an achievement for the player. `stamp`: {club, owner, year, difficulty, franchise, scene}. Returns true the first time ever. */
export function recordAchievementGlobal(id, stamp) {
  const d = load(); const e = d.earned[id]; const who = canon(d, stamp.franchise);
  if (!e) { d.earned[id] = { ...stamp, franchise: who, at: Date.now(), count: 1, franchises: [who] }; persist(); return true; }
  if (who != null && !(e.franchises || []).includes(who)) { e.franchises = canonList(d, [...(e.franchises || []), who]); e.count = e.franchises.length; persist(); }
  return false;
}
/** Merge another copy (the cloud's, or a franchise's own list); earliest first-earn wins, franchise lists union (through `links`). */
export function mergeAchievements(other) {
  if (!other?.earned) return; const d = load(); let changed = false;
  for (const [seed, uid] of Object.entries(other.links || {})) if (uid && !d.links?.[seed]) { (d.links ||= {})[seed] = uid; changed = true; }
  for (const k of Object.keys(other.disq || {})) { const c = canon(d, k); if (!(d.disq ||= {})[c]) { d.disq[c] = 1; changed = true; } }
  for (const [fam, e] of Object.entries(other.achDex || {})) { const mine = (d.achDex ||= {})[fam]; if (!mine || (mine.founding && !e.founding)) { d.achDex[fam] = { fr: canon(d, e.fr), founding: !!e.founding }; changed = true; } }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const [id, e] of Object.entries(other.earned)) {
    const mine = d.earned[id];
    if (!mine) { const fr = canonList(d, e.franchises); d.earned[id] = { ...e, franchise: canon(d, e.franchise), ...(e.franchises ? { franchises: fr, count: fr.length } : {}) }; changed = true; continue; }
    const fr = canonList(d, [...(mine.franchises || []), ...(e.franchises || [])]);
    if ((e.at || Infinity) < (mine.at || Infinity)) { d.earned[id] = { ...e, franchise: canon(d, e.franchise), franchises: fr, count: fr.length }; changed = true; }
    else if (!same(fr, mine.franchises || []) || mine.count !== fr.length || canon(d, mine.franchise) !== mine.franchise) { mine.franchises = fr; mine.count = fr.length; mine.franchise = canon(d, mine.franchise); changed = true; }
  }
  if (changed) persist();
}
export function resetAchievements() { data = blank(); persist(); }
/**
 * Eligibility across the account (achievement review 2026-11-26): a franchise a developer shortcut has played is disqualified for
 * good. Its key is kept here (and merged through the cloud like everything else) so that account-wide rows never count its data:
 * its titles do not count toward "with two franchises" and its collected families never enter the achievements' dex.
 */
export function markDisqualified(key) { if (key == null) return; const d = load(); const c = canon(d, key); if ((d.disq ||= {})[c]) return; d.disq[c] = 1; persist(); }
export const isDisqualified = (key) => { const d = load(); return key != null && !!d.disq?.[canon(d, key)]; };
/**
 * The achievements' own record of families collected across the account: written only from eligible franchises (never from the
 * shared Beast Dex, which any franchise, a disqualified or imported one included, feeds). `founding` marks a family that came with a
 * founding roster or the creation draft; it becomes false once the family is acquired in play anywhere.
 */
export function recordAchDex(key, families) {
  if (key == null) return 0; const d = load(); const k = canon(d, key); let n = 0; d.achDex ||= {};
  for (const [fam, founding] of families) { const e = d.achDex[fam]; if (!e) { d.achDex[fam] = { fr: k, founding: !!founding }; n++; } else if (e.founding && !founding) { e.founding = false; e.fr = k; n++; } }
  if (n) persist(); return n;
}
/** Families in the achievements' dex from eligible franchises: { all, played } (played: acquired in play, not founding gifts). */
export function achDexCounts() { const d = load(); const ok = Object.values(d.achDex || {}).filter((e) => !d.disq?.[canon(d, e.fr)]); return { all: ok.length, played: ok.filter((e) => !e.founding).length, ids: Object.keys(d.achDex || {}).filter((id) => !d.disq?.[canon(d, d.achDex[id].fr)]) }; }
/**
 * Older entries name franchises by seed; link the one that belongs to `uid` (GDD §42.3). The link is remembered in `links`
 * so later merges translate the seed too; a seed is replaced by the uid only in entries that list that seed, and an entry
 * that already lists both (a merge before this fix) keeps the uid once, its count corrected. Returns how many entries changed.
 */
export function linkAchievements({ uid, seed }) {
  if (!uid || seed == null) return 0; const d = load(); let n = 0; let linked = false;
  const had = (d.links ||= {})[String(seed)]; if (had && canon(d, had) !== uid) return 0; // a seed already linked is never re-linked to another franchise
  if (!had) { d.links[String(seed)] = uid; linked = true; }
  for (const e of Object.values(d.earned)) {
    const fr = e.franchises || []; if (!fr.includes(seed) && e.franchise !== seed) continue;
    e.franchises = canonList(d, fr); if (e.franchise === seed) e.franchise = uid; if (e.franchises.length) e.count = e.franchises.length; n++;
  }
  if (n || linked) persist(); return n;
}
/**
 * The same franchise known by two uids (a device migrated its own v39 copy, then adopted the cloud copy another device had
 * already uploaded, matched by creation stamp): every record under `from` moves to `to`, and later merges translate `from`
 * too. Returns how many entries changed.
 */
export function relinkAchievements({ from, to }) {
  if (!from || !to || from === to) return 0; const d = load(); d.links ||= {}; let n = 0;
  for (const [k, v] of Object.entries(d.links)) if (v === from) d.links[k] = to;
  d.links[String(from)] = to;
  for (const e of Object.values(d.earned)) { const fr = canonList(d, e.franchises); const who = canon(d, e.franchise); if (JSON.stringify(fr) !== JSON.stringify(e.franchises || []) || who !== e.franchise) { e.franchises = fr; e.franchise = who; if (fr.length) e.count = fr.length; n++; } }
  persist(); return n;
}
/** The achievements one franchise earned, by its permanent uid. */
export function achievementsFor(uid) { const d = load(); return Object.entries(d.earned).filter(([, e]) => (e.franchises || []).includes(uid)).map(([id]) => id); }

// ================================================================ the achievement engine (overhaul 2026-11)
// Definitions live in src/data/achievements.js, the screen and the unlock presentation in the UI; this section holds the logic
// between them (kept in this file so the published game gains no file): the metrics every catalogue row names, the small
// franchise-scope tracker some of them read (f.achTrack), evaluation by trigger, progress for the screen, and the eligibility rule.
// It is event-driven: franchise.js calls in after a game, a Clash, a season and the owner's actions; nothing runs per frame.
// Nothing here changes a game: the tracker is written only from results that already happened and nothing in the game reads it.
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { REG_GAMES } from '../data/league.js';
import { monsterOverall, resolveSpecies, TYPES } from '../data/monsters.js';
import { SPECIES_DEX as SPECIES_DEX_IDS } from '../data/species.js';
import { isArchived } from './lifecycle.js';

export const TRACK_VERSION = 1;
/** The franchise's achievement tracker, created on first use. `from` is when tracking began (the retroactive boundary). */
export function achTrack(f) {
  const t = (f.achTrack ||= { v: TRACK_VERSION, from: { year: f.season?.year || 1, week: f.season?.week || 1 } });
  t.n ||= {}; t.best ||= {}; t.set ||= {}; t.seen ||= [];
  return t;
}
const num = (v) => (Number.isFinite(v) ? v : 0);
/** Count an event once: `key` is the event's own identity (a game's activity id, a battle's), so a replayed event is not counted twice. */
function once(t, key) { if (key == null) return true; if (t.seen.includes(key)) return false; t.seen.push(key); if (t.seen.length > 48) t.seen.shift(); return true; }
export const achAdd = (f, key, n = 1) => { const t = achTrack(f); t.n[key] = num(t.n[key]) + n; return t.n[key]; };
export const achMax = (f, key, v) => { const t = achTrack(f); if (num(v) > num(t.best[key])) t.best[key] = v; return t.best[key]; };
export const achMark = (f, key, sub) => { const t = achTrack(f); (t.set[key] ||= {})[String(sub)] = 1; return Object.keys(t.set[key]).length; };
const cnt = (t, k) => num(t?.n?.[k]); const best = (t, k) => num(t?.best?.[k]); const marks = (t, k) => Object.keys(t?.set?.[k] || {}).length;

/** A finished game of the owner's, as the achievements read it (built by franchise.js from the game state; see gameFacts). */
export function trackGame(f, g, key) {
  const t = achTrack(f); if (!once(t, key ? `g:${key}` : null)) return false;
  achAdd(f, 'games');
  if (g.won) {
    if (!g.home) achAdd(f, 'roadWins'); if (g.opp === 0) achAdd(f, 'shutoutWins'); if (g.playoff) achAdd(f, 'playoffWins');
    if (g.playoff && g.conferenceRound) achAdd(f, 'confTitles');
    achMark(f, 'clubsBeaten', g.oppClub);
    t.n.winRun = cnt(t, 'winRun') + 1; achMax(f, 'winRun', t.n.winRun);
  } else t.n.winRun = 0;
  if (g.defTd) achAdd(f, 'defTd', g.defTd); if (g.krTd) achAdd(f, 'krTd', g.krTd); if (g.fgm) achAdd(f, 'fgm', g.fgm);
  if (g.gymWin) achAdd(f, 'gymWins');
  for (const fam of g.oppFamilies || []) achMark(f, 'faced', fam);
  if (g.lostBadge) achMark(f, 'badgeLost', g.lostBadge);
  if (g.newBadge && t.set.badgeLost?.[g.newBadge]) { achAdd(f, 'badgeRegained'); delete t.set.badgeLost[g.newBadge]; }
  return true;
}
/** The roster as the achievements need to remember it: who was below level 50 here (pruned to the current roster). */
export function trackRoster(f) {
  const t = achTrack(f); const ids = new Set(roster(f).map((m) => String(m.id))); const b = (t.set.below50 ||= {});
  for (const m of roster(f)) if (num(m.level) < 50) b[String(m.id)] = 1;
  for (const id of Object.keys(b)) if (!ids.has(id)) delete b[id];
  const lo = (t.set.ovrMin ||= {}); for (const m of roster(f)) { const k = String(m.id), v = ovr(m); if (lo[k] == null || v < lo[k]) lo[k] = v; } for (const id of Object.keys(lo)) if (!ids.has(id)) delete lo[id];
}
/** A settled Beast Clash of the owner's: occasion 'encounter' | 'pregame' | 'overtime'. */
export function trackClash(f, occasion, s, { key = null, playoff = false, commanded = false, year = null } = {}) {
  const t = achTrack(f); if (!s || !once(t, key ? `c:${key}` : null)) return null;
  const won = s.winner === 'a'; const hp = s.hpShare?.a ?? null;
  achAdd(f, 'clashBattles'); const sy = (t.clashSeason ||= { year, battles: 0, wins: 0 }); if (sy.year !== year) Object.assign(sy, { year, battles: 0, wins: 0 }); sy.battles++;
  if (won) {
    achAdd(f, 'clashWins'); sy.wins++; achAdd(f, occasion === 'encounter' ? 'clashEnc' : occasion === 'pregame' ? 'clashPre' : 'clashOt');
    if (occasion === 'overtime' && playoff) achAdd(f, 'clashPlayoffOt'); if (commanded) achAdd(f, 'clashCommanded');
    t.n.clashRun = cnt(t, 'clashRun') + 1; achMax(f, 'clashRun', t.n.clashRun);
    const close = ACHIEVEMENT_BY_ID.cl_close?.params?.pct, flaw = ACHIEVEMENT_BY_ID.cl_dominant?.params?.pct, quick = ACHIEVEMENT_BY_ID.cl_quick?.params?.ex;
    if (hp != null && close != null && hp < close / 100) achAdd(f, 'clashClose');
    if (hp != null && flaw != null && hp >= flaw / 100) achAdd(f, 'clashFlawless');
    if (quick != null && num(s.exchanges) > 0 && s.exchanges <= quick) achAdd(f, 'clashQuick');
  } else t.n.clashRun = 0;
  return { won };
}

// ---------------------------------------------------------------- metrics
// metric(f, x) → a number (or null: "does not apply now", never earned). x: { trigger, g (game facts), h (a season's history
// entry), live (true unless backfilling), H (helpers from franchise.js: dexCounts, dexFamilyOf, isLegendary, badgesWonThisSeason,
// overCap, rival) }.
const roster = (f) => f.roster || [];
const ovr = (m) => { try { return monsterOverall(m); } catch { return 0; } };
const founding = (m) => (m?.career?.ev || []).some((e) => e.t === 'join' && e.x?.via === 'founding');
/** Reached its final form by evolving with this club (a founding roster already holds single-stage families at their only form). */
const evolvedFinal = (f, m) => { const n = resolveSpecies(m)?.evolution?.length || 0; return n > 0 && (m.stage || 0) >= n && (m.career?.ev || []).some((e) => e.t === 'evolve' && e.c === f.club && Number(e.x?.stage || 0) >= n); };
/** Drafted by this club in a season's draft (the year-0 creation draft that founds the roster is not counted, as in the live check). */
const mineDrafted = (f, m) => !!m?.drafted && m.drafted.club === f.club && num(m.drafted.year) >= 1;
/** Level 50 reached with this club: the monster was seen below 50 on this roster (trackRoster) and is at 50 now. */
/** A family that came with the founding roster or the creation draft (first collected in league year 1, week 1). */
export const foundingFamily = (st) => !!st && Number(st.year) <= 1 && Number(st.week || 1) <= 1;
const playedFamilies = (f) => Object.entries(f.dex?.signed || {}).filter(([, st]) => !foundingFamily(st)).map(([id]) => id);
const trainedTo50 = (f, m) => num(m.level) >= 50 && !!f.achTrack?.set?.below50?.[String(m.id)];
const leagueMine = (h) => Object.values(h?.leagueStats?.[h?.club] || {});
const seasonMax = (k) => (f, x) => (x.h ? Math.max(0, ...leagueMine(x.h).map((p) => num(p[k]))) : null);
const seasonSum = (k) => (f, x) => (x.h ? leagueMine(x.h).reduce((a, p) => a + num(p[k]), 0) : null);
const regGames = (h) => (h?.schedule || []).filter((g) => g.result);
const hist = (f) => f.history || [];
const awardsOf = (h) => Object.entries(h?.awards?.league || {}).filter(([, w]) => w && w.team === h.club);
const ranOf = (arr) => { let run = 0, top = 0; for (const v of arr) { run = v ? run + 1 : 0; top = Math.max(top, run); } return top; };
const g = (fn) => (f, x) => (x.g ? fn(x.g, f, x) : null);
export const METRICS = Object.freeze({
  // the game just played
  g_win_shutout: g((v) => (v.won && v.opp === 0 ? 1 : 0)),
  g_pts: g((v) => v.pts), g_win_margin: g((v) => (v.won ? v.pts - v.opp : 0)), g_ot_win: g((v) => (v.won && v.ot ? 1 : 0)),
  g_comeback: g((v) => (v.won && v.maxDeficit != null ? v.maxDeficit : null)), g_win_no_to: g((v) => (v.won && v.tos === 0 ? 1 : 0)),
  g_win_opp_yards: g((v) => (v.won ? v.oppYards : null)), g_pass_yds: g((v) => v.passYds), g_pass_td: g((v) => v.passTd), g_rush_yds: g((v) => v.rushYds),
  g_rush_td: g((v) => v.rushTd), g_rec_yds: g((v) => v.recYds), g_long_play: g((v) => v.longPlay), g_team_yards: g((v) => v.yards),
  g_team_int: g((v) => v.int), g_team_sacks: g((v) => v.sacks), g_team_tfl: g((v) => v.tfl), g_tackles: g((v) => v.tackles), g_sacks: g((v) => v.playerSacks),
  g_takeaways: g((v) => v.takeaways), g_fg_long: g((v) => v.fgLong), g_fgm: g((v) => v.fgm), g_legend_win: g((v) => (v.won && v.legendInLineup ? 1 : 0)),
  g_loss_by: g((v) => (!v.won && !v.tied ? v.opp - v.pts : null)), g_tiebreak_win: g((v) => (v.won && v.tiebreak ? 1 : 0)),
  g_faced_legend: g((v) => (v.oppLegend ? 1 : 0)), g_legend_playoff_win: g((v) => (v.won && v.playoff && v.legendInLineup ? 1 : 0)),
  g_win_outgained: g((v) => (v.won ? v.oppYards - v.yards : null)), g_beat_old_club: g((v) => (v.won && v.formerClub ? 1 : 0)),
  // tracked counts (franchise scope, from when tracking began; seeded from reliable history where it proves a value)
  t_road_wins: (f) => cnt(f.achTrack, 'roadWins'), t_shutout_wins: (f) => cnt(f.achTrack, 'shutoutWins'), t_games: (f) => cnt(f.achTrack, 'games'),
  t_win_streak: (f) => best(f.achTrack, 'winRun'), t_win_streak_now: (f) => cnt(f.achTrack, 'winRun'), t_clubs_beaten: (f) => Math.max(marks(f.achTrack, 'clubsBeaten'), Object.values(f.campaign?.h2h || {}).filter((r) => r.w >= 1).length),
  t_playoff_wins: (f) => cnt(f.achTrack, 'playoffWins'), t_conf_titles: (f) => cnt(f.achTrack, 'confTitles'), t_def_td: (f) => cnt(f.achTrack, 'defTd'), t_kr_td: (f) => cnt(f.achTrack, 'krTd'), t_fgm: (f) => cnt(f.achTrack, 'fgm'),
  t_gym_wins: (f) => Math.max(cnt(f.achTrack, 'gymWins'), Object.values(f.campaign?.gymWins || {}).reduce((a, b) => a + num(b), 0)), t_badge_regained: (f) => cnt(f.achTrack, 'badgeRegained'),
  t_clash_wins: (f) => cnt(f.achTrack, 'clashWins'), t_clash_battles: (f) => cnt(f.achTrack, 'clashBattles'), t_clash_enc: (f) => cnt(f.achTrack, 'clashEnc'), t_clash_pre: (f) => cnt(f.achTrack, 'clashPre'),
  t_clash_ot: (f) => cnt(f.achTrack, 'clashOt'), t_clash_playoff_ot: (f) => cnt(f.achTrack, 'clashPlayoffOt'), t_clash_commanded: (f) => cnt(f.achTrack, 'clashCommanded'), t_clash_close: (f) => cnt(f.achTrack, 'clashClose'),
  t_clash_quick: (f) => cnt(f.achTrack, 'clashQuick'), t_clash_flawless: (f) => cnt(f.achTrack, 'clashFlawless'), t_clash_streak: (f) => best(f.achTrack, 'clashRun'), t_clash_streak_now: (f) => cnt(f.achTrack, 'clashRun'),
  t_recruits: (f) => cnt(f.achTrack, 'recruits'), t_evolutions: (f) => Math.max(cnt(f.achTrack, 'evolutions'), roster(f).reduce((a, m) => a + (m.career?.ev || []).filter((e) => e.t === 'evolve' && e.c === f.club).length, 0)),
  t_draft_picks: (f) => Math.max(cnt(f.achTrack, 'draftPicks'), roster(f).filter((m) => mineDrafted(f, m)).length), t_top_pick: (f) => Math.max(cnt(f.achTrack, 'topPick'), roster(f).some((m) => mineDrafted(f, m) && m.drafted.overall === 1) ? 1 : 0),
  t_full_scout: (f) => cnt(f.achTrack, 'fullScout'), t_scouts: (f) => cnt(f.achTrack, 'scouts'), t_regions: (f) => marks(f.achTrack, 'regions'),
  t_fa_signed: (f) => Math.max(cnt(f.achTrack, 'faSigned'), roster(f).filter((m) => (m.career?.ev || []).some((e) => e.t === 'join' && (e.x?.via === 'signed' || e.x?.via === 'free_agent') && e.c === f.club)).length),
  t_fa_ovr: (f) => best(f.achTrack, 'faOvr'), t_extensions: (f) => cnt(f.achTrack, 'extensions'), t_hires: (f) => cnt(f.achTrack, 'hires'), t_cap_clean: (f) => cnt(f.achTrack, 'capClean'),
  t_trades: (f) => (f.trades || []).length, t_rival_trades: (f, x) => (f.trades || []).filter((tr) => tr.team && tr.team === x.H?.rival?.(f)).length,
  t_trade_ovr: (f) => Math.max(0, ...(f.trades || []).map((tr) => num(tr.got?.player?.ovr))), t_trade_picks: (f) => Math.max(0, ...(f.trades || []).map((tr) => (tr.got?.picks || []).length)),
  rival_wins: (f, x) => num(f.campaign?.h2h?.[x.H?.rival?.(f)]?.w),
  // the franchise's own record
  c_wins: (f) => num(f.campaign?.wins), c_titles: (f) => num(f.campaign?.titles), c_awards: (f) => num(f.campaign?.awards), c_badges: (f) => Object.keys(f.campaign?.badges || {}).length,
  c_tracks: (f) => Object.values(f.campaign?.tracks || {}).reduce((a, b) => a + num(b), 0), c_unlocked: (f) => Object.keys(f.campaign?.unlocked || {}).length,
  h_seasons: (f) => hist(f).length, h_winning_seasons: (f) => hist(f).filter((h) => h.record?.w > h.record?.l).length, h_winning_run: (f) => ranOf(hist(f).map((h) => h.record?.w > h.record?.l)),
  h_playoffs: (f, x) => hist(f).filter((h) => h.playoffs).length + (x.qualified && !hist(f).some((h) => h.year === f.season?.year) ? 1 : 0), h_title_run: (f) => ranOf(hist(f).map((h) => h.champion && h.champion === h.club)),
  // one season (x.h: the season's history entry; at season end the season just closed, on backfill every past season)
  s_wins: (f, x) => (x.h ? num(x.h.record?.w) : null), s_points: (f, x) => (x.h ? regGames(x.h).reduce((a, s) => a + num(s.result.playerScore), 0) : null),
  s_points_allowed: (f, x) => (x.h && regGames(x.h).length >= REG_GAMES ? regGames(x.h).reduce((a, s) => a + num(s.result.oppScore), 0) : null),
  s_home_unbeaten: (f, x) => { if (!x.h) return null; const home = regGames(x.h).filter((s) => s.home); return home.length && home.length === (x.h.schedule || []).filter((s) => s.home).length && home.every((s) => s.result.won) ? 1 : 0; },
  s_pass_yds: seasonMax('passYds'), s_rush_yds: seasonMax('rushYds'), s_rec_yds: seasonMax('recYds'), s_pass_td: seasonMax('passTd'), s_sacks: seasonMax('sacks'),
  s_team_sacks: seasonSum('sacks'), s_team_int: seasonSum('int'), s_fgm: seasonSum('fgm'),
  s_perfect_kicker: (f, x) => (x.h ? Math.max(0, ...leagueMine(x.h).filter((p) => num(p.fga) > 0 && p.fgm === p.fga && num(p.xpm) === num(p.xpa)).map((p) => num(p.fga))) : null),
  s_perfect_title: (f, x) => (x.h ? (x.h.champion === x.h.club && num(x.h.record?.l) === 0 && num(x.h.record?.t) === 0 && num(x.h.record?.w) >= REG_GAMES ? 1 : 0) : null),
  s_awards: (f, x) => (x.h ? awardsOf(x.h).length : null),
  s_title_all_badges: (f, x) => (x.live && x.champion ? (Object.keys(f.campaign?.badges || {}).length >= (x.H?.gymCount || 12) ? 1 : 0) : null),
  s_legend_title: (f, x) => (x.live && x.champion ? (roster(f).some((m) => x.H?.isLegendary?.(m)) ? 1 : 0) : null),
  s_badges_won: (f, x) => (x.live ? num(x.H?.badgesWonThisSeason?.(f)) : null),
  s_clash_unbeaten: (f, x) => { const s = f.achTrack?.clashSeason; return x.live && s && s.year === f.season?.year && s.wins === s.battles ? s.battles : null; },
  // the roster as it stands
  r_level50: (f) => roster(f).filter((m) => trainedTo50(f, m)).length, r_final_stage: (f) => roster(f).filter((m) => evolvedFinal(f, m)).length, r_grown_ovr: (f, x) => { const T = x.a?.target ?? 0, lo = f.achTrack?.set?.ovrMin || {}; return Math.max(0, ...roster(f).filter((m) => lo[String(m.id)] != null && lo[String(m.id)] < T).map(ovr)); },
  r_ovr80: (f) => roster(f).filter((m) => ovr(m) >= 80).length, r_apex: (f) => (roster(f).some((m) => (m.apex || m.dev?.apex) && !founding(m)) ? 1 : 0),
  r_growth: (f) => Math.max(0, ...roster(f).flatMap((m) => (m.career?.ev || []).filter((e) => e.t === 'growth' && e.c === f.club).map((e) => num(e.x?.to) - num(e.x?.from)))),
  r_drafted_ovr: (f) => Math.max(0, ...roster(f).filter((m) => mineDrafted(f, m)).map(ovr)), r_late_gem: (f) => Math.max(0, ...roster(f).filter((m) => mineDrafted(f, m) && m.drafted.round >= 3).map(ovr)),
  r_drafted_games: (f) => Math.max(0, ...roster(f).filter((m) => mineDrafted(f, m)).map((m) => num(m.stats?.career?.reg?.games) + num(m.stats?.career?.post?.games))),
  r_draftee_awards: (f) => roster(f).filter((m) => mineDrafted(f, m)).reduce((a, m) => a + (m.career?.ev || []).filter((e) => e.t === 'award' && e.c === f.club).length, 0), // calibration 2026-11-27: awards won by your draftees (counted)
  r_draftee_hof: (f) => { const ids = new Set([...roster(f).filter((m) => mineDrafted(f, m)).map((m) => String(m.id)), ...Object.keys(f.achTrack?.set?.drafted || {})]); return inductees(f).filter((x) => ids.has(String(x.id))).length; },
  r_legendary: (f, x) => (roster(f).some((m) => x.H?.isLegendary?.(m)) ? 1 : 0),
  r_loyal: (f) => Math.max(0, ...roster(f).map((m) => (m.joined != null ? num(f.season?.year) - m.joined + (f.season?.finished ? 1 : 0) : 0))),
  // collection (franchise scope reads this franchise's dex; account scope the player's)
  d_faced: (f) => marks(f.achTrack, 'faced'), d_signed: (f) => playedFamilies(f).length, d_knowledge: (f) => Object.keys(f.dex?.knowledge || {}).length,
  d_original: (f, x) => num(x.H?.dexCounts?.(f)?.original?.seen), d_basic: (f, x) => num(x.H?.dexCounts?.(f)?.basic?.seen), d_all: (f, x) => num(x.H?.dexCounts?.(f)?.all?.seen),
  d_types_min: (f) => { const by = {}; for (const id of playedFamilies(f)) { const e = resolveSpecies(id)?.element; if (e) by[e] = (by[e] || 0) + 1; } const all = Object.keys(TYPES); return Math.min(...all.map((k) => by[k] || 0)); },
  d_original_played: (f) => { const orig = new Set(x_original()); return playedFamilies(f).filter((id) => orig.has(id)).length; },
  a_dex: () => achDexCounts().played, a_title_franchises: () => { const d = load(); return (d.earned.first_title?.franchises || []).filter((k) => !d.disq?.[canon(d, k)]).length; },
  // management and legacy
  p_calls: (f) => Object.values(f.playStats || {}).reduce((a, y) => a + Object.values(y || {}).reduce((b, p) => b + num(p.used), 0), 0),
  b_conf_years: (f) => (f.board?.history || []).filter((h) => num(h.confidence) >= 2).length, b_goals: (f) => (f.board?.history || []).filter((h) => h.met).length,
  gm_moves: (f) => (new Set(hist(f).map((h) => h.club).concat(f.club ? [f.club] : [])).size > 1 || (f.gmCareer?.stints || []).length ? 1 : 0),
  aw_coy: (f) => hist(f).filter((h) => h.awards?.league?.coy?.team === h.club).length, aw_mvp: (f) => hist(f).filter((h) => h.awards?.league?.mvp?.team === h.club).length,
  aw_kinds: (f) => new Set(hist(f).flatMap((h) => awardsOf(h).map(([k]) => k))).size,
  aw_hof: (f) => { const ids = everPlayed(f); return inductees(f).filter((x) => ids.has(String(x.id))).length; },
  aw_gboot: (f) => hist(f).filter((h) => h.awards?.league?.gboot?.team === h.club).length, aw_rking: (f) => hist(f).filter((h) => h.awards?.league?.rking?.team === h.club).length,
  // Calibration (2026-11-27): the record book's own rule (league-news recordNews): a record counts once a full season is in the book and
  // when it beat an earlier mark (`prev`). In year one every category is "held" by somebody, which made this Rare row automatic.
  aw_record: (f) => Math.max(best(f.achTrack, 'record'), ['game', 'season'].some((k) => Object.values(f.records?.[k] || {}).some((r) => r && r.team === f.club && r.prev && hist(f).length >= 1 && num(r.year) > num(hist(f)[0]?.year))) ? 1 : 0),
  l_plays: (f) => Object.keys(f.legendaryPlays?.discovered || {}).length,
});
let ORIGINALS = null; const x_original = () => (ORIGINALS ||= SPECIES_DEX_IDS.filter((s) => s.rarity !== 'basic').map((s) => s.id));
const inductees = (f) => (f.monsterHallOfFame?.elections || []).flatMap((e) => e?.inductees || []);
const everPlayed = (f) => new Set([...hist(f).flatMap((h) => Object.keys(h.leagueStats?.[h.club] || {})), ...roster(f).map((m) => m.id)].map(String));

/**
 * How much of a row a save's history can prove (achievement review: the screen says so when it cannot):
 *   'complete' the save keeps everything the row reads (results, box scores per season, records, awards, trades, the dex)
 *   'partial'  past seasons count where the record proves them (lower bounds, e.g. a win streak within one season); the rest is tracked
 *   'tracked'  counted only from when tracking began (single-game box-score feats, Clash results, comebacks, owner actions)
 */
const PARTIAL = new Set(['t_road_wins', 't_shutout_wins', 't_games', 't_win_streak', 't_playoff_wins', 't_conf_titles', 't_def_td', 't_kr_td', 't_fgm', 't_evolutions', 't_draft_picks', 't_top_pick', 't_fa_signed', 'aw_record', 'r_draftee_hof']);
export function historyCoverage(a) { if (!a || a.legacy || a.scope === 'account') return 'complete'; if (!a.retro) return 'tracked'; return PARTIAL.has(a.metric) ? 'partial' : 'complete'; }
/** When tracking began for a franchise that predates it ({year, week}), or null when the franchise was tracked from its first week. */
export function trackingStart(f) { const t = f?.achTrack; if (!t?.from || !t.preexisting) return null; return { year: t.from.year, week: t.from.week }; }
/** The value a row's metric reads now (null: does not apply). */
export function metricValue(f, a, x = {}) { const fn = METRICS[a.progress && x.progress ? a.progress : a.metric]; if (!fn) return null; try { const v = fn(f, { ...x, a }); return v == null || Number.isNaN(v) ? null : v; } catch { return null; } }
export function meets(a, v) { if (v == null) return false; switch (a.cmp) { case 'le': return v <= a.target; case 'lt': return v < a.target; case 'eq': return v === a.target; default: return v >= a.target; } }
/**
 * Eligibility (brief: none from developer commands, debug tools, test fixtures, stat manipulation, duplicate events or save-loading
 * exploits). A franchise that a developer shortcut has played (f.achDev, set by dev-shortcut.js) earns nothing more; events are
 * counted once by their own identity (trackGame/trackClash); an archive is read-only. Normal play and the game's own weekly
 * simulation count.
 */
export const achEligible = (f) => !!f && !f.achDev && !isArchived(f);
/** The catalogue rows (not the 24 original ones, which keep their own checks) newly met for this trigger. */
export function evaluateCatalogue(f, trigger, x = {}) {
  if (!achEligible(f)) return [];
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (a.legacy || f.achievements?.[a.id] || (a.trigger !== trigger && a.trigger !== 'any' && !(x.retro && a.retro))) continue;
    if (x.retro && !a.retro) continue;
    if (meets(a, metricValue(f, a, x))) out.push(a.id);
  }
  return out;
}
/** Progress toward one achievement, for the screen: { value, target, pct } or null when a bar would mislead (a one-off feat). */
export function achievementProgress(f, a, x = {}) {
  if (!f || !a || a.target == null || a.target <= 1 || a.cmp !== 'ge' || !a.metric) return null;
  if (/^(g_|s_)/.test(a.progress || a.metric)) return null; // single-game and single-season feats are met or not; no bar
  const v = metricValue(f, a, { ...x, progress: true, live: true }); if (v == null) return null;
  return { value: Math.min(v, a.target), target: a.target, pct: Math.max(0, Math.min(1, v / a.target)) };
}

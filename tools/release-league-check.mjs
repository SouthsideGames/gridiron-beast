// League checks the release check runs on every loaded franchise (tools/deploy-check.py). Served only under the check's reserved
// prefix, never from the release folder; its imports (../src/…) resolve to the release's own modules.
// checkFranchise(f) -> { problems: [string], facts: {…} }
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { ALL_TEAMS, DIVISIONS, CONFERENCE_NAMES, REG_GAMES, PLAYOFF_ROUNDS, PLAYOFF_SEEDS, SCHEDULE_MIX, divisionOf, conferenceOf } from '../src/data/league.js';
import { GYMS, isGymClub } from '../src/data/gyms.js';
import { verifyLeague } from '../src/franchise/league-registry.js';
import { leagueArchive, validateLeagueArchive } from '../src/franchise/preleague-history.js';
import { TRADE_DEADLINE_WEEK } from '../src/franchise/trade-window.js';
import { fieldBrand } from '../src/ui/field-branding.js';
import { venueFor } from '../src/data/stadiums.js';
import { gameKits, kitsApart } from '../src/ui/team-kit.js';

const CANON_CHAMPIONS = ['Skyvale Cyclones', 'Thornwood Wildroots', 'Skyvale Cyclones', 'Stormport Bolts', 'Stormport Bolts', 'Aetheria Seers', 'Harbor Anchors', 'Frostpeak Howlers'];

export function checkFranchise(f) {
  const P = []; const say = (c, m) => { if (!c) P.push(m); };
  // 32 clubs, 8 divisions, two conferences, the registry sound
  say(ALL_TEAMS.length === 32 && Object.keys(DIVISIONS).length === 8 && CONFERENCE_NAMES.length === 2, '32 clubs in 8 divisions and 2 conferences');
  say(Object.keys(f.league?.clubs || {}).length === 32, `league registry holds 32 clubs (${Object.keys(f.league?.clubs || {}).length})`);
  const reg = verifyLeague(f); say(!reg.length, `league registry: ${reg[0] || ''}`); say(f.leagueFormat === 32, 'saved as a 32-club franchise');
  // the season: 14 games, 6/5/3, seven at home; the trade deadline in week 7
  const games = (f.season?.schedule || []).filter((g) => !g.bye); const dv = games.filter((g) => divisionOf(g.opponent) === divisionOf(f.club)).length;
  const cf = games.filter((g) => conferenceOf(g.opponent) === conferenceOf(f.club)).length - dv;
  say(games.length === REG_GAMES && REG_GAMES === 14, `14-game schedule (${games.length})`); say(dv === SCHEDULE_MIX.division && cf === SCHEDULE_MIX.conference, `6 division / 5 conference / 3 other (${dv}/${cf}/${games.length - dv - cf})`);
  say(games.filter((g) => g.home).length === 7, 'seven home games'); say(TRADE_DEADLINE_WEEK === 7, `trade deadline week 7 (${TRADE_DEADLINE_WEEK})`);
  // the playoffs: four rounds, seven seeds a conference, and if they are under way, the right games so far
  say(PLAYOFF_ROUNDS === 4 && PLAYOFF_SEEDS === 7, 'four playoff rounds, seven seeds per conference');
  const po = f.season?.playoffs;
  if (po) { for (const c of CONFERENCE_NAMES) say((po.seeds?.[c] || []).length === 7, `${c}: seven seeds`); const per = [1, 2, 3, 4].map((r) => (po.results || []).filter((x) => x.round === r).length); const want = [6, 4, 2, 1];
    for (let r = 0; r < 4; r++) say(per[r] === (r + 1 < po.round ? want[r] : per[r]), `round ${r + 1}: ${per[r]} games played`); say(!(po.results || []).some((x) => x.round === 1 && Object.values(po.seeds).some((s) => s[0] === x.home || s[0] === x.away)), 'top seeds rest in the Wild Card round'); }
  // Gym Leaders and badges; Legend Tracks follow the badge rule
  say(GYMS.length === 12, 'twelve Gym Leaders'); const held = Object.keys(f.campaign?.badges || {}); say(held.every(isGymClub), 'badges are Gym Leader badges');
  const tracks = F.legendTracks(f); say(tracks.length === 12, 'twelve Legend Tracks');
  for (const t of tracks) { say(['locked', 'active', 'paused', 'complete', 'recruited'].includes(t.state), `track ${t.id}: ${t.state}`); if (t.state === 'active') say(t.held, `${t.id} active without its badge`); if (t.state === 'paused') say(!t.held && t.tracks > 0 && !t.unlocked, `${t.id} paused wrongly`); if (t.unlocked && !t.recruited) say(t.state === 'complete', `${t.id}: a completed track stays complete`); }
  // the league's past: eight canon seasons, their champions, sound records
  const a = leagueArchive(f); say(!!a, 'league archive present');
  if (a) { say(JSON.stringify(a.seasons.map((s) => s.champion)) === JSON.stringify(CANON_CHAMPIONS), 'the eight canon champions'); const v = validateLeagueArchive(a); say(!v.length, `archive: ${v[0] || ''}`); }
  // the home club's branding and the day's uniforms
  const opp = games.find((g) => g.opponent)?.opponent; const venue = venueFor(f.club, 'release'); const b = fieldBrand(venue); say(b?.club === f.club, 'home field branding');
  if (opp) { const k = gameKits(f.club, opp); say(kitsApart(k.home, k.away), `uniforms told apart against ${opp}`); }
  // save and load: export, import, export again gives the same text
  const t1 = Save.exportJson(f); let same = false; try { same = Save.exportJson(Save.importJson(t1)) === t1; } catch (e) { P.push(`re-import failed: ${e.message}`); } say(same, 'export -> import -> export is identical');
  const facts = { club: f.club, year: f.season?.year, week: f.season?.week, badges: held.length, tracks: tracks.map((t) => t.state[0]).join(''), playoffs: po ? po.round : null, stints: (f.gmCareer?.stints || f.career?.stints || []).length || null };
  return { problems: P, facts };
}
/** The import route for a 16-club save: refused with the 16-club message, and the text it was given is not changed. */
export function checkOldSave(text) {
  const before = text; let err = null; try { Save.importJson(text); } catch (e) { err = e; }
  return { refused: !!err && err.code === 'incompatible' && err.reason === 'league-format', message: err?.message || null, unchanged: text === before, expected: Save.OLD_LEAGUE_MESSAGE };
}

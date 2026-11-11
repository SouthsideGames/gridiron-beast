// Task 8 M6 (spec §5 "Discovery and presentation"): what the player has discovered about individual monsters, kept in the save.
//   - A potential-revealing scouting report, or acquiring the monster, makes its individual potential known to the player for good:
//     the record stays when the report's source (a draft class, a week's prospects) is gone, and when the monster leaves the club.
//   - An Apex individual is concealed until that moment. Discovering it is recorded once per individual, with the season and how.
//     The first-discovery panel plays automatically once: `shown` is stamped when the panel OPENS and is saved at once, so a reload,
//     a skip, a replay, an interruption or a later reacquisition never plays it automatically again and never changes anything else.
//   - Another club's knowledge is separate (src/franchise/draft.js aiDraftKnowledge); nothing here reveals anything to the AI.
// Pure bookkeeping: no random draws, no rewards, nothing a simulation reads. Optional save fields (schema 10 unchanged):
//   f.discovery = { potential: { [monsterId]: { year, week, via } }, apex: { [monsterId]: { year, week, via, name, shown } } }
const VIA = Object.freeze(['roster', 'scouting', 'draft-report', 'free-agent-report']);
export const DISCOVERY_VIA = VIA;
const book = (f) => { const d = (f.discovery ||= {}); d.potential ||= {}; d.apex ||= {}; return d; };
const stamp = (f, via) => ({ year: f.season?.year ?? null, week: f.season?.week ?? null, via });
const isApex = (m) => !!m?.dev?.apex;

/** Does the player know this monster's individual potential (a full report, or it is or was his)? */
export function potentialKnown(f, m) { return !!(f && m && (f.discovery?.potential?.[m.id] || f.roster?.some((x) => x.id === m.id))); }
/** Has the player discovered that this individual is an Apex? False for an undiscovered Apex and for every ordinary monster. */
export function apexKnown(f, m) { return !!(isApex(m) && f?.discovery?.apex?.[m.id]); }
/** The discovery record of an Apex the player knows ({ year, week, via, name, shown }), or null. */
export const apexRecord = (f, m) => (apexKnown(f, m) ? f.discovery.apex[m.id] : null);

/**
 * Record that the player now knows `m`'s potential (`via`: one of DISCOVERY_VIA). Returns true when this call newly discovered an
 * Apex (its first-discovery panel is then pending). Idempotent: a second report or a reacquisition changes nothing.
 */
export function discover(f, m, via = 'scouting') {
  if (!f || !m?.id) return false; if (!VIA.includes(via)) throw new RangeError(`unknown discovery source ${via}`);
  const d = book(f); if (!d.potential[m.id]) d.potential[m.id] = stamp(f, via);
  if (!isApex(m) || d.apex[m.id]) return false;
  d.apex[m.id] = { ...stamp(f, via), name: m.name, shown: false }; return true;
}

/**
 * Bring the records up to date with what the player can already see: every monster on his roster (acquiring an unidentified Apex
 * reveals it at once), every fully scouted draft prospect (report level 6) and every regional prospect whose report reveals
 * potential. Returns the ids of Apex individuals newly discovered by this call. Safe to call before every screen.
 */
export function syncDiscovery(f) {
  if (!f) return []; const fresh = [];
  const see = (m, via) => { if (m && discover(f, m, via)) fresh.push(m.id); };
  for (const m of f.roster || []) see(m, 'roster');
  const dr = f.draft; if (dr?.class && dr.revealed) for (const m of dr.class) if ((dr.revealed[m.id] || 0) >= 6) see(m, 'draft-report');
  for (const p of f.week?.prospects || []) if (p?.potentialKnown && p.monster) see(p.monster, 'scouting');
  return fresh;
}

/** Apex discoveries whose first-discovery panel has not opened yet, oldest first: [{ id, record }]. */
export function pendingApexPanels(f) { return Object.entries(f?.discovery?.apex || {}).filter(([, r]) => !r.shown).map(([id, record]) => ({ id, record })); }
/** Stamp the panel as opened (call before showing it, then save). Returns false when it was already stamped or unknown. */
export function markApexPanelShown(f, id) { const r = f?.discovery?.apex?.[id]; if (!r || r.shown) return false; r.shown = true; return true; }

/** What the profile and the panel state about a discovered Apex (spec §5). */
export const APEX_FACTS = Object.freeze(['Potential 99 in every attribute', 'Starts undeveloped', 'Ageless', 'Neutral Temper']);

// Ability review revisions (owner 2026-11-11). An ability's review fingerprint already changes by itself when its Dex contract
// (name, category, activation, mechanic, details, ruling, approved values) changes. A material change that the contract text does
// NOT show (engine behaviour behind the same wording, or the ability's look) must be recorded here by raising that ability's
// number: its approval then lapses and it returns to Pending Review, and no other ability is touched.
// Keys are Dex ability ids. Football and Clash are separate lists because their reviews are separate.
// An ability with no entry keeps the fingerprint it had before this file existed, so earlier approvals stay valid.
// Owner-requested re-review: all football zones and the revised football abilities.
export const FOOTBALL_REVISION = Object.freeze({
  "DAR-01-F": 3,
  "DAR-02-F": 1,
  "DAR-03-F": 1,
  "DAR-04-F": 1,
  "DAR-05-F": 3,
  "DRA-02-F": 1,
  "DRA-03-F": 1,
  "EAR-06-F": 2, // owner revision 2026-11-15: push to 8 yards (between linebackers and safeties)
  "ELE-02-F": 3,
  "ELE-04-F": 3,
  "FIR-02-F": 3,
  "FIR-06-F": 3,
  "ICE-01-F": 3,
  "ICE-04-F": 3,
  "LIG-01-F": 3,
  "LIG-03-F": 1,
  "LIG-04-F": 2, // owner revision 2026-11-15: the replay shows a zone breaking; the coach picks which zone
  "MET-02-F": 1,
  "MET-03-F": 3,
  "MET-05-F": 3,
  "NAT-01-F": 3,
  "NAT-05-F": 3,
  "PSY-01-F": 3,
  "PSY-02-F": 1,
  "PSY-04-F": 3,
  "WAT-01-F": 3,
  "WAT-06-F": 3,
  "WIN-01-F": 3,
  "WIN-04-F": 3
});
export const CLASH_REVISION = Object.freeze({
  // 'FIR-01-C': 1,
  // Owner revision 2026-11-15: redrawn art (a real dragon; carved stone).
  'DRA-01-C': 1,
  'DRA-05-C': 1,
  'EAR-01-C': 1,
  'EAR-05-C': 1,
  'EAR-06-C': 1,
});

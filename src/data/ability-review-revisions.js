// Ability review revisions (owner 2026-11-11). An ability's review fingerprint already changes by itself when its Dex contract
// (name, category, activation, mechanic, details, ruling, approved values) changes. A material change that the contract text does
// NOT show (engine behaviour behind the same wording, or the ability's look) must be recorded here by raising that ability's
// number: its approval then lapses and it returns to Pending Review, and no other ability is touched.
// Keys are Dex ability ids. Football and Clash are separate lists because their reviews are separate.
// An ability with no entry keeps the fingerprint it had before this file existed, so earlier approvals stay valid.
export const FOOTBALL_REVISION = Object.freeze({
  // 'FIR-01-F': 1,
});
export const CLASH_REVISION = Object.freeze({
  // 'FIR-01-C': 1,
});

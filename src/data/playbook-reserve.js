// Reserve plays: built, drawn and simulated like every other play, reviewed in
// the Playbook Audit, but kept out of every game system (coaches, AI clubs,
// game plans, practice field) until the owner releases them. playbook.js
// calls reservePlays() with its own builders, so a reserve play compiles and
// validates exactly like a live one.

export function reservePlays(b) {
  return { offense: [], defense: [] };
}

/** One lesson per reserve play, in the same shape as the live LESSONS. */
export const RESERVE_LESSONS = Object.freeze({});

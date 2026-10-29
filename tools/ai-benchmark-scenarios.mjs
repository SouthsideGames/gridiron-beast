// Stress scenarios for the AI Franchise Benchmark (Task 4, diagnostic only). Each one sets up a starting condition the game
// already supports, applied once to three AI clubs right after the franchise is created (before any game of season 1), and the
// production lifecycle then runs unchanged. Ratings are never edited: the setups use ages, contracts, injuries and releases,
// which the game's own rules then act on. The target clubs are fixed by position in the sorted club list (never the rival,
// never the owner), so every seed stresses comparable clubs and the matched baseline run shows the same clubs unstressed.
//
// NOT production behaviour: these setups exist only in benchmark runs (`--scenario=NAME`).

/** The three stressed clubs for a franchise: the 2nd, 7th and 12th of the sorted AI clubs, skipping the rival. */
export function targetClubs(f, REG) {
  const rival = f.rivals?.[f.tier]?.team || null;
  const clubs = REG.leagueClubs(f).slice().sort().filter((c) => c !== rival);
  return [clubs[1], clubs[6], clubs[11]].filter(Boolean);
}
const starters = (REG, f, club, monsterOverall, GROUP_SLOTS) => {
  const roster = REG.clubRoster(f, club); const out = [];
  for (const [pos, slots] of Object.entries(GROUP_SLOTS)) out.push(...roster.filter((m) => m.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, slots.length));
  return out;
};

export const SCENARIOS = {
  // S1: an ageing core. Every unprotected starter is 31–33, so decline (from 30), the re-sign age rule (reserves 32+ walk) and
  // contract expiry all bite within two seasons. Question: does the club plan replacements before the core goes?
  aging: {
    description: 'Three clubs open with every unprotected starter aged 31–33 (ages only; ratings untouched).',
    apply(f, { REG, monsterOverall, GROUP_SLOTS }) {
      const out = {}; for (const club of targetClubs(f, REG)) { let i = 0; for (const m of starters(REG, f, club, monsterOverall, GROUP_SLOTS)) { if (REG.isProtected(m)) continue; m.age = 31 + (i++ % 3); m.yearsPro = Math.max(m.yearsPro || 0, 9); } out[club] = i; }
      return out;
    },
  },
  // S2: a contract cliff. Every unprotected deal of the club ends after season 1, so the whole roster is up for renewal at once.
  // Question: does the club keep its core, stay under the cap, and refill the depth it lets go?
  expiring: {
    description: 'Three clubs open with every unprotected contract ending after season 1.',
    apply(f, { REG }) {
      const out = {}; for (const club of targetClubs(f, REG)) { let n = 0; for (const m of REG.clubRoster(f, club)) { if (REG.isProtected(m) || !m.contract) continue; m.contract = { ...m.contract, ends: 1 }; n++; } out[club] = n; }
      return out;
    },
  },
  // S3: thin depth. Each club releases (the game's own releaseFromClub, to the pools/waivers) every backup at QB, OL, CB and S,
  // leaving the starters only. Question: does the club rebuild depth through the draft and the market, and does it survive injuries?
  thin: {
    description: 'Three clubs open with no backups at QB, OL, CB and S (released through the game\'s release rule).',
    apply(f, { REG, L, monsterOverall, GROUP_SLOTS }) {
      const out = {}; for (const club of targetClubs(f, REG)) { let n = 0;
        for (const pos of ['QB', 'OL', 'CB', 'S']) { const at = REG.clubRoster(f, club).filter((m) => m.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)); for (const m of at.slice(GROUP_SLOTS[pos].length)) { if (REG.isProtected(m)) continue; if (REG.clubRoster(f, club).length <= 27) break; const r = L.releaseFromClub(f, club, m.id, { year: 1, reason: 'released', silent: true }); if (r.ok) n++; } }
        out[club] = n; }
      return out;
    },
  },
  // S4: an injury wave. Five of the club's best unprotected starters open season 1 injured for 4–6 weeks (the game's injury
  // record, healed by the weekly recovery). Question: does in-season cover keep the club legal and competitive, and do the
  // starters get their places back?
  injuries: {
    description: 'Three clubs open season 1 with their five best unprotected starters injured for 4–6 weeks.',
    apply(f, { REG, monsterOverall, GROUP_SLOTS }) {
      const out = {}; for (const club of targetClubs(f, REG)) { const top = starters(REG, f, club, monsterOverall, GROUP_SLOTS).filter((m) => !REG.isProtected(m) && m.position !== 'K').sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, 5);
        top.forEach((m, i) => { m.injury = { severity: 'Severe', weeks: 4 + (i % 3), type: 'knee' }; }); out[club] = top.length; }
      return out;
    },
  },
  // S5: a gutted club. Each club releases (to the league's waivers, the game's own rule) its six best unprotected starters.
  // Question: how long does a weak club take to rebuild, and how much of the recovery is decisions versus the balance nudge?
  rebuild: {
    description: 'Three clubs open after releasing their six best unprotected starters (a weak team entering a rebuild).',
    apply(f, { REG, L, monsterOverall, GROUP_SLOTS }) {
      const out = {}; for (const club of targetClubs(f, REG)) { const top = starters(REG, f, club, monsterOverall, GROUP_SLOTS).filter((m) => !REG.isProtected(m) && m.position !== 'K').sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, 6); let n = 0;
        for (const m of top) { const r = L.releaseFromClub(f, club, m.id, { year: 1, reason: 'released' }); if (r.ok) n++; }
        out[club] = n; }
      return out;
    },
  },
  // S6: draft capital. Each club is handed every round-1 pick of the next class held by the three weakest-record-expected clubs
  // (the game's own pick ownership). Question: does the club use extra picks well (needs, contribution) or trade them away?
  picks: {
    description: 'Three clubs open holding three extra round-1 picks in the season-2 class (the game\'s pick ownership).',
    apply(f, { REG, T, ALL_TEAMS }) {
      const out = {}; const targets = targetClubs(f, REG); const donors = REG.leagueClubs(f).slice().sort().filter((c) => !targets.includes(c) && c !== f.rivals?.[f.tier]?.team);
      targets.forEach((club, i) => { const given = donors.slice(i * 3, i * 3 + 3); for (const d of given) T.setPickOwner(f, { year: 2, round: 1, original: d }, club); out[club] = given; });
      return out;
    },
  },
};

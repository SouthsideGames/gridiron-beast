import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { generateDraftClass, draftProspectRankings, prospectView, startDraft, advanceDraft, playerPick, passPick } from '../src/franchise/draft.js';
import { createFranchise } from '../src/franchise/franchise.js';
import { registerHqScreens } from '../src/ui/screens/hq.js';
const make = (seed = 82) => ({ class: generateDraftClass(createRng(seed), { year: 1 }), revealed: {}, picks: [] });
test('full-class consensus ranks are unique and position rank counts every member of the group', () => {
  for (const seed of [1, 23, 82]) {
    const d = make(seed), before = JSON.stringify(d);
    assert.equal(d.class.length, 106); // twice the 16-club class: 96 picks in three rounds of 32
    assert.deepEqual(d.class.map(m => draftProspectRankings(d, m).overall), Array.from({length:106}, (_, i) => i + 1));
    for (const position of new Set(d.class.map(m => m.position))) {
      const group = d.class.filter(m => m.position === position);
      group.forEach((m, i) => assert.deepEqual(draftProspectRankings(d, m), {
        overall: m.boardRank, total: 106, positionRank: i + 1, positionTotal: group.length, position
      }));
    }
    assert.equal(JSON.stringify(d), before, 'display must not mutate class or consume RNG');
  }
});
test('rank stays fixed after selections, filters, scouting changes and JSON reload without revealing hidden ratings', () => {
  const d = make(), m = d.class[3], f = { draft: d };
  const expected = draftProspectRankings(d, m);
  d.available = d.class.slice(4).map(m => m.id); d.picks.push({ id: m.id, overall: 2 });
  const hidden = prospectView(f, m);
  assert.equal(hidden.ovr, null); assert.equal(hidden.potential, null);
  // Ranking must not read private attributes to sort, even if a prospect is unscouted.
  Object.defineProperty(m, 'attributes', { get() { throw new Error('hidden attributes read'); }, configurable: true });
  Object.defineProperty(m, 'potential', { get() { throw new Error('hidden potential read'); }, configurable: true });
  assert.deepEqual(draftProspectRankings(d, m), expected);
  delete m.attributes; delete m.potential;
  for (const position of ['WR', 'QB', 'OL']) for (const row of d.class.filter(m => m.position === position).reverse())
    assert.equal(draftProspectRankings(d, row).overall, row.boardRank);
  d.revealed[m.id] = 6;
  const reloaded = JSON.parse(JSON.stringify(d));
  assert.deepEqual(draftProspectRankings(reloaded, reloaded.class[3]), expected);
});
test('missing or tied legacy public ranks get deterministic unique display ranks without modifying saves', () => {
  const d = {class:[{id:'a',boardRank:2,position:'WR'}, {id:'b',boardRank:2,position:'WR'}, {id:'c',position:'QB'}]};
  const before = JSON.stringify(d);
  assert.deepEqual(d.class.map(m => draftProspectRankings(d,m).overall), [1,2,3]);
  assert.equal(JSON.stringify(d), before); assert.equal(draftProspectRankings(d, null), null);
  assert.equal(draftProspectRankings(d, {id:'absent'}), null);
});
test('three real snake rounds preserve ranks and separate pick order, reject repeat picks, and survive passes', () => {
  const f = { draft: make(), roster: [] }, rng = createRng(932);
  f.draft.year = 1; const original = f.draft.class.map(m => draftProspectRankings(f.draft,m));
  startDraft(f, ['Mine','B','C','D']);
  let turns = 0;
  while (!f.draft.done) {
    advanceDraft(f, rng, {playerClub:'Mine'});
    if (f.draft.done) break;
    if (turns++ === 1) assert.equal(passPick(f,{playerClub:'Mine'}).ok,true);
    else {
      const m = f.draft.class.find(m => f.draft.available.includes(m.id));
      assert.equal(playerPick(f,m.id,{playerClub:'Mine',nextYear:2}).ok,true);
      assert.equal(playerPick(f,m.id,{playerClub:'Mine',nextYear:2}).ok,false);
    }
  }
  assert.equal(f.draft.picks.length, 12);
  assert.deepEqual(f.draft.picks.map(p => p.overall),Array.from({length:12},(_,i)=>i+1));
  assert.equal(new Set(f.draft.picks.filter(p=>p.id).map(p=>p.id)).size,11);
  assert.deepEqual(f.draft.class.map(m => draftProspectRankings(f.draft,m)),original);
});
test('real draft screen shows every available prospect, explicit pick order and stable ranks in history', () => {
  const f = createFranchise({ owner:{first:'Draft',last:'Test'},club:'Ember City Beasts',seed:82 });
  const screens = new Map(), previous = globalThis.document;
  globalThis.document = {addEventListener(){}};
  try { registerHqScreens({registerScreen:(name,screen)=>screens.set(name,screen)}, {f,settings:{}}); }
  finally { if(previous)globalThis.document=previous;else delete globalThis.document; }
  const d=f.draft;
  // Put the actual creation draft on our next turn. Everything remains in the full class.
  assert.ok(d.started); assert.ok(!d.done);
  const html=screens.get('draft').render({f});
  assert.equal([...html.matchAll(/data-action="pick" data-id=/g)].length,d.available.length);
  assert.ok(d.available.length>30, 'regression fixture exercises previously hidden rows');
  assert.match(html,new RegExp(`Your Turn: Pick ${d.index+1} Overall`));
  for(const m of d.class.filter(m=>d.available.includes(m.id))) assert.ok(html.includes(`Overall Prospect: #${m.boardRank} of ${d.class.length}`));
  for(const p of d.picks.slice(-6)) assert.ok(html.includes(`Round ${p.round} · Pick ${p.overall} Overall`));
  assert.doesNotMatch(html, /class="name">#\d|R\d #\d/);
});
test('the pick list separates each selection and each class, since the labels themselves contain "·"', () => {
  const f = createFranchise({ owner:{first:'Draft',last:'Test'},club:'Ember City Beasts',seed:82 });
  const screens = new Map(), previous = globalThis.document;
  globalThis.document = {addEventListener(){}};
  try { registerHqScreens({registerScreen:(name,screen)=>screens.set(name,screen)}, {f,settings:{}}); }
  finally { if(previous)globalThis.document=previous;else delete globalThis.document; }
  const html = screens.get('draft').render({f});
  const years = [...html.matchAll(/<div class="draft-pick-year"><b>(\d+)<\/b> ([^<]*)<\/div>/g)];
  assert.ok(years.length >= 2, 'this class and future classes each get a line');
  assert.equal(new Set(years.map((y) => y[1])).size, years.length, 'one line per class');
  for (const [, , list] of years) {
    const labels = list.split(', ');
    assert.ok(labels.every((l) => /^Round \d( · Pick \d+ Overall)?\*?$/.test(l)), `each pick is its own comma-separated label: ${list}`);
  }
  assert.doesNotMatch(html, /Overall\*? Round \d|Round \d\*? Round \d/, 'no two pick labels run together');
});

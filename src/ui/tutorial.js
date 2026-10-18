// First-week tutorial (GDD §15.13): a short tip on each screen the first time
// the player reaches it in a new franchise, written for someone who may never
// have watched American football, plus a "How football works" primer. Tips
// are dismissed one at a time and remembered in f.tutorial.seen; Settings can
// turn them off or bring them back.

import { esc, sheet } from './dom.js';

/** Screen → tip. `sheet: true` tips open as an overlay (the match screen has no room). */
export const TIPS = Object.freeze({
  draft: { title: 'Draft day', text: 'Every club takes three first-year monsters, worst record first. Scouted prospects show their ratings; the rest are a gamble on the public board rank. Rookies cost 70% of market for two seasons — the cheapest good players you will ever sign. Pick for a position where you have no backup, or just the best monster you can see.' },
  hq: { title: 'Welcome to your week', text: 'A season is 10 weeks. Each week runs Monday to Sunday: scout monsters, sign one, train, study the opponent, set your plays, talk to the press, then play on Sunday. The big yellow button always says what’s next. If you’d rather skip the weekday chores, “Let the staff run the week” does them for you.', more: true },
  scout: { title: 'Monday: scouting', text: 'Pick a region and your scout brings back prospects. Each region has its own elements (types) of monster. A better scout finds more prospects and reveals more of their ratings.' },
  recruit: { title: 'Tuesday: recruiting', text: 'Each prospect shows four headline ratings: Speed, Power, Hands and Smarts. The ⓘ button compares them with your current monsters at that position. Signing costs salary against your cap; if you go over, the commissioner reviews the books on Saturday, so sign with care.' },
  training: { title: 'Wednesday: training', text: 'Choose one thing to work on this week. Harder sessions give more but risk injuries, and the same focus three weeks running stops working.' },
  scoutopp: { title: 'Thursday: scout the opponent', text: 'Pick a side of their team to study. You learn the exact six plays they will call on Sunday, which is how you choose the plays that beat them.' },
  gameplan: { title: 'Friday: game plan', text: 'Choose six plays for your offense and six for your defense. Those are the only plays you can call on Sunday. Plays marked ✦ counter what you learned on Thursday. A mix of runs and passes is safest.' },
  lineup: { title: 'Saturday: media day', text: 'The press asks three questions. Each answer fires up monsters of a certain temperament for Sunday. Your lineup is checked here too: injured or tired starters get swapped automatically.' },
  pregame: { title: 'Sunday: game day', text: 'The other coach has a word before the lineups. On the field, the top team of each panel is who starts. Boost badges show who got a training (T) or media (+) lift today.' },
  match: { sheet: true, title: 'Your first game', text: 'Football in one breath: the offense has four tries (“downs”) to move the ball 10 yards. Make it and you get four more; reach the far end zone and that’s a touchdown (6 points, plus a 1-point kick). Fail on fourth down and the other team takes over, which is why you usually punt it away or kick a field goal (3 points) on fourth.\n\nYou coach, you don’t steer: pick one of your six play cards, press Snap, and watch the monsters run it. On defense you pick a play too. In Key Moments mode the game simulates itself and stops for the big downs; switch to Full Coaching in Settings to call every play.' },
  postgame: { title: 'After the game', text: 'The box score shows who did what. Your monsters earn experience and get tired; practice adds a little more, Saturday’s lineup check takes most of it off, and a bye clears it. Win and the standings climb; lose and the season moves on, no replays.' },
  roster: { title: 'Your roster', text: 'Seven starters a side plus package players for special situations. Tap a monster for ratings, nature and ability. Starters are set for you, and you can override any slot.' },
  playbook: { title: 'Plays', text: 'Every play has a lesson: what it’s for and what beats it. You don’t need to know them all; your six on Friday are what matter.' },
  league: { title: 'The league', text: 'Sixteen clubs, two conferences. Eight make the playoffs: four per conference, then three rounds to the Beast Bowl. Eight clubs are gyms: beat each one for a badge on the road to the Hall of Fame.' },
});

const ORDER = ['hq', 'scout', 'recruit', 'training', 'scoutopp', 'gameplan', 'lineup', 'pregame', 'match', 'postgame'];

export function tutorialOn(f) { return !!f && f.settings?.tutorial !== false; }
export function tipFor(f, screen) {
  if (!tutorialOn(f)) return null;
  f.tutorial ||= { seen: {} }; f.tutorial.seen ||= {};
  // The HQ tip once; after the first game HQ shows the "after the game" tip instead.
  if (screen === 'hq' && f.tutorial.seen.hq && (f.season?.week > 1 || f.week?.gameResult)) screen = 'postgame';
  const t = TIPS[screen]; if (!t) return null;
  return f.tutorial.seen[screen] ? null : { key: screen, ...t };
}
export function markSeen(f, key) { f.tutorial ||= { seen: {} }; f.tutorial.seen ||= {}; f.tutorial.seen[key] = true; }
export function resetTutorial(f) { if (f) f.tutorial = { seen: {} }; }
export function tutorialProgress(f) { const seen = f?.tutorial?.seen || {}; return { done: ORDER.filter((k) => seen[k]).length, total: ORDER.length }; }

/** Inline tip panel html, or '' when nothing to show. */
export function tipHtml(f, screen) {
  const t = tipFor(f, screen); if (!t || t.sheet) return '';
  const p = tutorialProgress(f);
  return `<div class="tip" role="note"><div class="row between"><b>📘 ${esc(t.title)}</b><span class="dim" style="font-size:11px">tutorial ${p.done + 1}/${p.total}</span></div><p>${esc(t.text).replace(/\n\n/g, '</p><p>')}</p><div class="row"><button class="btn small primary" data-action="tut-ok" data-k="${t.key}">Got it</button>${t.more ? '<button class="btn small" data-action="tut-primer">How football works</button>' : ''}<button class="btn small ghost" data-action="tut-off">Turn tips off</button></div></div>`;
}

/** The football primer, as a sheet. */
export function primerHtml() {
  return `<h3>The field</h3><p>100 yards long, an end zone at each end. Your offense attacks up the screen toward the far end zone.</p>
  <h3>Downs</h3><p>The offense gets four plays (downs) to gain 10 yards. Gain them and the count resets. “2nd &amp; 7” means second down, 7 yards still needed.</p>
  <h3>Scoring</h3><p>Touchdown: carry or catch the ball in the end zone, 6 points, then a 1-point kick. Field goal: kick it through the posts, 3 points, usually on fourth down when you’re close. Safety: tackled in your own end zone, 2 points to the other team.</p>
  <h3>Fourth down</h3><p>Too far to go? Punt: kick it away so the other team starts far from your end zone. Close enough? Kick the field goal. Feeling brave? Go for it.</p>
  <h3>Positions (7 a side)</h3><p><b>Offense:</b> QB throws or hands off; RB runs; WR catch; TE blocks and catches; OL block. <b>Defense:</b> DL rush the passer and stop runs; LB do a bit of everything; CB cover receivers; S the last line.</p>
  <h3>Turnovers</h3><p>Interception (defense catches a pass) or fumble (ball knocked loose and recovered): the other team gets the ball right there.</p>
  <h3>What you do</h3><p>You don’t steer anyone. You build the team, pick the six plays for each side on Friday, and on Sunday you call one of those plays each snap. Monsters do the rest, using their ratings, natures and abilities.</p>`;
}

/** Hook the tip buttons once, for every screen (the router prepends the tip html). */
export function initTutorial({ app, Router }) {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action^="tut-"]'); if (!b || !app.f) return;
    const a = b.dataset.action;
    if (a === 'tut-ok') { markSeen(app.f, b.dataset.k); app.save(); Router.render(); }
    else if (a === 'tut-off') { app.f.settings.tutorial = false; app.save(); Router.render(); }
    else if (a === 'tut-primer') sheet(primerHtml(), { title: 'How football works' });
  });
}
/** Sheet-style tips (the match screen): open once, then mark seen. */
export function maybeSheetTip(f, screen, save) {
  const t = tipFor(f, screen); if (!t || !t.sheet) return;
  markSeen(f, screen); save?.();
  sheet(`<p>${esc(t.text).replace(/\n\n/g, '</p><p>')}</p><button class="btn small" data-action="tut-primer">How football works</button>`, { title: `📘 ${t.title}` });
}

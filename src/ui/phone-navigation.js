import { t } from '../text/index.js';
// Presentation preferences, read-only checklists, and bounded in-session navigation.
import * as F from '../franchise/franchise.js';
import { isArchived, mayStartSeason } from '../franchise/lifecycle.js';
import { hallCeremonyDue } from '../franchise/hall-ceremony.js';
/** Which primary tab owns each franchise screen. Plays are reached through Game Plan, not a tab. */
export const TAB_OF = {
  hq: 'hq', commissioner: 'hq', postseason: 'hq', legend: 'hq', scout: 'hq', recruit: 'hq', training: 'hq', scoutopp: 'hq', gameplan: 'hq', lineup: 'roster', pregame: 'hq', match: 'hq',
  roster: 'roster', monster: 'roster', assign: 'roster', contracts: 'roster', famarket: 'roster', staff: 'more',
  playbook: 'hq', playdetail: 'hq', practice: 'more', audit: 'more',
  office: 'hq', 'coach-look': 'hq', 'gm-jobs': 'hq', map: 'map',
  league: 'league', schedule: 'league', standings: 'league', history: 'league',
  more: 'more', guide: 'more', guidebook: 'more', settings: 'more', developer: 'more', 'test-session': 'more', about: 'more', dex: 'more', hof: 'more', achievements: 'more',
};
export function franchiseTabs(f, screenName) {
  if (!f || isArchived(f)) return null;
  const items = [['hq', 'HQ', '🏠'], ['roster', t('franchises.roster'), '🐾'], ['map', t('map.tab'), '🗺️'], ['league', t('franchises.league'), '🏆'], ['more', t('franchises.more'), '☰']];
  const counts = {};
  for (const notice of F.notices(f)) counts[notice.screen] = (counts[notice.screen] || 0) + 1;
  return items.map(([screen, label, icon]) => ({ screen, label, icon, badge: counts[screen] || 0, active: screenName === screen || TAB_OF[screenName] === screen }));
}
export const AUTO_SPEEDS = [1, 2, 4];
export function autoSpeed(f) { return AUTO_SPEEDS.includes(f.settings?.autoSpeed) ? f.settings.autoSpeed : AUTO_SPEEDS.includes(f.game?.autoSpeed) ? f.game.autoSpeed : 1; }
export function cycleAutoSpeed(f) { const speed = AUTO_SPEEDS[(AUTO_SPEEDS.indexOf(autoSpeed(f)) + 1) % AUTO_SPEEDS.length]; (f.settings ||= {}).autoSpeed = speed; if (f.game) f.game.autoSpeed = speed; return speed; }
export class TabHistory {
  constructor() { this.saved = new Map(); this.active = null; this.owner = null; }
  reset(owner) { const key = `${owner?.uid||owner?.seed||''}|${owner?.club||''}`; if (this.owner !== owner || this.key !== key) { this.saved.clear(); this.active = null; this.owner = owner; this.key = key; } }
  switchTo(tab, stack, scroll) {
    if (this.active) this.saved.set(this.active, stack.map((x, i) => ({ ...x, scroll: i === stack.length - 1 ? scroll : x.scroll })));
    const next = this.active === tab ? [{name:tab,params:{}}] : this.saved.get(tab) || [{name:tab,params:{}}];
    this.active = tab; return next.map(x => ({...x}));
  }
}
const lineupState = f => JSON.stringify([f.depth, f.lineupManual]);
// savedAt is save bookkeeping (the store stamps it on every write), not a change to the team: the lineup change itself is saved
// before Undo is offered, so counting it would refuse every Undo.
const lineupContext = f => JSON.stringify({...f, depth:undefined, lineupManual:undefined, polish:undefined, savedAt:undefined});
export function prepareLineupUndo(f) {
  const before = structuredClone({depth:f.depth,manual:f.lineupManual});
  const context = lineupContext(f);
  return () => {
    const after = lineupState(f); let used = false;
    return () => {
      if (used || context !== lineupContext(f) || after !== lineupState(f)) return false;
      used = true; f.depth = before.depth; f.lineupManual = before.manual; return true;
    };
  };
}
export function offseasonSteps(f) {
  const pending=F.offseasonPending(f), lc=F.legendCompliance(f);
  const row=(id,label,done,screen,section=null)=>({id,label,done,screen,section});
  return [
    row('contracts',`${t('polish.contracts')}${pending.length ? ` (${pending.length} Left)` : ''}`, F.offseasonReady(f),'offseason','contracts'),
    row('free-agency',t('polish.free_agency'),!F.task7Offseason(f)||F.freeAgencyDone(f),'offseason','market'),
    row('draft','Draft',F.draftDone(f),'offseason','draft'),
    row('staff','Coaching Staff',!F.nextStaffRole(f),F.nextStaffRole(f)?'hire':'staff'),
    row('hall','Hall of Fame Day',!hallCeremonyDue(f),'hofceremony'),
    row('roster',`Roster Minimum (${f.roster.length}/${F.ROSTER_MIN})`,f.roster.length>=F.ROSTER_MIN,'famarket'),
    row('legendary','Legendary Limit',!lc?.due,'roster'),
    row('lineup','Legal Lineup',!F.lineupWarnings(f).some(x=>x.kind==='base'),'roster'),
    row('career','Career Status',mayStartSeason(f).ok,'hq'),
    row('postseason','Season Decisions',!F.postseasonEvent(f)&&!(f.legendPick&&!f.legendPick.resolved),'hq'),
  ];
}

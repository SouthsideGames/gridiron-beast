// A career owns one league/save identity. Changing jobs swaps the managed club, never recreates the universe.
import { createRng, hashString } from '../core/rng.js';
import { DIVISIONS, divisionOf, RIVAL_GMS, tierById } from '../data/league.js';
import { GYM_BY_CLUB } from '../data/gyms.js';
import { STAFF, STAFF_ROLES } from '../data/staff.js';
import { clubRoster, isProtected, verifyLeague } from './league-registry.js';
import { monsterOverall } from '../data/monsters.js';
import { newContract } from './contracts.js';
import { capCharge } from './fa-contracts.js';
import { t } from '../text/index.js';
export const CAREER_SEASONS = 15;
const emptyCampaign = () => ({badges:{},gymWins:{},titles:0,wins:0,awards:0});
const archived = f => !!f.lifecycle?.legacy;
export function careerSeasons(f) { return (f.history || []).length; }

function stintCampaign(f) {
  const c=f.campaign || emptyCampaign(), base=f.gmCareer?.campaignBaseline || emptyCampaign();
  return {titles:Math.max(0,(c.titles||0)-(base.titles||0)),wins:Math.max(0,(c.wins||0)-(base.wins||0)),awards:Math.max(0,(c.awards||0)-(base.awards||0)),badges:Object.fromEntries(Object.entries(c.badges || {}).filter(([k])=>!base.badges?.[k]))};
}

export function careerTotals(f) {
  const past = f.gmCareer?.stints || [], c = stintCampaign(f);
  return past.reduce((a,s)=> { for(const k of ['titles','wins','awards']) a[k] += s.campaign?.[k] || 0; Object.assign(a.badges,s.campaign?.badges || {}); return a; }, { titles:c.titles || 0,wins:c.wins || 0,awards:c.awards || 0,badges:{...c.badges} });
}
export function ensureGmCareer(f) {
  if(archived(f)) return null;
  return (f.gmCareer ||= {v:1,startedYear:f.history?.[0]?.year || f.season?.year || 1,stintStart:f.history?.[0]?.year || f.season?.year || 1,stints:[],clubs:{},applications:{},movedYear:null});
}
const autoDeclined = x => x.kind==='monster' && x.status==='declined' && x.talks==='closed' && !x.countered && !x.counter;
export function jobWindow(f) {
  if(archived(f) || !f.league?.clubs) return false;
  const s=f.season, last=f.history?.at(-1);
  if(!s?.finished || !s.awards || last?.year!==s.year || !last.awards || careerSeasons(f)>=CAREER_SEASONS || f.lifecycle?.pendingRetirement || f.gmCareer?.movedYear===s.year) return false;
  // Existing saves partway through an offseason can finish it; no rewind of any transaction is permitted.
  // A monster who refuses to talk when the offseason opens is the monster's decision, not the owner's, so it does not close the window.
  if(f.offseason?.items?.some(x=>(x.status && !autoDeclined(x)) || x.counter || x.countered) || f.freeAgency?.period != null || f.draft?.started || f.gmCareer?.closedYear===s.year) return false;
  return true;
}
// Saves from before GM careers have no gmCareer yet; any owner transaction must still close their window.
export function closeJobWindow(f) { if(f.season?.finished && !archived(f)) ensureGmCareer(f).closedYear=f.season.year; }
export function inheritedStaff(f,club) {
  // Dead money and agreed raises saved when the GM left belong to seasons that are over; a return must not charge them again.
  const saved=f.gmCareer?.clubs?.[club]; if(saved?.staff) return {...structuredClone(saved),deadCap:0,pendingDeadCap:0,staffRaise:{}};
  const h=hashString(`${f.seed}|staff|${club}`), staff={};
  for(const [i,role] of STAFF_ROLES.entries()) { const c=STAFF.filter(x=>x.role===role); staff[role]=c[(h+i)%c.length].id; }
  return {staff,staffContracts:Object.fromEntries(STAFF_ROLES.map(role=>[role,newContract(f.season.year,2)])),staffRaise:{},campaign:emptyCampaign(),depth:{},lineupManual:{},deadCap:0,pendingDeadCap:0};
}
const strength = roster => roster.length ? roster.reduce((a,m)=>a+monsterOverall(m),0)/roster.length : 0;
export function jobMarket(f) {
  if(!jobWindow(f)) return [];
  const totals=careerTotals(f), seasons=Math.max(1,careerSeasons(f));
  const recent=(f.history || []).slice(-3), recentGames=recent.reduce((a,h)=>a+(h.record?.w||0)+(h.record?.l||0),0);
  const recentShare=recentGames?recent.reduce((a,h)=>a+(h.record?.w||0),0)/recentGames:.5;
  const expectations=[...(f.gmCareer?.stints || []).flatMap(s=>s.board?.history || []),...(f.board?.history || [])].slice(-3);
  const expectedShare=expectations.length?expectations.reduce((a,h)=>a+Math.max(0,Math.min(1,.5+((h.wins||0)-(h.forecast??h.wins??0))/9)),0)/expectations.length:.5;
  const rep=.35*(totals.wins/(seasons*9))+.4*recentShare+.25*expectedShare+Math.min(.2,totals.titles*.05);
  const clubs=Object.keys(f.league.clubs).filter(c=>c!==f.club && !GYM_BY_CLUB[c]);
  const ranked=clubs.map(club=>({club,roster:clubRoster(f,club)})).sort((a,b)=>strength(a.roster)-strength(b.roster)||a.club.localeCompare(b.club));
  const safety=ranked[0]?.club;
  return ranked.filter(({club})=>club===safety || hashString(`${f.seed}|vacancy|${f.season.year}|${club}`)%3===0).map(({club,roster},i)=>{
    const overall=Math.round(strength(roster)), requirement=overall>=75?.65:overall>=65?.45:.25;
    const approach=club===safety && f.board?.fired || (rep>=requirement+.1 && hashString(`${f.seed}|approach|${f.season.year}|${club}`)%2===0);
    const applied=f.gmCareer?.applications?.[`${f.season.year}|${club}`];
    const accepted=club===safety || rep>=requirement && hashString(`${f.seed}|offer|${f.season.year}|${club}`)%5!==0;
    const inherited=inheritedStaff(f,club), payroll=roster.filter(m=>!isProtected(m)).reduce((a,m)=>a+capCharge(m,f.season.year+1),0)+Object.entries(inherited.staff).reduce((a,[role,id])=>a+Math.round((STAFF.find(s=>s.id===id)?.salary||0)*(inherited.staffRaise?.[role]||1)),0)+(inherited.pendingDeadCap || 0);
    return {club,overall,rebuilding:club===safety,approached:!!approach,applied:!!applied,offered:!!approach || applied==='offered',eligible:accepted,cap:tierById(f.tier).cap,payroll,capRoom:tierById(f.tier).cap-payroll,roster,staff:inherited.staff,expectation:overall>=75?'contend':overall>=65?'playoffs':'rebuild',picks:f.pickOwners || {}};
  });
}
export function applyForJob(f,club) {
  if(!jobWindow(f)) return {ok:false,reason:t('gm.window_closed')};
  const offer=jobMarket(f).find(x=>x.club===club); if(!offer) return {ok:false,reason:t('gm.unavailable')};
  const g=ensureGmCareer(f); const key=`${f.season.year}|${club}`;
  g.applications[key] ||= offer.eligible?'offered':'declined';
  return {ok:true,offered:g.applications[key]==='offered'};
}
const CLUB_FIELDS=['staff','staffContracts','staffRaise','depth','lineupManual','campaign','deadCap','pendingDeadCap','devSlots','postseason','legendPick','captainSelections','staffEval'];
export function acceptJob(f,club,{reopenContracts}={}) {
  if(!jobWindow(f)) return {ok:false,reason:t('gm.window_closed')};
  const offer=jobMarket(f).find(x=>x.club===club); if(!offer?.offered) return {ok:false,reason:t('gm.no_offer')};
  const before=structuredClone(f);
  try {
    const g=ensureGmCareer(f), from=f.club, year=f.season.year, incoming=clubRoster(f,club), clubRecord=f.league.clubs[club];
    if(!incoming.length) throw Error(t('gm.unavailable'));
    const assets=Object.fromEntries(CLUB_FIELDS.filter(k=>k in f).map(k=>[k,structuredClone(f[k])]));
    // Store club state independently from the GM's historical stints; coming back must not restore an old roster.
    g.clubs[from]=assets;
    g.stints.push({club:from,from:g.stintStart,to:year,reason:f.board?.fired?'fired':'accepted-job',campaign:stintCampaign(f),board:structuredClone(f.board || {}),seasons:(f.history || []).filter(h=>h.club===from && h.year>=g.stintStart).map(h=>({year:h.year,record:{...h.record},champion:h.champion===from,playoffs:!!h.playoffs}))});
    const nextAssets=inheritedStaff(f,club);
    // IDs move between the owner array and registry exactly once. Contracts and monster histories are untouched.
    delete f.league.clubs[club];
    for(const m of incoming) delete f.league.monsters[m.id];
    f.league.clubs[from]={roster:f.roster.map(m=>m.id),protected:f.roster.filter(isProtected).map(m=>m.id),strategy:{}};
    for(const m of f.roster) f.league.monsters[m.id]=m;
    f.club=club; f.roster=incoming;
    for(const key of CLUB_FIELDS) { if(key in nextAssets) f[key]=structuredClone(nextAssets[key]); else delete f[key]; }
    f.board={confidence:0,goal:null,history:[],scoutBonusYear:null,fired:false,misses:0};
    f.lineupManual ||= {}; f.depth ||= {}; f.campaign ||= emptyCampaign();
    f.lifecycle={status:'active'}; f.game=null; f.lastGame=null; f.scenes=[]; f.postseason=null; f.legendPick=null;
    const div=DIVISIONS[divisionOf(club)] || [], rivals=div.filter(c=>c!==club), rival=createRng(hashString(`${f.seed}|rival|${club}`)).pick(rivals);
    f.rivals[f.tier]={team:rival,gm:RIVAL_GMS[rival] || 'GM',headToHead:{w:0,l:0}};
    g.campaignBaseline=structuredClone(f.campaign); g.stintStart=year+1; g.movedYear=year; g.applications={};
    // Retain all completed league results, awards and season history. Only future owner decisions are regenerated.
    f.offseason=null; f.draft=null; f.pickAsks={}; f.pendingTrades=[]; f.tradeDesk=null; f.devSlots={manual:[],excluded:[]};
    if(f.freeAgency) { for(const k of Object.keys(f.freeAgency.offers || {})) { const x=f.freeAgency.offers[k]; if(x.club===from && !['signed','rejected'].includes(x.status)) delete f.freeAgency.offers[k]; } }
    if(reopenContracts) reopenContracts(f);
    const problems=verifyLeague(f); if(problems.length) throw Error(problems[0]);
    return {ok:true,from,club};
  } catch(e) { for(const k of Object.keys(f)) delete f[k]; Object.assign(f,before); return {ok:false,reason:e.message}; }
}

export function noteManagedClubSeason(f) {
  for(const [club,data] of Object.entries(f.gmCareer?.clubs || {})) {
    if(club===f.club || data.updatedYear===f.season.year)continue;
    const c=(data.campaign ||= emptyCampaign());
    const results=f.season.results || [];
    c.wins += results.filter(g=>(g.home===club || g.away===club) && (g.winner===club || (!g.winner && (g.home===club?g.homeScore>g.awayScore:g.awayScore>g.homeScore)))).length;
    if(f.season.playoffs?.champion===club)c.titles++;
    c.awards += Object.values(f.season.awards?.league || {}).filter(w=>w?.team===club).length;
    data.updatedYear=f.season.year;
  }
}

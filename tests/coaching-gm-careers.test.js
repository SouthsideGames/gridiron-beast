import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as GM from '../src/franchise/gm-career.js';
import * as L from '../src/franchise/lifecycle.js';
import * as R from '../src/sim/rules.js';
import { selectUnit, requestSubstitution, contactInjuries, setStatInputs } from '../src/sim/substitutions.js';
import { verifyLeague, clubRoster } from '../src/franchise/league-registry.js';
import { frac } from '../src/core/fraction.js';
import { runFranchise } from '../tools/franchise-soak.mjs';
import * as Save from '../src/franchise/save.js';
import { STAFF } from '../src/data/staff.js';
import { PLAYS } from '../src/data/playbook.js';
import { step,aiController,newTendencies } from '../src/sim/game-runner.js';
import { recordGame } from '../src/franchise/stats.js';
const player=(id,quality=70)=>({id,name:id,position:'RB',attrs:{speed:quality,durability:60},permDurability:60});
function rotation(mode='auto',philosophy='balanced') { const a=player('starter'),b=player('reserve'); return {roster:[a,b],offense:{RB:a},defense:{},bench:[b],rotation:{mode,philosophy,depth:{RB:['starter','reserve']}}}; }
function state(){return {seed:3,playCount:1,phase:'scrimmage',quarter:2,score:{home:0,away:0},t8:{stamina:{starter:{capacity:60,stamina:frac(30),exhausted:false}}}};}
function franchise(){const f=F.createFranchise({owner:{first:'Test',last:'GM'},club:'Goldhaven Royals',cornerstoneOffense:'Voltfang',cornerstoneDefense:'Frostclaw',seed:37});F.hireDefaultStaff(f);return f;}
function closed(){const f=franchise();f.draft=null;f.season.finished=true;f.season.awards={league:{}};f.season.playoffs={champion:'Glacier Guardians'};f.history=[{year:1,club:f.club,record:{w:4,l:5,t:0},awards:f.season.awards,leagueStats:{},champion:'Glacier Guardians'}];f.offseason={year:1,items:[]};GM.ensureGmCareer(f);return f;}
test('all three coach philosophies are fixed staff properties',()=>{assert.deepEqual(STAFF.filter(c=>c.role==='head_coach').map(c=>c.substitution).sort(),['balanced','heavy','starters']);});
test('rotation philosophies differ and respect the depth order',()=>{for(const [p,id] of [['heavy','reserve'],['balanced','starter'],['starters','starter']]){const team=rotation('auto',p),s=state();assert.equal(selectUnit(s,team,'home',['RB'],team.offense).RB.id,id);}});
test('manual next-play override survives reload and expires on the following play',()=>{const team=rotation('manual'),s=state();assert.ok(requestSubstitution(s,{home:team},'home','RB','reserve').ok);const loaded=JSON.parse(JSON.stringify(s));assert.equal(selectUnit(loaded,team,'home',['RB'],team.offense).RB.id,'reserve');loaded.playCount++;assert.equal(selectUnit(loaded,team,'home',['RB'],team.offense).RB.id,'starter');});
test('injury and exhaustion cannot be bypassed in manual mode',()=>{const team=rotation('manual'),s=state();s.rotation={active:{},manual:{},injuries:{starter:{severity:'Minor',weeks:1}},notices:[]};assert.equal(requestSubstitution(s,{home:team},'home','RB','starter').ok,false);assert.equal(selectUnit(s,team,'home',['RB'],team.offense).RB.id,'reserve');});
// Balance audit R-6 (owner decision 2026-11-25): an emptied base slot now takes an emergency cover (a spare RB at WR1); the test asserted
// the old "no fallback" rule and is updated to the approved design. Nobody occupies two slots, and the RB slot keeps its own RB.
test('no monster can occupy two slots; an empty base slot takes only a legal emergency cover',()=>{const team=rotation(),s=state();const u=selectUnit(s,team,'home',['RB','WR1'],team.offense);assert.equal(u.RB.id,'starter');assert.equal(u.WR1.id,'reserve','the spare RB covers WR1');const t2=rotation();t2.roster=[t2.roster[0]];t2.bench=[];assert.equal(selectUnit(state(),t2,'home',['RB','WR1'],t2.offense).WR1.id,null,'no spare: the slot stays empty');});
test('stat writers credit the actual reserve, including performance',()=>{const team=rotation(),s=R.newGame({home:{...team,id:'h',name:'Home'},away:{...team,id:'a',name:'Away'}});setStatInputs(s,'home',{RB:team.bench[0]});R.recordPlayerStats(s,{names:{off:{RB:'reserve'},def:{}},result:'tackle',yards:5,stats:{carrier:'RB'},events:[]},'home','away');assert.equal(s.stats.home.players.reserve.rushYds,5);assert.equal(s.stats.home.players.starter,undefined);});
test('a fired GM has at least one real offer and career cap still ends at 15',()=>{const f=closed();f.board={fired:true};const offers=GM.jobMarket(f);assert.ok(offers.some(o=>o.rebuilding&&o.offered));assert.equal(L.retirementDue(f),null);while(f.history.length<15)f.history.push({...f.history[0],year:f.history.length+1});assert.equal(L.SEASON_CAP,15);assert.equal(L.retirementDue(f),'season-cap');assert.equal(GM.jobMarket(f).length,0);});
test('GM move transfers control without duplicating identities or altering contracts/picks/history',()=>{const f=closed();const job=GM.jobMarket(f).find(o=>o.rebuilding);assert.ok(GM.applyForJob(f,job.club).offered);const source=f.club,oldIds=f.roster.map(m=>m.id),expiring=new Set(f.roster.filter(m=>m.contract?.ends===f.season.year).map(m=>m.id)),newIds=job.roster.map(m=>m.id),contracts=JSON.stringify(job.roster.map(m=>m.contract)),uid=f.uid,history=JSON.stringify(f.history),rng=f.rngState;const r=F.acceptGmJob(f,job.club);assert.ok(r.ok,r.reason);assert.equal(f.uid,uid);assert.equal(f.rngState,rng);assert.deepEqual(f.roster.map(m=>m.id),newIds);{const left=new Set(clubRoster(f,source).map(m=>m.id)),gone=oldIds.filter(id=>!left.has(id)),dep=f.gmCareer.stints.at(-1).departure;assert.deepEqual(clubRoster(f,source).map(m=>m.id),oldIds.filter(id=>left.has(id)),'the former club keeps its roster in order');assert.equal(gone.length,dep.walked+dep.released,'only the departure contract settlement removes anyone');assert.ok(gone.every(id=>expiring.has(id)||dep.released),'walkers had expiring contracts');}assert.equal(JSON.stringify(f.roster.map(m=>m.contract)),contracts);assert.equal(JSON.stringify(f.history),history);assert.equal(f.board.fired,false);assert.deepEqual(verifyLeague(f),[]);assert.equal(GM.jobMarket(f).length,0);const loaded=JSON.parse(JSON.stringify(f));assert.deepEqual(verifyLeague(loaded),[]);assert.equal(loaded.gmCareer.stints[0].club,source);});
test('moves close after a contract decision and archives cannot mutate',()=>{const f=closed();f.offseason.items=[{status:'signed'}];assert.equal(GM.jobWindow(f),false);f.offseason.items=[];f.lifecycle={legacy:{},status:'retired'};const before=JSON.stringify(f);assert.equal(F.applyForGmJob(f,'Glacier Guardians').ok,false);assert.equal(JSON.stringify(f),before);});
// 32-club league (owner, 2026-11-23): badges belong to the coach and travel in the campaign, so the badges held are the campaign's own
// (a badge of an earlier stint that was lost back to its Gym Leader no longer counts). Wins, titles and awards still add up over stints.
test('career Hall totals span stints but club campaign stays separate; the badges held are the ones the coach carries now',()=>{const f=closed();f.gmCareer.stints=[{campaign:{wins:20,titles:2,awards:1,badges:{old:{year:1},lost:{year:1}}}}];f.campaign={wins:5,titles:0,awards:2,badges:{old:{year:1},new:{year:2}}};assert.deepEqual(GM.careerTotals(f),{wins:25,titles:2,awards:3,badges:{old:{year:1},new:{year:2}}});assert.equal(f.campaign.wins,5);});

test('real seasons continue through a job change with lossless save/load and intact former club', {timeout:180000}, () => {
  let from,to,uid,moved=false;
  const result=runFranchise(37,{difficulty:'rookie',seasons:2,beforeOffseason:(f,n)=>{
    if(n!==1)return;
    from=f.club;uid=f.uid;
    const offer=F.gmJobMarket(f).find(o=>o.rebuilding);assert.ok(offer,'a real vacancy exists after the season');
    assert.equal(F.applyForGmJob(f,offer.club).offered,true);
    const r=F.acceptGmJob(f,offer.club);assert.ok(r.ok,r.reason);to=offer.club;moved=true;
    const loaded=Save.importJson(Save.exportJson(f));assert.equal(loaded.club,to);assert.equal(loaded.uid,uid);assert.deepEqual(verifyLeague(loaded),[]);
  }});
  assert.ok(moved);assert.equal(result.f.club,to);assert.equal(result.f.uid,uid);assert.equal(result.f.history[0].club,from);assert.equal(result.f.history[1].club,to);
  assert.deepEqual(result.problems,[]);assert.deepEqual(verifyLeague(result.f),[]);
});

test('contact injuries are deterministic, persist through reload, and force a healthy replacement',()=>{
  const team=rotation('manual'), sim={result:'tackle',stats:{carrier:'RB'},events:[]}; let injured;
  for(let seed=1;seed<=10000;seed++) { const s=state();s.seed=seed;contactInjuries(s,{offense:{RB:team.offense.RB},defense:{}},sim);if(s.rotation.injuries.starter){injured=s;break;} }
  assert.ok(injured,'contact injury occurs within a deterministic seed search');
  const twin=state();twin.seed=injured.seed;contactInjuries(twin,{offense:{RB:team.offense.RB},defense:{}},sim);
  assert.deepEqual(twin.rotation.injuries,injured.rotation.injuries);
  const loaded=JSON.parse(JSON.stringify(injured));const injury=JSON.stringify(loaded.rotation.injuries);
  assert.equal(selectUnit(loaded,team,'home',['RB'],team.offense).RB.id,'reserve');contactInjuries(loaded,{offense:{RB:team.offense.RB},defense:{}},sim);
  assert.equal(JSON.stringify(loaded.rotation.injuries),injury,'an injured monster is not rerolled');
});

test('job market screen renders real offers, roster, staff and pick ownership without changing the save',async()=>{
  const {registerGmJobs}=await import('../src/ui/gm-jobs-ui.js');const f=closed();const before=JSON.stringify(f);let screen;
  registerGmJobs({registerScreen:(name,value)=>{assert.equal(name,'gm-jobs');screen=value;}},{f});
  const html=screen.render({f});assert.match(html,/GM Career/);assert.match(html,/Draft Picks/);assert.match(html,/Inherited Staff/);assert.match(html,/Apply/);assert.equal(JSON.stringify(f),before);
});

test('moving jobs round-trips through the real slot store, not just JSON export',async()=>{
  const {createStore,memoryBackend}=await import('../src/franchise/store.js');
  const f=closed(),job=F.gmJobMarket(f).find(o=>o.rebuilding);F.applyForGmJob(f,job.club);assert.ok(F.acceptGmJob(f,job.club).ok);
  const backend=memoryBackend(),store=createStore({backend,localStorage:null,debounce:0});await store.open();
  assert.ok((await store.replace(f,null,{})).ok);const loaded=await createStore({backend,localStorage:null,debounce:0}).open();
  assert.equal(loaded.franchise.club,f.club);assert.deepEqual(loaded.franchise.gmCareer,f.gmCareer);assert.deepEqual(verifyLeague(loaded.franchise),[]);
});

test('an injured optional-package receiver removes that call, not a playable team',()=>{
  const f=franchise(),home=F.playerTeam(f),away=F.aiTeam(f,Object.keys(f.league.clubs)[0]);
  const counts=p=>p.onField.filter(sl=>sl.startsWith('WR')).length;
  const blocked=Object.values(PLAYS).find(p=>p.side==='offense' && counts(p)===3),fallback=PLAYS.inside_zone;
  assert.ok(blocked);assert.ok(counts(fallback)<3);
  home.offensePlays=[blocked.id,fallback.id];
  const s=R.newGame({home,away,seed:401});s.phase='scrimmage';s.possession='home';s.ballOn=25;
  s.rotation={active:{},manual:{},injuries:Object.fromEntries(home.roster.filter(p=>p.position==='WR').slice(2).map(p=>[p.id,{severity:'Minor',weeks:1}])),notices:[]};
  const ev=step(s,{home,away},{home:aiController('home'),away:aiController('away')},{home:newTendencies(),away:newTendencies()},{offensePlayId:blocked.id});
  assert.equal(ev.offensePlayId,fallback.id);assert.equal(s.forfeit,undefined);assert.ok(ev.sim);
});

// Review fixes (PR #125 handoff)
test('a monster refusing to talk when the offseason opens does not close the job window; an owner decision does',()=>{
  const f=closed();f.offseason.items=[{kind:'monster',id:f.roster[0].id,status:'declined',talks:'closed'}];
  assert.equal(GM.jobWindow(f),true,'automatic refusal is not an owner transaction');assert.ok(GM.jobMarket(f).length);
  f.offseason.items[0].countered='refused';assert.equal(GM.jobWindow(f),false,'a refused counter is an owner negotiation');
});
test('roster, staff and market transactions after the season commit the GM; a dismissed GM cannot make them',()=>{
  const pick=f=>[...f.roster].sort((a,b)=>b.salary-a.salary).find(m=>f.roster.filter(x=>x.position===m.position).length>1);
  const other=f=>STAFF.find(c=>c.role==='head_coach'&&c.id!==f.staff.head_coach).id;
  for(const [name,act] of [['release',f=>F.releaseMonster(f,pick(f).id)],['staff',f=>F.replaceStaff(f,other(f))]]) {
    const f=closed();assert.equal(F.gmJobWindow(f),true);const r=act(f);assert.ok(r.ok,`${name}: ${r.reason}`);
    assert.equal(F.gmJobWindow(f),false,`${name} closes the window`);assert.equal(F.gmJobMarket(f).length,0);
    const fired=closed();fired.board={fired:true};const ids=JSON.stringify(fired.roster.map(m=>m.id)),staff=JSON.stringify(fired.staff);
    assert.equal(act(fired).ok,false,`${name} refused for a dismissed GM`);assert.equal(JSON.stringify(fired.roster.map(m=>m.id)),ids);assert.equal(JSON.stringify(fired.staff),staff);
    assert.equal(F.gmJobWindow(fired),true,'the dismissed GM can still find a job');
  }
  const legacy=closed();delete legacy.gmCareer;assert.ok(F.releaseMonster(legacy,pick(legacy).id).ok);assert.equal(F.gmJobWindow(legacy),false,'a save from before GM careers closes too');
});
test('returning to a former club does not charge its old dead money again',()=>{
  const f=closed();f.gmCareer.clubs['Glacier Guardians']={...GM.inheritedStaff(f,'Glacier Guardians'),deadCap:900,pendingDeadCap:1200,staffRaise:{head_coach:1.2}};
  const back=GM.inheritedStaff(f,'Glacier Guardians');assert.equal(back.deadCap,0);assert.equal(back.pendingDeadCap,0);
  assert.deepEqual(back.staffRaise,{head_coach:1.2},'a running staff contract keeps its agreed salary');
  assert.equal(f.gmCareer.clubs['Glacier Guardians'].pendingDeadCap,1200,'the stored stint record is not changed');
});
test('a dismissed GM is never stuck: a refusal at offseason open and refused transactions leave the job market open with an offer',()=>{
  const f=closed();f.board={fired:true};f.offseason.items=[{kind:'monster',id:f.roster[0].id,status:'declined',talks:'closed'}];
  assert.equal(F.releaseMonster(f,f.roster.find(m=>f.roster.filter(x=>x.position===m.position).length>1).id).ok,false);
  assert.equal(F.resolveContract(f,f.roster[0].id,'sign').ok,false);
  assert.equal(L.retirementDue(f),null);assert.equal(F.gmJobWindow(f),true);assert.ok(F.gmJobMarket(f).some(o=>o.offered),'the safety club offers a job');
});
test('rotation starts from the engine choice: a Legendary Play keeps its Legendary, and a monster the engine placed (a staged Ability Review subject) stays',()=>{
  const team=rotation('auto','heavy');team.roster[0].species='legend';
  const s=state();assert.equal(selectUnit(s,team,'home',['RB'],team.offense).RB.id,'reserve','a tired starter rests under Heavy Rotation');
  const unit=R.pickSlots(team.offense,['RB'],team,{legendary:{slot:'RB',species:'legend'}},state(),'home');assert.equal(unit.RB.id,'starter','the Legendary the play is built around stays on');
  const t2=rotation();t2.chart={RB:'starter'};assert.equal(selectUnit(state(),t2,'home',['RB'],{RB:t2.bench[0]}).RB.id,'reserve','the lineup the engine was given wins over the stored chart');
  const t3=rotation(),borrowed={...t3.bench[0],borrowed:true};const u3=selectUnit(state(),t3,'home',['RB','TE'],{RB:t3.offense.RB,TE:borrowed});
  assert.equal(u3.TE.id,'reserve','a monster the engine placed outside its listed position is not dropped (no empty slot, no forfeit)');assert.equal(u3.RB.id,'starter');
});
test('the club the GM leaves settles its expiring contracts by the AI renewal negotiation, in the same offseason', {timeout:180000}, () => {
  let checked=false;
  runFranchise(37,{difficulty:'rookie',seasons:1,beforeOffseason:(f,n)=>{
    if(n!==1)return;
    const year=f.season.year, from=f.club, expiring=f.roster.filter(m=>m.contract?.ends===year&&!m.legendary);
    assert.ok(expiring.length>=2,'the owner club has expiring contracts');
    // the first refuses to talk to his club this window: under the AI rules he walks, however valuable
    const refuser=expiring[0];F.gmJobMarket(f);
    const key=`${refuser.id}|${from}|${refuser.contract.ends}|renew`;f.freeAgency.talks ||= {};f.freeAgency.talks[key]={...(f.freeAgency.talks[key]||{key,mid:refuser.id,club:from,window:'renew',offers:[]}),state:'no-talks'};
    const offer=F.gmJobMarket(f).find(o=>o.rebuilding);F.applyForGmJob(f,offer.club);const r=F.acceptGmJob(f,offer.club);assert.ok(r.ok,r.reason);
    const roster=new Map(clubRoster(f,from).map(m=>[m.id,m]));
    assert.equal(roster.has(refuser.id),false,'a monster who will not talk is not re-signed');
    for(const m of expiring.slice(1)) { const now=roster.get(m.id); if(now) assert.ok(now.contract.ends>year,`${m.name} re-signed into next season`); }
    assert.ok(f.league.clubs[from].strategy.mode,'the former club has a strategy mode for its renewals');
    assert.equal(f.gmCareer.stints.at(-1).club,from);assert.ok(f.gmCareer.stints.at(-1).departure.walked>=1);
    assert.deepEqual(verifyLeague(f),[]);checked=true;
  }});
  assert.ok(checked);
});
test('returning to a former club keeps staff contract dates: only expired contracts come up for renewal', () => {
  const f=closed();f.board={fired:true};const year=f.season.year;
  const safety=GM.jobMarket(f).find(o=>o.rebuilding).club, base=GM.inheritedStaff(f,safety), roles=Object.keys(base.staff);
  const contracts=Object.fromEntries(roles.map((role,i)=>[role,i===0?{signed:year-2,ends:year,years:2}:{signed:year,ends:year+1,years:2}]));
  const raise=Object.fromEntries(roles.map(role=>[role,1.2]));
  f.gmCareer.clubs[safety]={...base,staffContracts:contracts,staffRaise:raise};
  assert.ok(F.acceptGmJob(f,safety).ok);
  const staffItems=(f.offseason?.items||[]).filter(i=>i.kind==='staff').map(i=>i.role);
  assert.deepEqual(staffItems,[roles[0]],'only the expired contract needs renewal');
  for(const role of roles.slice(1)) { assert.deepEqual(f.staffContracts[role],contracts[role],`${role} keeps its expiration`); assert.equal(f.staffRaise[role],1.2,`${role} keeps its agreed salary`); }
  assert.equal(f.staffRaise[roles[0]],1.2,'the expired contract renews from its last salary, as a normal renewal');
});
test('rotation notices: one brief line per play for routine changes, injuries and their replacements at once, details in the panel', async () => {
  const { substitutionStrip } = await import('../src/ui/coaching-substitutions.js');
  const { playNotices } = await import('../src/sim/substitutions.js');
  const mk=(id,pos,q=70)=>({id,name:id,position:pos,attrs:{speed:q,durability:60},permDurability:60});
  const a=[mk('rb1','RB'),mk('wr1','WR'),mk('wr2','WR')], b=[mk('rb2','RB'),mk('wr3','WR'),mk('wr4','WR')];
  const team={roster:[...a,...b],offense:{RB:a[0],WR1:a[1],WR2:a[2]},defense:{},bench:b,rotation:{mode:'auto',philosophy:'heavy',depth:{RB:['rb1','rb2'],WR:['wr1','wr2','wr3','wr4']}}};
  const slots=['RB','WR1','WR2'], s=state(); s.t8.stamina={}; s.phase='scrimmage';
  selectUnit(s,team,'home',slots,team.offense); // play 1: the starters
  s.playCount=2; for(const p of a) s.t8.stamina[p.id]={capacity:60,stamina:frac(20),exhausted:false};
  selectUnit(s,team,'home',slots,team.offense); // play 2: three tired starters rest
  const f={game:{state:s,playerSide:'home'}};
  let html=substitutionStrip(f), n=playNotices(s,'home');
  assert.equal(n.routine.length,3);assert.equal((html.match(/<p/g)||[]).length,1,'three routine changes are one line');assert.match(html,/changes for this play: 3\./);
  // play 3: the reserve RB is hurt on contact; the injury and his replacement show before the next snap, one line each
  s.playCount=3; contactInjuries(s,{offense:{RB:{...b[0]}},defense:{}},{result:'tackle',stats:{carrier:'RB'},events:[]},{offenseSide:'home'});
  if(!s.rotation.injuries.rb2) { s.rotation.injuries.rb2={severity:'Minor',weeks:1}; s.rotation.notices.push({side:'home',slot:'RB',id:'rb2',name:'rb2',reason:'injury',play:3}); }
  assert.equal(substitutionStrip(f).match(/is injured/g).length,1,'the injury is shown at once');
  selectUnit(s,team,'home',slots,team.offense); // the screen chooses the coming snap's lineup
  n=playNotices(s,'home'); html=substitutionStrip(f);
  assert.equal(n.replacements.length,1);assert.equal(n.replacements[0].slot,'RB');assert.match(html,/replacing an injured teammate/);
  assert.doesNotMatch(html,/play: 3\./,'earlier plays are not repeated');
  assert.equal(n.injuries[0].side,'home','an injury records its club');
});

import fs from 'node:fs';
const R='/home/claude/gridiron-beast/src';
const { migrate } = await import(R+'/franchise/save.js'); const Reg = await import(R+'/franchise/league-registry.js');
const { tierById } = await import(R+'/data/league.js'); const { isGymClub } = await import(R+'/data/gyms.js');
for (const file of ['base-save.json','inj-save.json','old-106-15.json']) {
  const raw = JSON.parse(fs.readFileSync('/home/claude/t6work/saves/'+file,'utf8')); const f = migrate(raw.franchise||raw.core||raw)||raw; if (!Reg.hasLeague(f)) continue;
  const cap = tierById(f.tier).cap; const rows=[];
  for (const c of Reg.leagueClubs(f)) { const ro = Reg.clubRoster(f,c); const prot = ro.filter(Reg.isProtected).reduce((s,m)=>s+(m.salary||0),0); const room = Reg.clubCapRoom(f,c,cap); rows.push({c, gym:isGymClub(c), room, prot, roomIfCounted: room-prot}); }
  const g=rows.filter(r=>r.gym), o=rows.filter(r=>!r.gym); const avg=(a,k)=>Math.round(a.reduce((s,x)=>s+x[k],0)/a.length);
  console.log(file,'cap',cap,'gym avg room',avg(g,'room'),'protected avg',avg(g,'prot'),'gym avg room if counted',avg(g,'roomIfCounted'),'gyms negative if counted',g.filter(r=>r.roomIfCounted<0).length,'ordinary avg room',avg(o,'room'), 'ordinary with signature', o.filter(r=>r.prot>0).map(r=>r.prot));
}

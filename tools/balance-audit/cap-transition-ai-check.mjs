import fs from "node:fs"; globalThis.__fs = fs;
// D-1 check (investigation only): loads a legacy save, plays to the next season and reports every AI club against the Task 7 cap rules (committed <= cap, usable >= 0).
// node tools/balance-audit/cap-transition-ai-check.mjs save.json
const root=new URL('../..', import.meta.url).pathname.replace(/\/$/, ''); const imp=(p)=>import(root+'/'+p);
const Soak=await imp('tools/franchise-soak.mjs'); const Save=await imp('src/franchise/save.js'); const F=await imp('src/franchise/franchise.js'); const E=await imp('src/franchise/fa-engine.js'); const Reg=await imp('src/franchise/league-registry.js');
const raw=Save.importJson(require_fs().readFileSync(process.argv[2],'utf8')); let f=raw.franchise||raw.f||raw;
function require_fs(){return globalThis.__fs}
const snap=(label)=>{const clubs=Reg.leagueClubs(f).filter(c=>c!==f.club); const r=clubs.map(c=>({c,committed:E.committed(f,c),cap:E.capOf(f,c),usable:E.usableCap(f,c)})); const over=r.filter(x=>x.committed>x.cap); const negU=r.filter(x=>x.usable<0);
 console.log(label,'y'+f.season.year,'cap',E.capOf(f,f.club),'AI committed>cap:',over.length, over.map(x=>x.c+':'+(x.committed-x.cap)).join(','),'| AI usable<0:',negU.length,negU.map(x=>x.c+':'+x.usable).join(','),'| owner committed',E.committed(f,f.club),'usable',E.usableCap(f,f.club));};
snap('loaded'); const r=Soak.runFranchise(0,{from:f,seasons:1,check:()=>[],onSeason:(x)=>{f=x}}); f=r.f||f; snap('season over (after offseason)'); const n=F.startNextSeason(f,{acceptForfeits:true}); snap('next season start '+n.ok);

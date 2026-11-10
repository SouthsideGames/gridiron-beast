#!/usr/bin/env node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const file='docs/task8/m6/ai-20-season-seed-1.json',raw=fs.readFileSync(file),x=JSON.parse(raw),r=x.runs[0];
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const round=v=>Math.round(v*100)/100;
const stats=a=>({min:Math.min(...a),mean:round(mean(a)),max:Math.max(...a)});
const checkpoints=[5,10,15,20].map(year=>{const rows=r.rows.filter(v=>v.year===year&&!v.owner),s=r.v4.seasons.find(v=>v.year===year);return {year,clubs:rows.length,lineupProblems:rows.reduce((n,v)=>n+v.lineupProblems,0),roster:stats(rows.map(v=>v.rosterSize)),teamOverall:stats(rows.map(v=>v.teamOvr)),capRoom:stats(rows.map(v=>v.capRoom)),capRoomPercent:stats(rows.map(v=>100*v.capRoom/(s.fa.cap[v.club][0]+s.fa.cap[v.club][1]+s.fa.cap[v.club][2]))),meanLevel:stats(rows.map(v=>v.meanLevel)),legendarySideViolations:Object.values(s.fa?.legends||{}).filter(([o,d])=>o>1||d>1).length,marketProblems:s.fa?.marketProblems||[]};});
const all=r.rows.filter(v=>!v.owner);
const out={source:'f716b02c41c81211d80e7389dc0cefd4c16ae155',sourceTree:'d4e36b76eae24ca7c4aac9fbdc8f13e588f8afd2',sourceRuntimeTree:'d41e19b526528aae1716c2a742ce9fbf1781323d',rawFile:file,rawSHA256:createHash('sha256').update(raw).digest('hex'),benchmarkHash:x.hash,seed:r.seed,seasons:r.seasons,errors:x.runs.filter(v=>v.error).length,problems:r.problems,problemCount:r.problemCount,wallSeconds:r.seconds,peakHeapMB:r.peakHeapMB,scope:'Single-seed production health diagnostic; not statistical balance or CPU acceptance.',checkpoints,allAIClubSeasons:{rows:all.length,lineupProblems:all.reduce((n,v)=>n+v.lineupProblems,0),negativeCapRoom:all.filter(v=>v.capRoom<0).length,capRoom:stats(all.map(v=>v.capRoom)),teamOverall:stats(all.map(v=>v.teamOvr)),trades:r.decisions.trades.length},limitations:['Apex/Temper/mastery are not explicitly recorded by v4 schema','End-of-season cap room is not in-season offer pressure','Single seed cannot establish balance','Final integrated build must be retested']};
fs.writeFileSync('docs/task8/m6/franchise-summary.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));

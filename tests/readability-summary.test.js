import test from 'node:test';
import assert from 'node:assert/strict';
import {boxScoreHtml} from '../src/ui/box-score.js';
import * as R from '../src/sim/rules.js';
import {generatedTeam} from '../src/franchise/roster.js';
import {overheadSvg} from '../src/ui/fx/overhead.js';
import {decodeUiWav} from '../src/audio/decode-ui-wav.js';

test('a club without a sack gets a readable empty label while the opposing leader keeps its name',()=>{
 const teams={home:generatedTeam(1,{id:'a',name:'Cinder Owls',quality:50}),away:generatedTeam(2,{id:'h',name:'Stonehaven Titans',quality:50})},state=R.newGame({home:teams.home,away:teams.away,seed:3,first:'home',choice:'receive'});
 state.stats.home.players={DL1:{sacks:1}};
 const html=boxScoreHtml(state,teams),row=html.match(/<div class="bs-row">[^]*?SACKS[^]*?<\/div><\/div><\/div>/i);
 assert.ok(row);assert.match(row[0],/None recorded/);assert.doesNotMatch(row[0],/>·</);
 assert.ok(html.includes(teams.home.defense.DL1.name));
});
test('charge and cooldown render at the beast base without overhead bars or numeric clutter',()=>{
 for(const charge of [{n:1,max:3},{cd:2,cdMax:4},{ready:true,max:3}]){
  const state={hud:{'home:WR1':{charge}},badges:[],items:[],spends:[]},before=JSON.stringify(state);
  const svg=overheadSvg(state,0,()=>[10,20],{});
  assert.match(svg,/class="ability-readiness"/);assert.match(svg,/translate\(11.65 20.65\)/);
  assert.doesNotMatch(svg,/<rect|<text|NaN/);assert.equal(JSON.stringify(state),before);
 }
});
test('malformed and truncated UI files are rejected before creating audio sources',()=>{
 for(const bytes of [new ArrayBuffer(0),new ArrayBuffer(44)])assert.throws(()=>decodeUiWav({},bytes),/Invalid UI WAV/);
});

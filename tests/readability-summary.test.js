import test from 'node:test';
import assert from 'node:assert/strict';
import {boxScoreHtml} from '../src/ui/box-score.js';
import * as R from '../src/sim/rules.js';
import {generatedTeam} from '../src/franchise/roster.js';
import {overheadSvg} from '../src/ui/fx/overhead.js';
import {decodeUiWav} from '../src/audio/decode-ui-wav.js';

test('a club without a sack gets a readable empty label while the opposing leader keeps its name',()=>{
 const teams={home:generatedTeam(1,{id:'a',name:'Cinder Owls',quality:50}),away:generatedTeam(2,{id:'h',name:'Stonehaven Bastions',quality:50})},state=R.newGame({home:teams.home,away:teams.away,seed:3,first:'home',choice:'receive'});
 state.stats.home.players={DL1:{sacks:1}};
 const html=boxScoreHtml(state,teams),row=html.match(/<div class="bs-row">[^]*?SACKS[^]*?<\/div><\/div><\/div>/i);
 assert.ok(row);assert.match(row[0],/None recorded/);assert.doesNotMatch(row[0],/>·</);
 assert.ok(html.includes(teams.home.defense.DL1.name));
});
test('charge bars are available between plays and absent throughout live/replay frames',()=>{
 for(const charge of [{n:1,max:3},{cd:2,cdMax:4},{ready:true,max:3}]){
  const state={hud:{'home:WR1':{charge}},badges:[],items:[],spends:[]},before=JSON.stringify(state);
  const playing=overheadSvg(state,0,()=>[10,20],{});
  assert.doesNotMatch(playing,/ability-readiness|<rect|<circle/);
  const selecting=overheadSvg(state,0,()=>[10,20],{showReadiness:true});
  assert.match(selecting,/class="ability-readiness"/);assert.match(selecting,/<rect/);
  assert.doesNotMatch(selecting,/<circle|NaN/);assert.equal(JSON.stringify(state),before);
 }
});
test('malformed and truncated UI files are rejected before creating audio sources',()=>{
 for(const bytes of [new ArrayBuffer(0),new ArrayBuffer(44)])assert.throws(()=>decodeUiWav({},bytes),/Invalid UI WAV/);
});

test('team sack totals credit the defense, using the opposing offense sacks taken',()=>{
 const teams={home:generatedTeam(3,{id:'h',name:'Home'}),away:generatedTeam(4,{id:'a',name:'Away'})};
 const state=R.newGame({home:teams.home,away:teams.away,seed:3,first:'home',choice:'receive'});
 state.stats.home.sacks=2;state.stats.away.sacks=5;
 const before=JSON.stringify(state),html=boxScoreHtml(state,teams);
 assert.match(html,/<td>2<\/td><td class="dim">Sacks<\/td><td>5<\/td>/i);
 assert.doesNotMatch(html,/Sacks taken/i);assert.equal(JSON.stringify(state),before);
});

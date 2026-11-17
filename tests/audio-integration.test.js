import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MusicPlayer,musicForScreen,MUSIC_TRACKS } from '../src/audio/music.js';
import { monsterCryId } from '../src/audio/detail-audio.js';
import { audioPreferences,setAudioPreferences } from '../src/audio/context.js';
function fixture({deferred=false}={}){
 const media=[],ramps=[];let hidden=false;
 const connection=()=>({connect(){return this;},disconnect(){}});
 const context={state:'running',currentTime:0,createMediaElementSource:connection,createGain(){return{...connection(),gain:{value:0,cancelAndHoldAtTime(){},linearRampToValueAtTime(value,time){ramps.push([value,time]);}}};}};
 const player=new MusicPlayer({context:()=>context,bus:connection,fadeMs:5,hidden:()=>hidden,createMedia:()=>{const m={currentTime:0,duration:180,paused:true,events:{},play(){this.paused=false;return deferred?new Promise(resolve=>{this.resolve=resolve;}):Promise.resolve();},pause(){this.paused=true;},removeAttribute(){},load(){},addEventListener(e,fn){this.events[e]=fn;}};media.push(m);return m;}});
 return{player,media,ramps,context,hide:()=>{hidden=true;}};
}
test('approved tracks map to actual scenes; hubs share one song; football is quiet',()=>{
 for(const name of ['menu','hq','draft','offseason','training','roster','famarket','dex'])assert.equal(musicForScreen(name),'main');
 for(const [screen,id] of [['pregame','pregame'],['clash-battle','clash'],['ceremony','championship'],['match',null],['monster-cry-reviewer',null]])assert.equal(musicForScreen(screen),id);
 assert.equal(musicForScreen('settings'),undefined);assert.equal(musicForScreen('developer'),undefined);for(const path of Object.values(MUSIC_TRACKS))assert.ok(fs.statSync(new URL('../'+path,import.meta.url)).size>100000);
});
test('same-track navigation never restarts; changed music fades both ways; silent scenes fade out',async()=>{
 const {player:p,media,ramps}=fixture();await p.select('main');const first=p.current;await p.select('main');assert.equal(media.length,1);await p.select('clash');assert.equal(p.outgoing,first);assert.ok(ramps.some(x=>x[0]===0));assert.ok(ramps.some(x=>x[0]===1));
 const previous=p.outgoing;await p.select('clash');assert.equal(p.outgoing,previous);assert.equal(media.length,2);
 await p.select(null);const fading=p.outgoing;await p.select(null);assert.equal(p.outgoing,fading);p.pause();assert.ok(media.every(m=>m.paused));
});
test('rapid navigation cancels late loads and permits only current/outgoing voices',async()=>{
 const {player:p,media}=fixture({deferred:true});const a=p.select('main');await p.select('main');assert.equal(media.length,1);const b=p.select('clash');media[1].resolve();await b;media[0].resolve();await a;assert.equal(p.current.id,'clash');assert.ok(media[0].paused);p.pause();assert.ok(media.every(m=>m.paused));
});
test('backgrounding cancels pending music; returns to the desired track on resume with position',async()=>{
 const {player:p,media}=fixture();await p.select('main');media[0].currentTime=42;p.pause();assert.equal(p.desired,'main');await p.select(p.desired);media[1].events.loadedmetadata();assert.equal(media[1].currentTime,42);p.pause();
 const f=fixture({deferred:true});const run=f.player.select('pregame');f.hide();f.player.pause();f.media[0].resolve();await run;assert.equal(f.player.current,null);
});
test('loop seam uses a second streaming player and a short fade, with no missed ended fallback',async()=>{
 const {player:p,media}=fixture();await p.select('pregame');media[0].currentTime=179.8;media[0].events.timeupdate();await new Promise(r=>setImmediate(r));assert.equal(media.length,2);assert.equal(p.current.id,'pregame');assert.notEqual(p.current.media,media[0]);p.pause();
});
test('detail cry resolves actual evolution, ignores unknown identity and preferences persist independently',()=>{
 assert.equal(monsterCryId({species:'drakeling',stage:2}),'drakeling:2');assert.equal(monsterCryId('drakeling'),'drakeling:0');assert.equal(monsterCryId({species:'unknown'}),null);
 const saved=new Map();globalThis.localStorage={setItem:(k,v)=>saved.set(k,v)};assert.equal(setAudioPreferences({muted:true,music:.2,sfx:.7,crowd:.5,cries:.7}),true);assert.deepEqual(audioPreferences(),{muted:true,music:.2,sfx:.7,crowd:.5,cries:.7});assert.equal(saved.size,1);assert.ok(saved.has('gridiron-beast-audio-v1'));setAudioPreferences({muted:false,music:.45,cries:.65});delete globalThis.localStorage;
});
test('detail opens cry once; training/mastery redraws stay silent; moving to another monster plays its form',async()=>{
 const {routeDetailAudio}=await import('../src/audio/detail-audio.js');const heard=[];let stops=0;const hooks={play:m=>heard.push(monsterCryId(m)),stop:()=>stops++};const f={roster:[{id:'a',species:'drakeling',stage:0},{id:'b',species:'drakeling',stage:2}]};
 routeDetailAudio('monster',{f,params:{id:'a'},entering:true},hooks);routeDetailAudio('monster',{f,params:{id:'a'},entering:false},hooks);routeDetailAudio('monster',{f,params:{id:'b'},entering:true},hooks);routeDetailAudio('hq',{f,params:{},entering:true},hooks);assert.deepEqual(heard,['drakeling:0','drakeling:2']);assert.equal(stops,3);
});
test('sound-effects and crowd volume update their own buses and master mute covers every category',async()=>{
 const {audioBus}=await import('../src/audio/context.js');const nodes=[];
 class AC{constructor(){this.currentTime=0;this.destination={};}createGain(){const node={gain:{value:1,setTargetAtTime(v){this.value=v;}},connect(to){this.to=to;return this;}};nodes.push(node);return node;}}
 globalThis.AudioContext=AC;const music=audioBus('music'),effects=audioBus('sfx'),crowd=audioBus('crowd'),cry=audioBus('cries');
 setAudioPreferences({sfx:.2,crowd:.3});assert.equal(effects.gain.value,.2);assert.equal(crowd.gain.value,.3);assert.equal(music.gain.value,.45);assert.equal(cry.gain.value,.65);
 setAudioPreferences({muted:true});assert.equal(nodes[0].gain.value,0);for(const n of [music,effects,crowd,cry])assert.equal(n.to,nodes[0]);setAudioPreferences({muted:false});assert.equal(nodes[0].gain.value,1);delete globalThis.AudioContext;
});

test('a suspended context requests resume and starts media immediately within the tap',async()=>{
 const f=fixture();let resumes=0;f.context.state='suspended';f.context.resume=()=>{resumes++;return new Promise(()=>{});};
 const run=f.player.select('main');assert.equal(resumes,1);assert.equal(f.media.length,1);assert.equal(f.media[0].paused,false);await run;f.player.pause();
});

test('ambient session is feature detected, idempotent and tolerates unavailable WebView APIs',async()=>{
 const {configureAudioSession}=await import('../src/audio/context.js');
 let type='auto',writes=0;const session={get type(){return type;},set type(v){writes++;type=v;}};
 assert.equal(configureAudioSession({audioSession:session}),true);assert.equal(type,'ambient');
 assert.equal(configureAudioSession({audioSession:session}),true);assert.equal(writes,1);
 assert.equal(configureAudioSession({}),false);
 assert.equal(configureAudioSession({get audioSession(){throw new Error('unsupported');}}),false);
 assert.equal(configureAudioSession({audioSession:Object.freeze({type:'auto'})}),false);
});
test('preloading does not activate audio, reuses downloaded media, and first entrance is faster than crossfades',async()=>{
 const f=fixture();let contexts=0;const get=f.player.getContext;
 f.player.getContext=()=>{contexts++;return get();};f.player.fadeMs=900;
 f.player.prepare('main');f.player.prepare('main');assert.equal(contexts,0);assert.equal(f.media.length,1);assert.equal(f.media[0].paused,true);
 await f.player.select('main');assert.equal(f.media.length,1);assert.ok(f.ramps.some(([v,t])=>v===1&&t===.12));
 await f.player.select('clash');assert.ok(f.ramps.some(([v,t])=>v===1&&t===.9));f.player.pause();
});
test('same pending/current song resumes interrupted context without restarting the track',async()=>{
 const f=fixture();await f.player.select('main');const first=f.player.current;let resumes=0;
 f.context.state='interrupted';f.context.resume=()=>{resumes++;return Promise.resolve();};
 await f.player.select('main');assert.equal(resumes,1);assert.equal(f.player.current,first);assert.equal(f.media.length,1);f.player.pause();
 const pending=fixture({deferred:true});const run=pending.player.select('main');
 pending.context.state='suspended';pending.context.resume=()=>{resumes++;return Promise.resolve();};
 await pending.player.select('main');assert.equal(resumes,2);assert.equal(pending.media.length,1);
 pending.media[0].resolve();await run;pending.player.pause();
});
test('blocked autoplay retries on a later gesture and hidden scenes never start or resume audio',async()=>{
 const f=fixture();const create=f.player.createMedia;let attempts=0;
 f.player.createMedia=()=>{const m=create();const play=m.play;m.play=function(){attempts++;if(attempts===1)return Promise.reject(new Error('NotAllowedError'));return play.call(this);};return m;};
 await f.player.select('main');assert.equal(f.player.current,null);assert.equal(f.player.pending,null);
 await f.player.select('main');assert.equal(attempts,2);assert.equal(f.player.current.id,'main');
 f.hide();let contexts=0;f.player.getContext=()=>{contexts++;throw new Error('hidden playback');};
 await f.player.select('clash');assert.equal(contexts,0);f.player.pause();
});
test('ambient policy is selected before a media player or audio context can claim playback',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');const session={type:'auto'};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{audioSession:session}});
 const f=fixture(),get=f.player.getContext;
 f.player.getContext=()=>{assert.equal(session.type,'ambient');return get();};
 try {await f.player.select('main');f.player.pause();}
 finally {if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
test('a tap after an interruption that paused the current song resumes that same element where it stopped',async()=>{
 const f=fixture();await f.player.select('main');const first=f.player.current;first.media.currentTime=42;
 first.media.pause();f.context.state='interrupted';let resumes=0;f.context.resume=()=>{resumes++;return Promise.resolve();};
 await f.player.select('main');
 assert.equal(resumes,1);assert.equal(f.player.current,first,'same track object');assert.equal(f.media.length,1,'no new element');
 assert.equal(first.media.paused,false,'the paused element plays again');assert.equal(first.media.currentTime,42,'from where it stopped');
 first.media.ended=true;first.media.pause();await f.player.select('main');assert.equal(first.media.paused,true,'an ended song is left to the loop handler');
 f.player.pause();
});

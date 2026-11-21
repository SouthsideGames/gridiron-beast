import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {UiSoundPlayer,UI_SOUNDS,soundForControl} from '../src/audio/ui-sounds.js';
function fixture(){
 const tasks=[],played=[],stops=[];let hidden=false,at=100;const prefs={muted:false,sfx:.7};
 const ac={state:'running',createBufferSource(){return{connect(bus){assert.equal(bus,'sfx');},disconnect(){},start(){played.push(this.buffer);},stop(){stops.push(this.buffer);}};}};
 const p=new UiSoundPlayer({context:()=>ac,bus:()=> 'sfx',preferences:()=>prefs,hidden:()=>hidden,now:()=>at,defer:fn=>tasks.push(fn)});
 for(const id of Object.keys(UI_SOUNDS))p.buffers.set(id,id);
 return{p,ac,prefs,played,stops,flush:()=>{while(tasks.length)tasks.shift()();},hide:()=>hidden=true,tick:()=>at+=100};
}
test('all seven approved WAV masters are finite bounded mono PCM and have different content',()=>{
 const hashes=new Set();assert.equal(Object.keys(UI_SOUNDS).length,7);
 for(const path of Object.values(UI_SOUNDS)){
  const b=fs.readFileSync(new URL('../'+path,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);
  let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak>100&&peak<30000);
  hashes.add(createHash('sha256').update(b).digest('hex'));
 }assert.equal(hashes.size,7);
});
test('one action coalesces tap, confirmation and reward to its most meaningful cue',()=>{
 const f=fixture();f.p.request('tap');f.p.request('confirm');f.p.request('reward');f.p.request('tap');f.flush();assert.deepEqual(f.played,['reward']);
 f.tick();f.p.request('back');f.flush();assert.deepEqual(f.stops,['reward']);assert.deepEqual(f.played,['reward','back']);
});
test('master mute, zero SFX, hidden state and lifecycle stop suppress pending audio',()=>{
 for(const change of [f=>f.prefs.muted=true,f=>f.prefs.sfx=0,f=>f.hide(),f=>f.p.stop()]){
  const f=fixture();f.p.request('tap');change(f);f.flush();assert.equal(f.played.length,0);
 }
});
test('repeated taps are limited; meaningful feedback can replace a recent click',()=>{
 const f=fixture();f.p.request('tap');f.flush();f.p.request('tap');f.flush();assert.deepEqual(f.played,['tap']);f.p.request('unavailable');f.flush();assert.deepEqual(f.played,['tap','unavailable']);
});
test('not-yet-loaded sounds never play later as an unwanted backlog; failures are harmless',async()=>{
 const f=fixture();f.p.buffers.clear();f.ac.createBuffer=(channels,length,sampleRate)=>({length,sampleRate,getChannelData:()=>new Float32Array(length)});f.p.fetcher=async()=>({ok:false});f.p.request('tap');await f.p.loading;f.flush();assert.equal(f.played.length,0);
 f.p.loading=null;f.p.fetcher=async()=>({ok:true,arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../'+UI_SOUNDS.tap,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});await f.p.preload();assert.equal(f.p.buffers.size,7);assert.equal(f.played.length,0);
});
test('every enabled button uses tap feedback, including close and confirm',()=>{
 const el=(action,extra={})=>({dataset:{action},getAttribute:()=>null,closest:()=>null,...extra});
 assert.equal(soundForControl(el('router-back')),'tap');assert.equal(soundForControl(el('sheet-close')),'tap');assert.equal(soundForControl(el('yes')),'tap');assert.equal(soundForControl(el('go')),'tap');
 assert.equal(soundForControl(el('go',{disabled:true})),null);assert.equal(soundForControl(el('go',{dataset:{busy:'1'}})),'tap');assert.equal(soundForControl(el('go',{closest:()=>({})})),'tap');
});

test('a tap survives WebKit asynchronous resume, and a reward replaces its generic tap',async()=>{
 const f=fixture();let resume;f.ac.state='suspended';f.ac.resume=()=>new Promise(r=>resume=()=>{f.ac.state='running';r();});
 f.p.request('tap');f.p.request('reward');f.flush();assert.deepEqual(f.played,[]);
 resume();await new Promise(r=>setImmediate(r));assert.deepEqual(f.played,['reward']);
});
test('late audio unlocks never play stale, hidden, muted or canceled feedback',async()=>{
 for(const cancel of [f=>f.hide(),f=>f.prefs.muted=true,f=>f.p.stop(),f=>{f.tick();f.tick();f.tick();}]){
  const f=fixture();let resume;f.ac.state='suspended';f.ac.resume=()=>new Promise(r=>resume=()=>{f.ac.state='running';r();});
  f.p.request('notification');f.flush();cancel(f);resume();await new Promise(r=>setImmediate(r));assert.deepEqual(f.played,[]);
 }
});
test('all approved semantic cues use the shared SFX bus, and explicit preview plays approved audio',async()=>{
 const f=fixture();f.ac.resume=async()=>{};
 for(const id of Object.keys(UI_SOUNDS)){f.tick();f.p.request(id);f.flush();}
 assert.deepEqual(f.played,Object.keys(UI_SOUNDS));
 f.tick();await f.p.preview();assert.equal(f.played.at(-1),'confirm');
});
test('installed click handling starts actual UI sources and follows live SFX settings',async()=>{
 const {installUiSounds,uiSounds}=await import('../src/audio/ui-sounds.js');
 const {setAudioPreferences}=await import('../src/audio/context.js');
 const previous=globalThis.AudioContext,played=[],listeners={};
 class AC {
  constructor(){this.state='running';this.currentTime=0;this.destination={};}
  createGain(){return{gain:{value:1,setTargetAtTime(v){this.value=v;}},connect(){}};}
  createBufferSource(){return{connect(bus){this.bus=bus;},disconnect(){},stop(){},start(){played.push({id:this.buffer,volume:this.bus.gain.value});}};}
 }
 try{
  globalThis.AudioContext=AC;setAudioPreferences({muted:false,sfx:.7});
  for(const id of Object.keys(UI_SOUNDS))uiSounds.buffers.set(id,id);
  uiSounds.loading=Promise.resolve();
  installUiSounds({addEventListener(name,fn){listeners[name]=fn;}});
  const click=async action=>{listeners.click({target:{closest:()=>({dataset:{action},getAttribute:()=>null,closest:()=>null})}});await new Promise(r=>setImmediate(r));};
  await click('go');assert.deepEqual(played,[{id:'tap',volume:.7}]);
  setAudioPreferences({sfx:0});await click('yes');assert.equal(played.length,1);
  setAudioPreferences({sfx:.3});await click('yes');assert.deepEqual(played.at(-1),{id:'tap',volume:.3});
  setAudioPreferences({muted:true});await click('back');assert.equal(played.length,2);
 }finally{uiSounds.stop();setAudioPreferences({muted:false,sfx:.7});if(previous===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=previous;}
});

test('real approved WAV samples load and preview without the platform audio decoder',async()=>{
 const f=fixture();f.p.buffers.clear();f.ac.resume=async()=>{};
 f.ac.decodeAudioData=()=>{throw Error('Platform decoder unavailable');};
 f.ac.createBuffer=(channels,length,sampleRate)=>{const data=Array.from({length:channels},()=>new Float32Array(length));return{numberOfChannels:channels,length,sampleRate,getChannelData:c=>data[c]};};
 f.p.fetcher=async path=>({ok:true,arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../'+path,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
 await f.p.preload();assert.equal(f.p.buffers.size,7);
 for(const [id,path] of Object.entries(UI_SOUNDS)){
  const bytes=fs.readFileSync(new URL('../'+path,import.meta.url)),buffer=f.p.buffers.get(id);
  assert.equal(buffer.length,(bytes.length-44)/2);assert.equal(buffer.sampleRate,44100);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)assert.equal(data[i],bytes.readInt16LE(44+i*2)/32768);
  assert.equal(await f.p.preview(id),true);assert.equal(f.played.at(-1),buffer);
 }
});
test('Settings preview reports failure when a source cannot start and can retry',async()=>{
 const f=fixture();f.ac.resume=async()=>{};const create=f.ac.createBufferSource;
 f.ac.createBufferSource=()=>({connect(){throw Error('Audio unavailable');},disconnect(){}});
 assert.equal(await f.p.preview(),false);
 f.ac.createBufferSource=create;assert.equal(await f.p.preview(),true);
});

test('gesture wake and Settings preview share one asynchronous resume; rejection is recoverable',async()=>{
 const f=fixture();f.ac.state='suspended';let resolve,calls=0;
 f.ac.resume=()=>{calls++;return new Promise(r=>resolve=()=>{f.ac.state='running';r();});};
 const wake=f.p.wake(f.ac),preview=f.p.preview();assert.equal(calls,1);
 resolve();await wake;assert.equal(await preview,true);
 f.ac.state='suspended';f.ac.resume=async()=>{throw Error('Interrupted');};
 assert.equal(await f.p.preview(),false);
 f.ac.resume=async()=>{f.ac.state='running';};assert.equal(await f.p.preview(),true);
});

test('button tap and semantic feedback both play; each fresh press is audible without an extra throttle',()=>{
 const f=fixture();f.p.tap();f.p.request('reward');f.flush();
 assert.deepEqual(f.played,['tap','reward']);assert.deepEqual(f.stops,[],'reward must not cut off tap');
 f.p.tap();assert.deepEqual(f.played,['tap','reward','tap']);assert.deepEqual(f.stops,['tap']);
 f.p.stop();assert.ok(f.stops.includes('reward'));
});
test('first button tap can wait for cold loading and asynchronous unlock, while newer presses replace stale ones',async()=>{
 const f=fixture();let resume;f.ac.state='suspended';f.ac.resume=()=>new Promise(r=>resume=()=>{f.ac.state='running';r();});
 f.p.tap();f.p.tap();resume();await new Promise(r=>setImmediate(r));assert.deepEqual(f.played,['tap']);
 for(const cancel of [f=>f.hide(),f=>f.prefs.muted=true,f=>f.prefs.sfx=0,f=>f.p.stop()]){
  const f=fixture();let resume;f.ac.state='interrupted';f.ac.resume=()=>new Promise(r=>resume=()=>{f.ac.state='running';r();});
  f.p.tap();cancel(f);resume();await new Promise(r=>setImmediate(r));assert.deepEqual(f.played,[]);
 }
});

test('leaving Settings or replacing a preview does not cut off its button tap',async()=>{
 const f=fixture();f.p.tap();f.p.stop({preserveTap:true});assert.deepEqual(f.stops,[]);
 f.ac.state='suspended';let resume;f.ac.resume=()=>new Promise(r=>resume=()=>{f.ac.state='running';r();});
 f.p.tap();f.p.stop({preserveTap:true});resume();await new Promise(r=>setImmediate(r));assert.equal(f.played.length,2);
 f.p.stop();assert.ok(f.stops.includes('tap'));
});

test('a cold first button tap plays its approved PCM sample even when loading exceeds 250 ms',async()=>{
 const f=fixture();f.p.buffers.clear();let release;const gate=new Promise(r=>release=r);
 f.ac.createBuffer=(channels,length,sampleRate)=>({length,sampleRate,getChannelData:()=>new Float32Array(length)});
 f.p.fetcher=async path=>{await gate;return {ok:true,arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../'+path,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};};
 f.p.tap();f.tick();f.tick();f.tick();release();await f.p.loading;await new Promise(r=>setImmediate(r));
 assert.deepEqual(f.played,[f.p.buffers.get('tap')]);
});

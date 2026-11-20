import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchCamera, FacingTracker, AUTO_ZOOM_MS } from '../src/ui/match-camera.js';
import { cameraFor, fieldLayers, fieldSvg } from '../src/ui/field-view.js';

const frame = (t, y) => ({t,off:[['WR1',5,y]],def:[],ball:[5,y,0]});
test('facing holds through slow movement, stops and collision jitter, but follows a real turn', () => {
 const track=new FacingTracker();
 let t=0;
 const face=y=>track.observe(frame(t+=.1,y))['off:WR1'];
 assert.equal(face(0),false);
 assert.equal(face(-.7),true,'turn left after meaningful movement');
 for(const y of [-.72,-.69,-.7,-.7,-.68,-.71,-.7])assert.equal(face(y),true,'no snap back to default');
 for(const y of [-.5,-.3])assert.equal(face(y),true,'wait for sustained reversal');
 assert.equal(face(.1),false,'real right turn is still visible');
 assert.equal(track.observe(frame(0,0))['off:WR1'],false,'new play resets facing');
 track.observe(null);assert.equal(track.players.size,0,'presnap clears old actors');
});
test('renderer uses retained facing without modifying recorded movement',()=>{
 const track=new FacingTracker(),f=frame(.3,-.8),before=JSON.stringify(f);
 track.observe(frame(0,0));const left=track.observe(f);
 const beast={species:'crustank',form:'crustank:0',stage:0,name:'Test'};
 const opts={frame:f,prevFrame:frame(0,0),sprites:{off:{map:{WR1:beast},pool:[]}},facing:left};
 const moving=fieldLayers(opts).players[0].use.href;
 const stopped=fieldLayers({...opts,prevFrame:f}).players[0].use.href;
 assert.equal(stopped,moving);assert.equal(JSON.stringify(f),before);
});
test('Auto eases to both end zones, stays wide across plays and returns to the normal camera',()=>{
 const c=new MatchCamera(),key={},close=cameraFor(25);
 const sample=(now,extra={})=>c.sample(close,{key,auto:true,now,...extra});
 assert.deepEqual(sample(0),close);assert.equal(c.moving,true);
 const mid=sample(AUTO_ZOOM_MS/2);assert.ok(mid.top>close.top&&mid.top<110);assert.ok(mid.bottom<close.bottom&&mid.bottom>-10);
 assert.deepEqual(sample(AUTO_ZOOM_MS),{bottom:-10,top:110});assert.equal(c.moving,false);
 assert.deepEqual(c.sample(cameraFor(85),{key,auto:true,now:2200}),{bottom:-10,top:110});
 sample(2300,{closeView:true});assert.deepEqual(sample(2300+AUTO_ZOOM_MS,{closeView:true}),close);
 sample(5000);sample(7000);sample(7100,{auto:false});assert.deepEqual(sample(9000,{auto:false}),close);
 assert.deepEqual(c.sample(close,{key:{},auto:false,now:9100}),close,'a different game cannot inherit a wide camera');
});
test('Reduced Motion changes camera immediately and interrupted zoom reverses continuously',()=>{
 const c=new MatchCamera(),key={},close=cameraFor(50);
 assert.deepEqual(c.sample(close,{key,auto:true,reducedMotion:true,now:0}),{bottom:-10,top:110});
 assert.deepEqual(c.sample(close,{key,auto:false,reducedMotion:true,now:1}),close);
 c.sample(close,{key,auto:true,now:2});const halfway=c.sample(close,{key,auto:true,now:902});
 assert.deepEqual(c.sample(close,{key,auto:false,now:902}),halfway);
 assert.deepEqual(c.sample(close,{key,auto:false,now:3000}),close);
});
test('wide field includes all markings and clipping without portal camera overriding it',()=>{
 const options={ballOn:25,viewCamera:{bottom:-10,top:110},frame:{...frame(1,0),hoardFlight:true}};
 const before=JSON.stringify(options);const layers=fieldLayers(options);
 assert.equal(layers.span,120);const svg=fieldSvg(options);
 assert.match(svg,/height="120"/);assert.match(svg,/>OWN</);assert.match(svg,/>OPP</);
 assert.equal((svg.match(/>50<\/text>/g)||[]).length,2);
 assert.ok(!/NaN|undefined/.test(svg));assert.equal(JSON.stringify(options),before);
});
test('two simultaneous field views can use independent clipping dimensions',()=>{
 const wide=fieldSvg({viewCamera:{bottom:-10,top:110},clipId:'wide-field'});
 const review=fieldSvg({ballOn:25,clipId:'review-field'});
 assert.match(wide,/id="wide-field"[^>]*><rect[^>]*height="120"/);
 assert.equal((wide.match(/clip-path="url\(#wide-field\)"/g)||[]).length,2);
 assert.match(review,/id="review-field"[^>]*><rect[^>]*height="46"/);
 assert.equal((review.match(/clip-path="url\(#review-field\)"/g)||[]).length,2);
});

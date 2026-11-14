import { audioContext, audioBus, audioPreferences, isAudioHidden } from './context.js';
// Procedural retro voice drafts. Pure recipe/PCM creation: never consumes gameplay RNG.
import { FAMILIES, FORMS } from '../data/beast-dex.js';
import { SPECIES_DEX } from '../data/species.js';
import { evolvedSpec } from '../data/monsters.js';
export const CRY_REVISION = 5;
export const CRY_RATE = 22050;
const families = new Map(FAMILIES.map(f => [f.id, f]));
const species = new Map(SPECIES_DEX.map(f => [f.id, f]));
export const cryCatalog = FORMS.map(f => ({ ...f, family: families.get(f.familyId), appearance: evolvedSpec(species.get(f.familyId), f.stage) }));
const hash = s => { let h=2166136261; for(const c of s) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; };
const random = seed => () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
// Each family is explicitly assigned after reviewing its actual description. No element-only fallback.
const profileGroups = `
yip|460|Restless, quick animal calls|emberfox thornkit gravelpup shiverkit riddlet
hiss|180|Restrained feline spit and breath|pyrelynx singecat shadowkit pumicat windlynx
rumble|65|Heavy geological pressure and gravel|pyroclast coalump glaciron titanolith
throat|95|Hollow amphibian throat pulses|gloamtoad
clock|720|Precise clockwork ticks and winding tones|gearwing clockcrow
flute|980|Breathy melodic bird phrases|sunwhistle twinklet dawnfinch
squeal|390|Rubbery, squeaky articulation|steelpaw
bubble|240|Liquid plops and a bubbling trill|tidepaw bubblop
bark|240|Chest-led canine or cub challenge|ashkit voltfang duskrunner ironcub scorchub embadger boltdart staticub vexhound drakhound brasshound
snarl|155|Rough teeth-led warning|firestorm cinderclaw stormlynx joltrex hailfang frostclaw mireclaw ironjaw umbruin floebear hoarcub lumbear
bleat|280|Nasal horned-animal call|wavehorn rootram leafhorn icehorn rockram boulderox terrabull halofang metalhorn wattram clodhorn quarrox galebuck lanternox solram anvilox pondermoose gazeling
wood|130|Hollow wood knocks and creaking fibers|mossclaw thornback elderoot acornet stumpkin podling
buzz|340|Wingbeat buzz with broken pulses|flicker snowmoth glimmer sparkwick fusebug fernflit barkbug ampette capaclod wattlet breezle sailmoth pinwhirl spindlet gloomoth glowhare glarefly gyroflit
rattle|190|Reptile rasp and dry scale chatter|voltfin nyxshade wyrmkit scaleguard kelpup newtide neonnewt inklet omenox crestback bulwyrm skinklet
screech|540|Open-throated bird or drake call|stormcrown glacivern skywarden tempestra aurelion sablewing ashpeck wadelet buzzhawk windrook crowlurk glidrake wyvlet
chirrup|780|Small bird chirps with irregular replies|gustling mudlark chillip ptarmilet kitelet swallit gustpuff
hoot|260|Soft hollow owl calls|nightowl ivyowl
whistle|620|Thin breath-driven glides|tidefin zephyr brookit minnodart
chime|580|Clear resonant crystal strikes|prism cubeling geodot
clang|210|Inharmonic metal impacts and ringing plates|aegistron rivetto tinhare ingotusk
warble|310|Floating, bending spirit voice|lumen mindwing shadewisp cerebrix echolot enigmane astralux mindle dreamhop trancefin thinkump seerling orblet dazzlet beamlet
roar|135|Broad chest resonance with a rough growl|tsunarok stoneguard vyrnax aurodrax
peep|720|Small hesitant peeps and soft replies|kindlet charbun thistlehop whirlhare snowdart
grunt|160|Rounded low grunts with breathy ends|mudcub trunkle briarhog zaphog walrump rimeboar diggit murkit
clack|380|Shell clicks with a resonant body answer|reefclaw barnaclod sploshog siltadillo eggling washerling
scrape|170|Dry stony scrapes and short knocks|pebble cobblump slatelet skiddle
steam|760|Pressure whistle over a hollow shell|kilnback kettlump
spring|440|Elastic spring twangs and returning echoes|springlet
squeak|680|Small mammal squeaks with nervous breaks|fuzzvolt ottrip breezefang minkurk
click|520|Light leg clicks and wing taps|pondskip
breath|220|Airy exhale and fluttering pressure|nimbulk waxwick
squealbat|1100|Brief high bat trills|nocturne batwhisk
fawn|420|Soft nasal deer contact calls|fawnleaf
hatch|380|Uneven hatchling squeaks trying to growl|drakeling scalekin raptlet gnashlet
`.trim().split('\n');
export const CRY_PROFILES = Object.freeze(Object.fromEntries(profileGroups.flatMap(line=>{
 const [kind,pitch,rationale,ids]=line.split('|');
 return ids.split(' ').map(id=>[id,Object.freeze({kind,pitch:Number(pitch),rationale})]);
})));
const REFERENCE_PHRASES = {
 gloamtoad:[[0,.48,1,.65],[.7,.22,.8,.6]],
 gearwing:[[0,.08,1,1],[.14,.08,1.5,1.5],[.28,.08,1.2,1.2],[.46,.32,.8,1.8]],
 sunwhistle:[[0,.22,1,1.2],[.27,.16,1.5,1.4],[.49,.36,1.25,.8]],
 steelpaw:[[0,.13,.8,1.7],[.25,.26,1.3,.65]],
 emberfox:[[0,.09,1.5,.8],[.16,.10,1.8,.9],[.38,.25,1.1,.5]],
 pyroclast:[[0,1.05,.7,1.1]],
 tidepaw:[[0,.16,1,.8],[.23,.10,1.4,1.2],[.39,.30,.9,1.7]],
 pyrelynx:[[0,.16,.8,1],[.24,.55,1,.65]]
};
export function cryRecipe(id){
 const row=cryCatalog.find(x=>x.id===id);if(!row)throw new Error('Unknown monster form');
 const {family:f,appearance:a,stage}=row,profile=CRY_PROFILES[f.id];
 if(!profile)throw new Error('Missing description-led cry profile: '+f.id);
 const desc=f.description.toLowerCase(), r=random(hash(f.id+':phrase-v5'));
 const reserved=/shy|quiet|silence|patient|thoughtful|calm|pensive|dreamy|dozes|focus|lurks|lurking/.test(desc);
 const restless=/jitter|impatient|nervous|twitch|bounc|can’t sit|playful|curious|zips|panics/.test(desc);
 const size={small:1.15,medium:.92,large:.72}[a.size]||1;
 const center=profile.pitch*size*(.85+r()*.3);
 const seed=hash(JSON.stringify([CRY_REVISION,id,f.description,a.size,a.look,a.features]));
 const count=reserved?2:restless?4:2+Math.floor(r()*3);
 let time=0;
 // Family-specific phrase, pitch contour, articulation rate, and resonances. Seed is independent of gameplay.
 let events=Array.from({length:count},(_,i)=>{
  const dur=(reserved?.22:restless?.07:.12)+r()*(reserved?.24:.18);
  const e={at:time,dur,points:[center*(.65+r()*.8),center*(.8+r()*.9),center*(.55+r()*.6)],kind:profile.kind,amp:reserved?.62:.8,rough:0,
   flutter:7+r()*24,resonance:1.4+r()*2.2,attack:.005+r()*.02,decay:.5+r()*2};
  time+=dur+.04+r()*(reserved?.16:.11);return e;
 });
 // Preserve the owner's improved eight base phrases as the catalogue's reference voices.
 if(REFERENCE_PHRASES[f.id])events=REFERENCE_PHRASES[f.id].map(([at,dur,lo,hi])=>({at,dur,points:[profile.pitch*lo,profile.pitch*hi],kind:profile.kind,amp:.8,rough:0}));
 // Evolution develops the phrase: a new lead-in, changed pauses, stronger sustained syllable and a new ending.
 // It retains its animal/material voice instead of replacing every adult with the same rasp.
 if(stage){
  const adult=random(hash(id+':adult-v5'));
  events=events.map((e,i)=>({...e,at:.10+e.at*(stage===1?.88:1.15),dur:e.dur*(i===0?.7:1+stage*.16),
   points:[e.points[0]*(stage===1?.9:.72),e.points[1]*(.8+adult()*.4),e.points.at(-1)*(.65+adult()*.25)],
   flutter:10+adult()*28,resonance:1.8+adult()*3,amp:i===1?.95:.72}));
  events.unshift({at:0,dur:.055+stage*.012,points:[center*1.2,center*.8],kind:profile.kind,amp:.45,rough:0});
  const end=Math.max(...events.map(e=>e.at+e.dur));
  events.push({at:end+.09+adult()*.08,dur:.09+stage*.045,points:[center*(1+adult()*.6),center*.6],kind:profile.kind,amp:.6,rough:0});
 }
 const notes=[profile.rationale,`Description: ${f.description}`,`${a.size}, ${a.look} ${a.body}`,a.features.join(', '),
  reserved?'Reserved delivery':restless?'Restless delivery':'Assertive delivery',`Voice: ${profile.kind}`,
  stage?'Family voice with a newly articulated evolved phrase':'Description-led family voice'];
 return {id,revision:CRY_REVISION,seed,design:5,voice:profile.kind,formants:[450+size*520,1300+size*950],element:f.type,features:a.features,description:f.description,notes,events};
}
export function renderCry(recipe,rate=CRY_RATE) {
 if(rate<8000||rate>48000) throw new Error('Unsupported sample rate');
 const rnd=random(recipe.seed), duration=Math.max(...recipe.events.map(e=>e.at+e.dur))+.07;
 const out=new Float32Array(Math.ceil(duration*rate));
 for(const e of recipe.events){let phase=0,low=0;const n=Math.round(e.dur*rate),start=Math.round(e.at*rate);
  for(let i=0;i<n;i++) {const t=i/rate,u=i/n,p=u*(e.points.length-1),j=Math.floor(p),frequency=e.points[j]*(1-(p-j))+(e.points[Math.min(j+1,e.points.length-1)]||e.points[j])*(p-j);
   phase+=frequency*(1+.018*Math.sin(2*Math.PI*31*t))/rate;
   const ph=phase*2*Math.PI, tri=2/Math.PI*Math.asin(Math.sin(ph)), pulse=Math.sin(ph)>(.23+.1*Math.sin(t*39))?1:-1;
   let v;
   switch(e.kind){
    case'bark':v=(Math.sin(ph)+.55*Math.sin(ph*2)+.22*Math.sin(ph*3))*Math.exp(-u*(e.decay||2));v+=.18*(rnd()*2-1)*(1-u);break;
    case'snarl':v=Math.sin(ph+3.2*Math.sin(ph*.5))*.55+(rnd()*2-1)*.3;v*=.5+.5*Math.pow(Math.sin(t*55),2);break;
    case'bleat':case'fawn':v=(Math.sin(ph)+.45*Math.sin(ph*3))*(.65+.35*Math.sin(t*2*Math.PI*(e.flutter||13)));break;
    case'wood':v=(Math.sin(ph)+.3*Math.sin(ph*1.47))*Math.exp(-((u*4)%1)*8)+.08*(rnd()*2-1);break;
    case'screech':v=Math.sin(ph+2*Math.sin(ph*(e.resonance||2.3)))*.7+(rnd()*2-1)*.15;break;
    case'whistle':v=Math.sin(ph+.15*Math.sin(t*2*Math.PI*(e.flutter||9)))*.85+(rnd()*2-1)*.04;break;
    case'chime':v=(Math.sin(ph)+.5*Math.sin(ph*2.76)+.28*Math.sin(ph*5.4))*Math.exp(-u*3);break;
    case'clang':v=(Math.sin(ph)+.8*Math.sin(ph*1.41)+.5*Math.sin(ph*3.17))*Math.exp(-u*5);break;
    case'peep':case'squeak':v=Math.sin(ph+1.2*Math.sin(ph*2))*(.8+.2*Math.sin(t*2*Math.PI*(e.flutter||18)));break;
    case'grunt':v=(Math.sin(ph)+.25*Math.sin(ph*.5))*(.7+.3*Math.sin(t*38))+.12*(rnd()*2-1);break;
    case'clack':v=Math.sin(ph)*Math.exp(-((u*3)%1)*13)+(rnd()*2-1)*Math.exp(-((u*3)%1)*30)*.5;break;
    case'scrape':{const noise=rnd()*2-1;low+=.09*(noise-low);v=low*3+Math.sin(ph)*.15;v*=.4+.6*Math.pow(Math.sin(t*85),2);break;}
    case'steam':low+=.08*((rnd()*2-1)-low);v=low*1.5+Math.sin(ph)*u*.6;break;
    case'spring':v=Math.sin(ph+5*Math.sin(ph*.73)*Math.exp(-u*6))*Math.exp(-u*3);break;
    case'click':v=(rnd()*2-1)*Math.exp(-((u*5)%1)*22)+Math.sin(ph)*.12;break;
    case'breath':low+=.04*((rnd()*2-1)-low);v=low*4*(.3+.7*Math.sin(Math.PI*u));break;
    case'squealbat':v=Math.sin(ph+3*Math.sin(t*2*Math.PI*(e.flutter||27)))*(.5+.5*Math.sin(t*143));break;
    case'hatch':v=Math.sin(ph+2*Math.sin(ph*1.5))*(.4+.6*Math.pow(Math.sin(t*45),2))+.1*(rnd()*2-1);break;
    case'throat':v=(Math.sin(ph)+.35*Math.sin(ph*2))*(.25+.75*Math.pow(Math.max(0,Math.sin(t*2*Math.PI*23)),3));break;
    case'clock':v=(Math.sin(ph)+.5*Math.sin(ph*2.76)+.25*Math.sin(ph*4.13))*Math.exp(-u*9);break;
    case'flute':v=Math.sin(ph+.09*Math.sin(t*2*Math.PI*7))*.8+(rnd()*2-1)*.07;break;
    case'squeal':v=Math.sin(ph+5*Math.sin(ph*1.003))*(.6+.4*Math.sin(t*2*Math.PI*18));break;
    case'yip':v=(Math.sin(ph)+.4*Math.sin(ph*3)+.2*Math.sin(ph*5))*Math.exp(-u*3);break;
    case'rumble':low+=.025*((rnd()*2-1)-low);v=low*6+Math.sin(ph)*.25+Math.sin(ph*.49)*.3;break;
    case'bubble':v=Math.sin(ph+7*Math.exp(-((u*7)%1)*8))*Math.exp(-((u*7)%1)*4);break;
    case'hiss':{const noise=rnd()*2-1;low+=.12*(noise-low);v=(noise-low)*(.35+.65*Math.sin(Math.PI*u));break;}
    case'chirrup' :v=Math.sin(ph+1.8*Math.sin(ph*2))*.65+pulse*.25;break;
    case'buzz':v=pulse*(.6+.4*Math.sin(t*380));break;
    case'mechanical':v=Math.sin(ph+3*Math.sin(ph*2.71))*.65+tri*.3;break;
    case'burble':v=Math.sin(ph+3*Math.sin(t*60))*(.6+.4*Math.sin(t*48));break;
    case'croak':v=(tri*.6+pulse*.4)*(.3+.7*Math.pow(Math.sin(t*65),2));break;
    case'hoot':v=Math.sin(ph)*.8+Math.sin(ph*2)*.16;break;
    case'warble':v=Math.sin(ph+2*Math.sin(t*43));break;
    case'creak':v=(pulse*.5+tri*.5)*(.65+.35*Math.sin(t*130));break;
    case'roar':v=pulse*.4+Math.sin(ph*.501)*.3+Math.sin(ph+3.8*Math.sin(ph*1.49))*.3;break;
    case'rattle':v=tri*.5+Math.sin(ph+2.4*Math.sin(ph*1.02))*.5;break;
    default:v=pulse*.45+Math.sin(ph+3*Math.sin(ph*1.01))*.55;
   }
   // Each voice keeps its own spectrum; no shared fuzz/filter that makes all families sound alike.
   const bright=v;
   const env=Math.min(1,t/(e.attack||.007))*Math.min(1,(e.dur-t)/.025)*Math.exp(-u*(e.decay||.4));
   out[start+i]+=Math.round(Math.tanh(bright)*96)/96*env*e.amp;
  }
 }
 let sum=0;for(const v of out)sum+=v*v;
 const gain=.16/Math.max(Math.sqrt(sum/out.length),.001);
 for(let i=0;i<out.length;i++)out[i]=Math.tanh(out[i]*gain);
 return out;
}
// Detail/reviewer playback: user gesture unlock, bounded PCM cache, one voice, cancellation and hidden-page stop.
let ctx=null,node=null,serial=0;const cache=new Map();
export function stopCry(){serial++;const source=node;node=null;if(source){try{source.stop();}catch{}source.disconnect();}}
export async function playCry(id,volume=.5){
 stopCry();const ticket=serial;
 if(isAudioHidden()||audioPreferences().muted)return false;
 if(!ctx){ctx=audioContext();if(!ctx)throw new Error('Audio is unavailable in this browser.');globalThis.document?.addEventListener('visibilitychange',()=>{if(document.hidden)stopCry();});globalThis.addEventListener?.('pagehide',stopCry);globalThis.addEventListener?.('gb-app-state',event=>{if(event.detail?.isActive===false)stopCry();});}
 await ctx.resume();if(ticket!==serial)return false;if(ctx.state!=='running')throw new Error('Tap Play again to enable audio.');
 let data=cache.get(id);if(!data){data=renderCry(cryRecipe(id));cache.set(id,data);if(cache.size>12)cache.delete(cache.keys().next().value);}
 const buffer=ctx.createBuffer(1,data.length,CRY_RATE);buffer.copyToChannel(data,0);
 const source=ctx.createBufferSource(),gain=ctx.createGain();gain.gain.value=Math.max(0,Math.min(1,volume));source.buffer=buffer;source.connect(gain).connect(audioBus('cries'));node=source;
 return new Promise(resolve=>{source.onended=()=>{if(node===source)node=null;source.disconnect();gain.disconnect();resolve(ticket===serial);};source.start();});
}

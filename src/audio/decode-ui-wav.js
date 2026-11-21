// The approved UI masters are tiny PCM16 WAVs. Read their samples directly into
// an AudioBuffer, avoiding differences in WebView decodeAudioData implementations.
// No synthesized replacement: these are the original approved sample values.
export function decodeUiWav(ac, bytes) {
 const v=new DataView(bytes), tag=(p)=>String.fromCharCode(...new Uint8Array(bytes,p,4));
 if(v.byteLength<12||tag(0)!=='RIFF'||tag(8)!=='WAVE')throw Error('Invalid UI WAV');
 let format=null,data=null;
 for(let p=12;p+8<=v.byteLength;){
  const id=tag(p),n=v.getUint32(p+4,true),start=p+8;
  if(start+n>v.byteLength)throw Error('Truncated UI WAV');
  if(id==='fmt '){if(n<16)throw Error('Invalid UI WAV format');format={pcm:v.getUint16(start,true),channels:v.getUint16(start+2,true),rate:v.getUint32(start+4,true),bits:v.getUint16(start+14,true)};}
  if(id==='data')data={start,n};
  p=start+n+(n%2);
 }
 if(!format||!data||format.pcm!==1||format.bits!==16||format.channels<1||format.channels>2||format.rate<8000||format.rate>192000||!data.n||data.n%(format.channels*2))throw Error('Unsupported UI WAV');
 const frames=data.n/(format.channels*2),out=ac.createBuffer(format.channels,frames,format.rate);
 for(let c=0;c<format.channels;c++){
  const samples=out.getChannelData(c);
  for(let i=0;i<frames;i++)samples[i]=v.getInt16(data.start+(i*format.channels+c)*2,true)/32768;
 }
 return out;
}

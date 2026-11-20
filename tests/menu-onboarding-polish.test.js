import test from 'node:test';
import assert from 'node:assert/strict';
import {guideHtml,guideTargetSelectors,mountGuide} from '../src/ui/guided-week.js';
import {startGuide,advanceGuide,currentLesson} from '../src/franchise/guide.js';
import {registerOnboardingScreens,randomCoachName} from '../src/ui/screens/onboarding.js';

test('reopened franchise never displays or mounts guidance on the main menu; progress resumes in HQ',()=>{
 const f={season:{year:1,week:1},roster:[],settings:{}};startGuide(f);
 while(currentLesson(f).id!=='draft')advanceGuide(f);
 const reopened=JSON.parse(JSON.stringify(f)),before=JSON.stringify(reopened.guide);
 const prior=globalThis.document;
 globalThis.document={querySelectorAll:()=>[],querySelector:()=>null};
 try {for(const screen of ['menu','settings','developer','dex','achievements','franchises']){
 assert.equal(guideHtml(reopened,screen),'');assert.deepEqual(guideTargetSelectors(reopened,screen),[]);mountGuide(reopened,screen,()=>assert.fail('menu must not save or advance tutorial'));
 }}finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
 assert.equal(JSON.stringify(reopened.guide),before);assert.match(guideHtml(reopened,'hq'),/commissioner-guide/);
});

test('coach name randomizer supplies editable first and last names and never repeats the current pair',()=>{
 for(const random of [()=>0,()=>0.5,()=>0.999999]){
 const a=randomCoachName({},random),b=randomCoachName(a,random);
 assert.match(a.first,/^[A-Z][a-z]+$/);assert.match(a.last,/^[A-Z][a-z]+$/);assert.notDeepEqual(a,b);
 }
 const screens=new Map();const Router={registerScreen:(n,s)=>screens.set(n,s),render(){}};
 registerOnboardingScreens(Router,{});
 const html=screens.get('onboarding').render({params:{fresh:true}});
 assert.ok(html.indexOf('data-action="back"')<html.indexOf('data-action="random-name"'));
 assert.ok(html.indexOf('data-action="random-name"')<html.indexOf('data-action="next"'));
 let listener;const fields={'#first':{value:'My'},'#last':{value:'Name'}};
 const root={addEventListener:(event,fn)=>{if(event==='click')listener=fn;},contains:()=>true,querySelector:s=>fields[s]};
 const screen=screens.get('onboarding');screen.mount(root,{});
 const tap=action=>listener({target:{closest:()=>({dataset:{action},setAttribute(){},removeAttribute(){}})},preventDefault(){}});
 tap('random-name');const randomized=screen.render({params:{}});
 assert.match(randomized,/id="first"[^>]*value="[A-Z][a-z]+"/);assert.doesNotMatch(randomized,/value="My"/);
 fields['#first'].value='Kareem';fields['#last'].value='Butler';
 tap('next');tap('back');const edited=screen.render({params:{}});
 assert.match(edited,/value="Kareem"/);assert.match(edited,/value="Butler"/);
 assert.match(html,/<input id="first"/);assert.match(html,/<input id="last"/);
});

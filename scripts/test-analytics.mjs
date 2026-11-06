import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 GA_MEASUREMENT_ID,ANALYTICS_CHOICE_KEY,getAnalyticsChoice,setAnalyticsChoice,
 startAnalytics,stopAnalytics,trackEvent,trackPageView
} from '../lib/analytics.js';

assert.equal(GA_MEASUREMENT_ID,'G-88Q3PDQJF7');
const local=new Map(),scripts=[],events=[];
globalThis.Event=class Event{constructor(type){this.type=type}};
globalThis.window={
 localStorage:{
  getItem:key=>local.get(key)??null,
  setItem:(key,v)=>local.set(key,String(v))
 },
 location:{hostname:'localhost',origin:'https://basketballreflexsystem.vercel.app',pathname:'/games/401909934'},
 dispatchEvent:event=>events.push(event.type)
};
globalThis.document={
 head:{appendChild:script=>scripts.push(script)},
 createElement:()=>({async:false,src:'',setAttribute(k,v){this[k]=v}}),
 cookie:''
};
assert.equal(getAnalyticsChoice(),null);
assert.equal(startAnalytics(),false,'No tracking before explicit consent');
assert.equal(trackEvent('section_view',{section:'games'}),false);
assert.equal(trackPageView('/games'),false);
assert.equal(scripts.length,0,'Google tag must not load before consent');

assert.equal(setAnalyticsChoice('accepted'),true);
assert.equal(getAnalyticsChoice(),'accepted');
assert.equal(local.get(ANALYTICS_CHOICE_KEY),'accepted');
assert.equal(startAnalytics(),true);
assert.equal(scripts.length,1);
assert.ok(scripts[0].src.includes('googletagmanager.com/gtag/js?id=G-88Q3PDQJF7'));
assert.equal(startAnalytics(),true);
assert.equal(scripts.length,1,'Do not inject duplicate tags');
const consentDefault=window.dataLayer.find(x=>x[0]==='consent'&&x[1]==='default');
const consentUpdate=window.dataLayer.find(x=>x[0]==='consent'&&x[1]==='update');
assert.equal(consentDefault[2].analytics_storage,'denied');
assert.equal(consentDefault[2].ad_storage,'denied');
assert.equal(consentUpdate[2].analytics_storage,'granted');
assert.equal(consentUpdate[2].ad_user_data,'denied');
const config=window.dataLayer.find(x=>x[0]==='config'&&x[1]===GA_MEASUREMENT_ID);
assert.ok(config);
assert.equal(config[2].send_page_view,false,'Explicit pageviews only, no duplicate auto event');
assert.equal(trackPageView('/games/401909934'),true);
assert.equal(trackPageView('/games/401909934'),false,'Same route must not duplicate');
assert.equal(trackPageView('/players/3945274'),true);
const lastPageView=window.dataLayer.at(-1);
assert.equal(lastPageView[0],'event');
assert.equal(lastPageView[1],'page_view');
assert.equal(lastPageView[2].page_path,'/players/3945274');
assert.equal(lastPageView[2].page_location,'https://basketballreflexsystem.vercel.app/players/3945274');
assert.equal(trackPageView('/players/3945274?prop=PTS'),false,'Query changes do not create pageviews');
assert.equal(trackPageView('/matchups/bos-vs-lal'),true);
assert.ok(events.includes('pickroll:analytics-ready'));

assert.equal(trackEvent('dime_question_sent',{context:'players',question:'Personal text'}),true);
const last=window.dataLayer.at(-1);
assert.equal(last[0],'event');
assert.equal(last[1],'dime_question_sent');
assert.deepEqual(last[2],{context:'players'});
assert.equal(trackEvent('unknown_event',{context:'games'}),false);
assert.equal(trackEvent('prop_category_selected',{prop:'PTS',odds:'1.91'}),true);
assert.equal(window.dataLayer.at(-1)[2].odds,undefined,'Never send entered odds');

assert.equal(setAnalyticsChoice('rejected'),true);
stopAnalytics();
assert.equal(getAnalyticsChoice(),'rejected');
assert.equal(trackEvent('section_view',{section:'games'}),false);
assert.equal(trackPageView('/games'),false);
assert.equal(startAnalytics(),false);
assert.equal(window.dataLayer.at(-1)[2].analytics_storage,'denied');

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
assert.ok(src('app/layout.jsx').includes('<AnalyticsConsent/>'));
assert.ok(src('app/layout.jsx').includes('<AnalyticsPageviews/>'));
assert.ok(src('app/page.jsx').includes('<AnalyticsPreferencesButton/>'));
assert.ok(src('app/DimeChat.jsx').includes("trackEvent('dime_question_sent'"));
assert.ok(src('app/PlayerPropHub.jsx').includes("trackEvent('parlay_leg_added'"));
assert.ok(src('app/RotationLab.jsx').includes("trackEvent('rotation_substitution_tested'"));
assert.ok(src('app/about/page.jsx').includes('<AnalyticsPreferencesButton/>'));
console.log('PASS GA4 ID, opt-in-only initialization, consent/revocation, data minimization and product events');

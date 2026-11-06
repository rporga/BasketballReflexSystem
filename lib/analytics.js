// Pick & Roll GA4: collect analytics only after a visitor opts in.
// Never send Dime messages, names, entered odds, or other free-form content.
export const GA_MEASUREMENT_ID = 'G-88Q3PDQJF7';
export const ANALYTICS_CHOICE_KEY = 'pick-roll-analytics-consent-v1';
export const ANALYTICS_READY_EVENT = 'pickroll:analytics-ready';

const DENIED = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
};

const SAFE_FIELDS = new Set([
  'section','game_id','team_id','player_id','prop','side','sample_window',
  'leg_count','context','scenario_type','result_status'
]);
const SAFE_EVENTS = new Set([
  'section_view','game_selected','matchup_team_selected','player_selected',
  'prop_category_selected','prop_window_selected','parlay_leg_added',
  'parlay_leg_removed','parlay_cleared','rotation_substitution_tested',
  'rotation_defender_selected','rotation_reset','dime_opened',
  'dime_question_sent','dime_answer_received','dime_answer_failed'
]);

export function getAnalyticsChoice(){
  if(typeof window==='undefined')return null;
  try {
    const choice=window.localStorage.getItem(ANALYTICS_CHOICE_KEY);
    return choice==='accepted'||choice==='rejected'?choice:null;
  }catch{return null;}
}

export function setAnalyticsChoice(choice){
  if(typeof window==='undefined'||!['accepted','rejected'].includes(choice))return false;
  try {window.localStorage.setItem(ANALYTICS_CHOICE_KEY,choice);return true;}
  catch{return false;}
}

export function startAnalytics(){
  if(typeof window==='undefined'||getAnalyticsChoice()!=='accepted')return false;
  if(window.__pickrollGAStarted)return true;
  window.__pickrollGAStarted=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('consent','default',DENIED);
  window.gtag('consent','update',{...DENIED,analytics_storage:'granted'});
  window.gtag('js',new Date());
  // We use one genuine page view, then section_view events for SPA tab changes.
  window.gtag('config',GA_MEASUREMENT_ID,{
    send_page_view:true,
    anonymize_ip:true,
    allow_google_signals:false,
    allow_ad_personalization_signals:false
  });
  const script=document.createElement('script');
  script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id='+GA_MEASUREMENT_ID;
  script.setAttribute('data-pickroll-analytics','true');
  document.head.appendChild(script);
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  return true;
}

export function trackEvent(name,values={}){
  if(typeof window==='undefined'||!SAFE_EVENTS.has(name)||
    getAnalyticsChoice()!=='accepted'||!window.__pickrollGAStarted||
    typeof window.gtag!=='function')return false;
  const params={};
  for(const [key,value] of Object.entries(values)){
    if(!SAFE_FIELDS.has(key))continue;
    if(typeof value==='string'&&value.length<=64&&value.length>0)params[key]=value;
    else if(typeof value==='number'&&Number.isFinite(value))params[key]=value;
  }
  window.gtag('event',name,params);
  return true;
}

export function stopAnalytics(){
  if(typeof window==='undefined')return;
  if(typeof window.gtag==='function')window.gtag('consent','update',DENIED);
  window.__pickrollGAStarted=false;
  // Remove GA first-party cookies written on this host. Reload separately
  // so an already-loaded third-party script cannot continue tracking.
  try {
    for(const part of document.cookie.split(';')){
      const name=part.split('=')[0].trim();
      if(!/^_ga(?:_|$)|^_gid$|^_gat/.test(name))continue;
      for(const domain of ['', ';domain='+window.location.hostname]){
        document.cookie=name+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'+domain+'; SameSite=Lax';
      }
    }
  }catch{}
}

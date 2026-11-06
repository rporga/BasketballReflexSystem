'use client';

import {useEffect,useState} from 'react';
import {
  ANALYTICS_CHOICE_KEY,getAnalyticsChoice,setAnalyticsChoice,
  startAnalytics,stopAnalytics
} from '../lib/analytics.js';

export function AnalyticsPreferencesButton({className=''}) {
  return <button type="button" className={className||'analytics-preferences-link'}
    onClick={()=>window.dispatchEvent(new Event('pickroll:open-privacy'))}>
    Analytics preferences
  </button>;
}

export default function AnalyticsConsent(){
  const [choice,setChoice]=useState('loading');
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    const stored=getAnalyticsChoice();
    setChoice(stored);
    if(stored==='accepted')startAnalytics();
    const show=()=>setOpen(true);
    const sync=e=>{
      if(e.key===ANALYTICS_CHOICE_KEY){
        setChoice(getAnalyticsChoice());
        if(getAnalyticsChoice()==='rejected')window.location.reload();
        else if(getAnalyticsChoice()==='accepted')startAnalytics();
      }
    };
    window.addEventListener('pickroll:open-privacy',show);
    window.addEventListener('storage',sync);
    return ()=>{
      window.removeEventListener('pickroll:open-privacy',show);
      window.removeEventListener('storage',sync);
    };
  },[]);
  const choose=(value)=>{
    if(!setAnalyticsChoice(value))return;
    setChoice(value);
    setOpen(false);
    if(value==='accepted')startAnalytics();
    else {
      const wasRunning=Boolean(window.__pickrollGAStarted);
      stopAnalytics();
      if(wasRunning)window.location.reload();
    }
  };
  if(choice==='loading'||(choice!==null&&!open))return null;
  return <section className="analytics-consent" role="region" aria-label="Analytics privacy preferences">
    <div className="analytics-consent-head">
      <strong>Help improve Pick &amp; Roll</strong>
      {choice!==null&&<button type="button" className="analytics-consent-close" onClick={()=>setOpen(false)}
        aria-label="Close analytics preferences">×</button>}
    </div>
    <p>Can we use Google Analytics to understand site visits and which basketball features get used?
      It's optional, and we don't track your Dime conversations or entered odds.</p>
    <div className="analytics-consent-actions">
      <button type="button" className="analytics-consent-decline" onClick={()=>choose('rejected')}>
        {choice==='rejected'?'Keep off':'No thanks'}
      </button>
      <button type="button" className="analytics-consent-accept" onClick={()=>choose('accepted')}>
        {choice==='accepted'?'Keep on':'Allow analytics'}
      </button>
    </div>
    {choice!==null&&<span className="analytics-consent-choice">
      Currently {choice==='accepted'?'enabled':'disabled'} · You can change this any time.
    </span>}
  </section>;
}

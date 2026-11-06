'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {ANALYTICS_READY_EVENT,trackPageView} from '../lib/analytics.js';

// Real App Router navigation, including browser Back/Forward, emits one page view.
export default function AnalyticsPageviews(){
  const pathname=usePathname();
  useEffect(()=>{
    const emit=()=>trackPageView(window.location.pathname);
    emit();
    window.addEventListener(ANALYTICS_READY_EVENT,emit);
    return ()=>window.removeEventListener(ANALYTICS_READY_EVENT,emit);
  },[pathname]);
  return null;
}

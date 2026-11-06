'use client';
import {useEffect,useState} from 'react';

const THRESHOLDS={live:2*60*1000,score:15*60*1000,analysis:30*60*1000,
  rotation:20*60*1000,player:24*60*60*1000};
export default function FeedStamp({at,kind='analysis',source=''}) {
  const [now,setNow]=useState(null);
  useEffect(()=>{
    setNow(Date.now());
    const timer=setInterval(()=>setNow(Date.now()),30000);
    return ()=>clearInterval(timer);
  },[]);
  if(!at||!Number.isFinite(Date.parse(at)))return <span className="feed-stamp feed-stamp-missing">{source?source+' · ':''}Update time unavailable</span>;
  if(now===null)return <span className="feed-stamp">{source?source+' · ':''}Checking freshness…</span>;
  const age=Math.max(0,now-Date.parse(at));
  const stale=age>(THRESHOLDS[kind]||THRESHOLDS.analysis);
  const time=new Date(at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
  return <span className={'feed-stamp'+(stale?' feed-stamp-stale':'')} title={'Feed checked at '+new Date(at).toISOString()}>
    {stale?'STALE · ':''}{source?source+' · ':''}Checked {time} UTC
  </span>;
}

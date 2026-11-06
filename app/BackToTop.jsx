'use client';
import {useEffect,useState} from 'react';
export default function BackToTop(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const update=()=>setVisible(window.scrollY>550);
    update();window.addEventListener('scroll',update,{passive:true});
    return ()=>window.removeEventListener('scroll',update);
  },[]);
  if(!visible)return null;
  return <button type="button" className="back-to-top" aria-label="Back to top"
    title="Back to top"
    onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 14 6-6 6 6"/><path d="M12 9v10"/>
    </svg>
    <span>Top</span>
  </button>;
}

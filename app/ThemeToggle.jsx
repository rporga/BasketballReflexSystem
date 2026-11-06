'use client';

import {useEffect,useState} from 'react';

const STORAGE_KEY='pick-roll-theme';

function applyTheme(value){
  const theme=value==='dark'?'dark':'light';
  document.documentElement.setAttribute('data-theme',theme);
  const themeMeta=document.querySelector('meta[name="theme-color"]');
  if(themeMeta)themeMeta.setAttribute('content',theme==='dark'?'#101216':'#ffffff');
}

export default function ThemeToggle(){
  const [theme,setTheme]=useState('light');

  useEffect(()=>{
    const existing=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
    setTheme(existing);
    const preference=window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange=()=>{
      let saved;
      try{saved=window.localStorage.getItem(STORAGE_KEY);}catch{}
      if(saved==='light'||saved==='dark')return;
      const next=preference.matches?'dark':'light';
      applyTheme(next);
      setTheme(next);
    };
    const onStorage=(event)=>{
      if(event.key!==STORAGE_KEY)return;
      const next=event.newValue==='light'||event.newValue==='dark'
        ?event.newValue:(preference.matches?'dark':'light');
      applyTheme(next);
      setTheme(next);
    };
    preference.addEventListener?.('change',onSystemChange);
    window.addEventListener('storage',onStorage);
    return ()=>{
      preference.removeEventListener?.('change',onSystemChange);
      window.removeEventListener('storage',onStorage);
    };
  },[]);

  const switchTheme=()=>{
    const next=theme==='dark'?'light':'dark';
    setTheme(next);
    applyTheme(next);
    try{window.localStorage.setItem(STORAGE_KEY,next);}catch{}
  };

  const isDark=theme==='dark';
  return <button type="button" className="theme-toggle" onClick={switchTheme}
    aria-label={'Switch to '+(isDark?'light':'dark')+' mode'}
    aria-pressed={isDark} title={'Switch to '+(isDark?'light':'dark')+' mode'}>
    <span className="theme-toggle-symbol" aria-hidden="true">
      {isDark
        ?<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>
        </svg>
        :<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.75 14.5A8.5 8.5 0 0 1 9.5 3.25 8.5 8.5 0 1 0 20.75 14.5Z"/>
        </svg>}
    </span>
    <span className="theme-toggle-label">{isDark?'Light mode':'Dark mode'}</span>
  </button>;
}

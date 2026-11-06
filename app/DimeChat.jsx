'use client';

import {useEffect,useRef,useState} from 'react';

const QUICK=[
  'What stands out in this matchup?',
  'Compare the third and fourth quarters.',
  'How do injuries affect the prediction?'
];
function textOnly(value){return typeof value==='string'?value.trim():'';}
function time(){return new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
export default function DimeChat({context}){
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState('');
  const [messages,setMessages]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const scroller=useRef(null);
  const request=useRef(null);
  const input=useRef(null);
  useEffect(()=>{if(open){input.current?.focus();}},[open]);
  useEffect(()=>{if(open&&scroller.current)scroller.current.scrollTop=scroller.current.scrollHeight;},[messages,busy,open]);
  useEffect(()=>()=>request.current?.abort(),[]);
  const contextTag=context?.tab==='players'?'Player Explorer':context?.tab==='teams'?'Matchup Lab':'Live Games';
  async function send(proposed){
    const message=textOnly(proposed??draft);
    if(!message||busy)return;
    if(message.length>850){setError('Please use 850 characters or fewer.');return;}
    const next=[...messages.filter(m=>m.content&&['user','assistant'].includes(m.role)),{role:'user',content:message,at:time()}];
    setMessages([...next,{role:'assistant',content:'',at:time(),streaming:true}]);
    setDraft('');
    setError('');
    setBusy(true);
    const controller=new AbortController();
    request.current=controller;
    try{
      const response=await fetch('/api/dime',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:next.slice(-12).map(({role,content})=>({role,content})),context}),
        signal:controller.signal,cache:'no-store'
      });
      if(!response.ok){
        const details=await response.json().catch(()=>({}));
        throw new Error(details.error||'Dime could not answer that question.');
      }
      if(!response.body)throw new Error('Dime did not return a response stream.');
      const reader=response.body.getReader(),decoder=new TextDecoder();
      let result='';
      while(true){
        const {value,done}=await reader.read();
        if(done)break;
        result+=decoder.decode(value,{stream:true});
        setMessages([...next,{role:'assistant',content:result,at:time(),streaming:true}]);
      }
      result+=decoder.decode();
      if(!result.trim())throw new Error('Dime returned an empty response. Try again.');
      setMessages([...next,{role:'assistant',content:result,at:time()}]);
    }catch(e){
      if(e.name!=='AbortError'){
        setMessages(next);
        setError(e.message||'Unable to connect to Dime.');
      }
    }finally{
      setBusy(false);
      request.current=null;
    }
  }
  function reset(){
    request.current?.abort();
    setBusy(false);
    setMessages([]);
    setError('');
    setDraft('');
  }
  return <>
    <button className={'dime-launcher '+(open?'is-open':'')} onClick={()=>setOpen(!open)} aria-label={open?'Close Dime assistant':'Ask Dime AI'} aria-expanded={open} aria-controls="dime-panel">
      <span className="dime-launcher-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-1.2 4.4A9 9 0 0 1 12 20a9.1 9.1 0 0 1-4.5-1.2L3 20l1.2-4.5A8.8 8.8 0 0 1 3 11a9 9 0 0 1 9-9 9 9 0 0 1 9 9v.5Z"/></svg></span>
      <span>{open?'Close Dime':'Ask Dime'}</span>
      <span className="dime-launcher-arrow">{open?'×':'↗'}</span>
    </button>
    {open&&<div className="dime-backdrop" onClick={()=>setOpen(false)} aria-hidden="true"/>}
    <aside id="dime-panel" className={'dime-panel '+(open?'visible':'')} role="dialog" aria-modal={open?'true':undefined} aria-label="Dime AI basketball assistant" aria-hidden={!open}>
      <div className="dime-header">
        <div className="dime-identity">
          <div className="dime-avatar">D<span>.</span></div>
          <div><strong>Dime<span className="dime-title-dot">.</span></strong><small>Pick & Roll AI Assistant</small></div>
        </div>
        <div className="dime-head-actions"><button onClick={reset} title="New conversation" aria-label="Start a new Dime conversation">↺</button><button onClick={()=>setOpen(false)} title="Close" aria-label="Close Dime">×</button></div>
      </div>
      <div className="dime-context"><span className="dime-context-circle"/> <b>VIEWING</b><span>{contextTag}</span></div>
      <div className="dime-messages" ref={scroller} role="log" aria-label="Conversation with Dime" aria-live="polite" aria-relevant="additions text">
        {messages.length===0&&<div className="dime-intro">
          <div className="dime-intro-mark">D<span>.</span></div>
          <h2>Hey, I'm Dime.</h2>
          <p>Your courtside assistant. Ask me about scores, quarter trends, player performances or who's got the edge.</p>
          <div className="dime-intro-label">TRY ASKING</div>
          <div className="dime-prompts">{QUICK.map(q=><button key={q} onClick={()=>send(q)} disabled={busy}>{q}<span>↗</span></button>)}</div>
        </div>}
        {messages.map((m,i)=><div key={i} className={'dime-message '+m.role}>
          {m.role==='assistant'&&<div className="dime-message-icon">D.</div>}
          <div className="dime-message-body">
            <div className="dime-bubble">{m.content||<span className="dime-thinking"><i/><i/><i/></span>}</div>
            {m.content&&<span className="dime-message-time">{m.role==='assistant'?'Dime':'You'} · {m.at||''}</span>}
          </div>
        </div>)}
      </div>
      {error&&<div className="dime-error" role="alert">{error}</div>}
      <form className="dime-compose" onSubmit={e=>{e.preventDefault();send();}}>
        <div className="dime-compose-box"><textarea ref={input} rows={2} value={draft} maxLength={850} placeholder="Ask Dime anything about basketball..." onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} disabled={busy}/>
          <button type="submit" disabled={busy||!draft.trim()} aria-label="Send message to Dime">{busy?<span className="dime-spinner"/>:'↑'}</button></div>
        <p>Dime uses current ESPN data. Predictions are experimental, not guarantees.</p>
      </form>
    </aside>
  </>;
}

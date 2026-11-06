'use client';

import {useEffect,useMemo,useState} from 'react';
import {PROP_DEFS,aggregate,shooting,forecast,comparison,decimalOdds} from '../lib/prop-analytics.js';
import FeedStamp from './FeedStamp';

const STORAGE='pick-roll-parlay-v2';
const LEGACY_STORAGE='pick-roll-parlay-v1';
const CORE=['PTS','REB','AST','3PM','PRA','PR','PA','RA','STL','BLK','STOCKS'];
const show=(v,d=1)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(d);
const pct=v=>v==null?'—':show(v,0)+'%';
const signed=v=>v==null?'—':(v>0?'+':'')+show(v);
const rangeName=n=>n===52?'Season':'Last '+n;
const niceDate=s=>{if(!s)return '—';const d=new Date(s);return Number.isNaN(+d)?'—':d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});};

function SelectWindow({value,onChange}){
 return <div className="prop-segments" aria-label="Game sample">
   {[[5,'L5'],[10,'L10'],[20,'L20'],[52,'SEASON']].map(([v,l])=>
     <button type="button" key={v} aria-pressed={v===value} className={v===value?'active':''} onClick={()=>onChange(v)}>{l}</button>)}
 </div>;
}
function PropBars({games,keyName,line,side}){
 const [selectedId,setSelectedId]=useState(null);
 const recent=games.slice(0,20).filter(g=>Number.isFinite(g.stats?.[keyName])).reverse();
 const max=Math.max(1,...recent.map(g=>g.stats[keyName]),Number(line)||0)*1.1;
 const selected=recent.find(g=>g.id===selectedId)||recent[recent.length-1];
 return <div className="prop-bars-scroller">
   <div className="prop-bars-plot" role="group" aria-label={'Last '+recent.length+' games for '+(PROP_DEFS[keyName]?.label||keyName)+' compared with line '+line}>
     {line!=null&&Number.isFinite(Number(line))&&<div className="prop-line-mark" style={{bottom:Math.min(100,Math.max(0,100*Number(line)/max))+'%'}}>
       <span>{line}</span>
     </div>}
     {recent.map(g=>{
       const v=g.stats[keyName],push=line!=null&&v===Number(line);
       const hit=line!=null&&!push&&(side==='over'?v>Number(line):v<Number(line));
       return <button type="button" className={'prop-bar-slot '+(selected?.id===g.id?'selected':'')} key={g.id}
         onClick={()=>setSelectedId(g.id)} aria-pressed={selected?.id===g.id}
         title={niceDate(g.date)+' vs '+g.opponent+': '+v}
         aria-label={niceDate(g.date)+' against '+g.opponent+', '+v+' '+(PROP_DEFS[keyName]?.label||keyName)}>
         <span className={'prop-bar '+(push?'push':hit?'hit':'miss')} style={{height:Math.max(4,100*v/max)+'%'}}/>
         <small>{niceDate(g.date).split(' ')[0]}</small>
       </button>;
     })}
   </div>
   {selected&&<div className="prop-selected-game"><span>{niceDate(selected.date)} · {selected.home?'vs':'@'} {selected.opponent}</span>
     <strong>{selected.stats[keyName]} {keyName}</strong>
     <span>{selected.stats.MIN==null?'':'· '+selected.stats.MIN+' MIN'}{selected.stats.PLUSMINUS==null?'':' · '+signed(selected.stats.PLUSMINUS)+' +/-'}</span>
   </div>}
   <div className="prop-bars-key"><span><i className="good"/>Hit</span><span><i className="other"/>Miss</span><span><i className="push"/>Push</span>
     <span>Source: ESPN game logs</span></div>
 </div>;
}
function Stat({label,value,hint}){
 return <div className="prop-stat"><small>{label}</small><strong>{value}</strong>{hint&&<span>{hint}</span>}</div>;
}
function Insights({data,games,prop,team}){
 const metrics=data?.metrics||{},next=data?.nextGame;
 const form=aggregate(games,prop,5),season=aggregate(games,prop,52);
 const efficiency=metrics.shooting;
 const lastOpp=next?.opponentId?games.filter(g=>g.opponentId===next.opponentId):[];
 const vs=aggregate(lastOpp,prop,20);
 const homeAway=next?.home?'home':'away';
 const site=games.filter(g=>next?g.home===next.home:true);
 const split=aggregate(site,prop,20);
 const plus=metrics.plusMinus;
 const formDelta=form.mean!=null&&season.mean!=null?form.mean-season.mean:null;
 const injuries=data?.injuries?.teammates||[];
 return <div className="prop-insight-grid">
   <div className="prop-insight-card"><div className="prop-insight-heading"><span>01 / OPPORTUNITY</span><h4>Minutes & Volume</h4></div>
     <div className="prop-small-grid">
       <Stat label="L5 MIN" value={show(metrics.minutes?.l5)}/>
       <Stat label="SEASON MIN" value={show(metrics.minutes?.season)}/>
       <Stat label="L10 FGA" value={show(metrics.shotAttempts?.l10)}/>
       <Stat label="L10 3PA" value={show(metrics.threeAttempts?.l10)}/>
     </div>
     <p>{metrics.minutes?.l5==null?'Minutes history unavailable.':metrics.minutes?.l5>metrics.minutes?.season+2?'Minutes trending above season level.':metrics.minutes?.l5<metrics.minutes?.season-2?'Recent minutes have decreased.':'Minutes broadly in line with season form.'}</p>
   </div>
   <div className="prop-insight-card"><div className="prop-insight-heading"><span>02 / FORM & CONSISTENCY</span><h4>Performance Pattern</h4></div>
     <div className="prop-small-grid">
       <Stat label="RECENT CHANGE" value={formDelta==null?'—':signed(formDelta)} hint="L5 vs season"/>
       <Stat label="L10 MEDIAN" value={show(aggregate(games,prop,10).median)}/>
       <Stat label="L10 SPREAD" value={show(aggregate(games,prop,10).sd)} hint="standard deviation"/>
       <Stat label="SAMPLE" value={String(games.length)} hint="regular-season G"/>
     </div>
     <p>Compare the last five with the full season to spot changes in role and output.</p>
   </div>
   <div className="prop-insight-card"><div className="prop-insight-heading"><span>03 / SHOOTING & PLAYMAKING</span><h4>Efficiency</h4></div>
     <div className="prop-small-grid">
       <Stat label="TS%" value={pct(efficiency?.ts)}/>
       <Stat label="eFG%" value={pct(efficiency?.eFg)}/>
       <Stat label="FG%" value={pct(efficiency?.fgPct)}/>
       <Stat label="AST / TO" value={metrics.assists?.l10!=null&&metrics.turnovers?.l10>0?show(metrics.assists.l10/metrics.turnovers.l10,2):'—'}/>
     </div>
     <p>Efficiency is calculated from observed shooting totals, not estimated shot quality.</p>
   </div>
   <div className="prop-insight-card"><div className="prop-insight-heading"><span>04 / ON-COURT IMPACT</span><h4>+ / − & Defense</h4></div>
     <div className="prop-small-grid">
       <Stat label="RECENT +/−" value={signed(plus?.average)} hint={plus?plus.sample+' games':'not available'}/>
       <Stat label="POSITIVE GAMES" value={plus?plus.positive+'/'+plus.sample:'—'}/>
       <Stat label="L10 STL" value={show(metrics.steals?.l10)}/>
       <Stat label="L10 BLK" value={show(metrics.blocks?.l10)}/>
     </div>
     <p>Game +/− tracks team scoring while the player is on court; it isn't adjusted for teammates or opponents.</p>
   </div>
   <div className="prop-insight-card prop-matchup-context"><div className="prop-insight-heading"><span>05 / MATCHUP CONTEXT</span>
     <h4>{next?.opponent?'Next: '+(next.home?'vs ':'@ ')+next.opponent:'Upcoming Matchup'}</h4></div>
     {next?<><div className="prop-small-grid">
       <Stat label="VS OPPONENT" value={show(vs.mean)} hint={vs.sample+' current-season G'}/>
       <Stat label={homeAway.toUpperCase()+' SPLIT'} value={show(split.mean)} hint={split.sample+' games'}/>
       <Stat label="OPP PTS ALLOWED" value={show(data?.opponentForm?.pointsAllowed)} hint={data?.opponentForm?.sample?data.opponentForm.sample+' recent G':'Unavailable'}/>
       <Stat label="NEXT GAME" value={niceDate(next.date)}/>
     </div>
     {vs.sample===0&&<p>No current-season head-to-head sample yet.</p>}</>:
     <p>The next scheduled game is not available from the schedule feed.</p>}
     {!!injuries.length&&<div className="prop-injury-list"><strong>Listed teammate availability</strong>
       <div>{injuries.map(j=><span key={j.id}>{j.name} · {j.status}</span>)}</div></div>}
   </div>
 </div>;
}
function ParlayBuilder({legs,setLegs,clearStatus}){
 const [quotedOdds,setQuotedOdds]=useState('');
 const [quotedFormat,setQuotedFormat]=useState('decimal');
 const evaluation=useMemo(()=>comparison(legs),[legs]);
 const allPriced=legs.length>0&&legs.every(l=>decimalOdds(l.odds,l.oddsFormat)!=null);
 const combinedDecimal=allPriced?legs.reduce((x,l)=>x*decimalOdds(l.odds,l.oddsFormat),1):null;
 const quotedDecimal=decimalOdds(quotedOdds,quotedFormat);
 const implied=quotedDecimal==null?null:100/quotedDecimal;
 function update(i,field,value){setLegs(prev=>prev.map((leg,n)=>i===n?{...leg,[field]:value}:leg));}
 const commonTarget=legs.length>=2&&legs[0].targetGameId&&legs.every(l=>l.targetGameId===legs[0].targetGameId);
 return <section className="parlay-builder" id="parlay-builder" aria-label="Parlay explorer">
   <div className="prop-section-heading"><div><span className="intel-kicker">MULTI-PLAYER ANALYSIS</span><h3>Parlay Explorer</h3></div>
     <span className="prop-count">{legs.length} / 8 LEGS</span></div>
   <div className="parlay-intro">Select players and add props above. Your saved legs remain when switching teams.</div>
   {!legs.length?<div className="parlay-empty"><span aria-hidden="true">◎</span><strong>Your prop board is empty</strong>
     <p>Add a player prop from the dashboard to compare multiple legs here.</p></div>:
   <>
     <div className="parlay-leg-list">{legs.map((l,i)=>{
       const hit=aggregate(l.games||[],l.prop,10,Number(l.line),l.side);
       return <div key={l.key} className="parlay-leg">
         <div className="parlay-leg-top"><span className="parlay-index">{String(i+1).padStart(2,'0')}</span>
           <div className="parlay-leg-name"><strong>{l.name}</strong><span>{l.team} {l.opponent?'· '+l.opponent:''}{l.targetDate&&Date.now()>Date.parse(l.targetDate)+6*3600000?' · Past game':''}</span></div>
           <button type="button" className="parlay-remove" aria-label={'Remove '+l.name+' '+l.prop} onClick={()=>setLegs(prev=>prev.filter(x=>x.key!==l.key))}>×</button>
         </div>
         <div className="parlay-leg-stats">
           <strong>{l.prop} {l.side==='over'?'Over':'Under'} {l.line}</strong>
           <span>{l.refreshError?'Refresh unavailable':!Array.isArray(l.games)?'Updating game logs…':hit.sample?hit.hits+'/'+(hit.decisions??hit.sample)+' recent hits':'No recent games'}</span>
         </div>
         <div className="parlay-leg-pricing">
           <label>ODDS
             <input type="number" inputMode="decimal" placeholder={l.oddsFormat==='american'?'-110':'1.91'} step="any" value={l.odds||''} onChange={e=>update(i,'odds',e.target.value)}/>
           </label>
           <label>FORMAT
             <select value={l.oddsFormat||'decimal'} onChange={e=>{setLegs(prev=>prev.map((leg,n)=>n===i?{...leg,oddsFormat:e.target.value,odds:''}:leg));}}>
               <option value="decimal">Decimal</option><option value="american">American</option></select>
           </label>
         </div>
       </div>;
     })}</div>
     <div className="parlay-summary">
       <div className="parlay-summary-top"><span>COMBINED BOARD</span>
         <button type="button" className="parlay-clear" onClick={()=>{setLegs([]);clearStatus?.();}}>Clear all</button></div>
       <div className="parlay-summary-grid">
         <Stat label="THEORETICAL ODDS" value={combinedDecimal==null?'Add leg odds':show(combinedDecimal,2)+'×'} hint="product of leg prices"/>
         <Stat label="QUOTED BREAK-EVEN" value={implied==null?'Enter quote':pct(implied)} hint="actual parlay price"/>
         <Stat label="HISTORICAL REFERENCE" value={evaluation.independentReference==null?'—':pct(evaluation.independentReference)} hint="independence assumption"/>
       </div>
       <div className="parlay-quoted-input">
         <label>ACTUAL PARLAY QUOTE
           <input type="number" step="any" inputMode="decimal" value={quotedOdds} placeholder={quotedFormat==='american'?'+500':'6.00'} onChange={e=>setQuotedOdds(e.target.value)}/>
         </label>
         <label>FORMAT
           <select value={quotedFormat} onChange={e=>{setQuotedFormat(e.target.value);setQuotedOdds('');}}>
             <option value="decimal">Decimal</option><option value="american">American</option>
           </select>
         </label>
         <span>{quotedDecimal!=null&&combinedDecimal!=null?'Quoted: '+show(quotedDecimal,2)+'× · Uncorrelated product: '+show(combinedDecimal,2)+'×':'Compare a real quote with the leg-price product.'}</span>
       </div>
       {commonTarget&&evaluation.coHits?<div className="parlay-cohit"><span>HISTORICAL JOINT HIT</span>
         <strong>{evaluation.coHits.count} / {evaluation.coHits.n} shared games</strong>
         <small>{pct(evaluation.coHits.rate)} observed · not a future forecast</small></div>:null}
       {evaluation.pairs.length>0&&<div className="parlay-correlations"><span>HISTORICAL PAIR RELATIONSHIPS</span>
         {evaluation.pairs.map(p=><div key={p.a+'-'+p.b}><strong>{legs[p.a].name.split(' ').slice(-1)} × {legs[p.b].name.split(' ').slice(-1)}</strong>
           <span>{p.r==null?'—':(p.r>0?'+':'')+show(p.r,2)} · {p.n} shared G</span></div>)}</div>}
       {legs.length>=2&&!evaluation.pairs.length&&<p className="prop-soft-note">No shared-game sample large enough to measure player correlation.</p>}
       <p className="prop-footnote">Historical results are not future probabilities. Leg-price products are not sportsbook parlay quotes.</p>
     </div>
   </>}
 </section>;
}

export default function PlayerPropHub({player,team,feed}){
 const [prop,setProp]=useState('PTS'),[windowSize,setWindowSize]=useState(10);
 const [side,setSide]=useState('over'),[line,setLine]=useState('');
 const [odds,setOdds]=useState(''),[oddsFormat,setOddsFormat]=useState('decimal');
 const [legs,setLegs]=useState([]),[loaded,setLoaded]=useState(false),[message,setMessage]=useState('');
 const [details,setDetails]=useState(false);
 const d=feed?.data?.playerId===player?.id?feed.data:null;
 const games=d?.games||[];
 const count=games.length;
 useEffect(()=>{try{
   const raw=window.localStorage.getItem(STORAGE)||window.localStorage.getItem(LEGACY_STORAGE);
   if(raw){
     const saved=JSON.parse(raw);
     if(Array.isArray(saved))setLegs(saved.filter(l=>l&&l.key&&PROP_DEFS[l.prop]&&/^\d{1,12}$/.test(String(l.playerId||'')))
       .slice(0,8).map(l=>({...l,games:undefined,refreshError:false})));
   }
 }catch{}setLoaded(true);},[]);
 // Store selections only. Cached stats are not persisted and are refreshed from the server.
 useEffect(()=>{if(loaded){try{
   window.localStorage.setItem(STORAGE,JSON.stringify(legs.map(({games,refreshError,...selection})=>selection)));
   window.localStorage.removeItem(LEGACY_STORAGE);
 }catch{}}},[legs,loaded]);
 const pendingIds=[...new Set(legs.filter(l=>!Array.isArray(l.games)&&!l.refreshError).map(l=>String(l.playerId)))].filter(id=>/^\d{1,12}$/.test(id));
 const pendingKey=pendingIds.join(',');
 useEffect(()=>{
   if(!loaded||!pendingKey)return;
   const controller=new AbortController();
   Promise.allSettled(pendingKey.split(',').map(async id=>{
     const resp=await fetch('/api/props?player='+encodeURIComponent(id),{signal:controller.signal,cache:'no-store'});
     if(!resp.ok)throw Error('game log unavailable');
     const data=await resp.json();
     if(String(data.playerId)!==id||!Array.isArray(data.games))throw Error('invalid player data');
     return {id,games:data.games.slice(0,52).map(g=>({id:g.id,date:g.date,stats:g.stats})),updatedAt:data.fetchedAt};
   })).then(results=>{
     if(controller.signal.aborted)return;
     const updates=new Map(pendingKey.split(',').map((id,i)=>[id,results[i]]));
     setLegs(prev=>prev.map(l=>{
       const result=updates.get(String(l.playerId));
       if(!result||Array.isArray(l.games)||l.refreshError)return l;
       return result.status==='fulfilled'
         ?{...l,games:result.value.games,refreshedAt:result.value.updatedAt}
         :{...l,games:[],refreshError:true};
     }));
   });
   return ()=>controller.abort();
 },[loaded,pendingKey]);
 useEffect(()=>{setLine('');setMessage('');setOdds('');},[player?.id,prop]);
 useEffect(()=>{
  if(d&&line===''){
   const values=aggregate(games,prop,10);
   if(values.mean!=null)setLine(String(Math.max(.5,Math.floor(values.mean)+.5)));
  }
 },[d?.fetchedAt,prop,line,player?.id]);
 const threshold=Number(line);
 const validLine=line!==''&&Number.isFinite(threshold)&&threshold>=.5&&threshold<=400;
 const summary=useMemo(()=>aggregate(games,prop,windowSize,validLine?threshold:null,side),[games,prop,windowSize,validLine,threshold,side]);
 const projected=useMemo(()=>forecast(games,prop),[games,prop]);
 const direction=side==='over'?'Over':'Under';
 const next=d?.nextGame;
 const title=player?.name||'Choose a player';
 function add(){
  if(!d||!validLine||summary.sample<3){setMessage('Select a player with at least three games and a valid line.');return;}
  if(legs.length>=8){setMessage('Eight legs maximum. Remove a leg first.');return;}
  const id=String(player.id),key=[id,prop,side,threshold,next?.id||'upcoming'].join('|');
  if(legs.some(x=>x.key===key)){setMessage('This prop is already in your board.');return;}
  const l={key,playerId:id,name:title,team:team?.abbreviation||d.team||'',
    targetGameId:next?.id||null,targetDate:next?.date||null,opponent:next?.abbreviation||'',
    prop,side,line:threshold,odds,oddsFormat,
    games:games.slice(0,52).map(g=>({id:g.id,date:g.date,stats:g.stats}))};
  setLegs(prev=>[...prev,l]);setMessage('Added to your parlay board.');
 }
 return <div className="prop-hub">
   <div className="prop-dashboard panel padded" aria-label="Player prop intelligence">
     <div className="prop-section-heading">
       <div><span className="intel-kicker">PLAYER PROP INTELLIGENCE</span><h2>Tonight's Player Outlook</h2></div>
       <span className="prop-count">{d?.season?String(d.season-1)+'–'+String(d.season).slice(-2):'CURRENT SEASON'}</span>
     </div>
     {feed?.loading&&!d?<div className="prop-fetching">Loading current-season game logs and player form…</div>:
       feed?.error&&!d?<div className="prop-fetching">{feed.error} <button type="button" onClick={feed.refresh}>Retry ↻</button></div>:
       !d?<div className="prop-fetching">Select a player to explore their prop trends.</div>:
       !count?<div className="prop-fetching">No completed regular-season games yet for {title}. Prop trends will appear once games are recorded.</div>:
       <>
       <div className="prop-player-head"><div><strong>{title}</strong><span>{team?.abbreviation||d.team} · {count} current-season games</span></div>
         <div className="prop-player-head-game">{next?<>NEXT GAME <b>{next.home?'vs':'@'} {next.abbreviation}</b><span>{niceDate(next.date)}</span></>:'UPCOMING GAME UNAVAILABLE'}</div></div>
       <div className="prop-category-scroll"><div className="prop-categories" aria-label="Prop categories">
         {CORE.map(k=><button key={k} type="button" aria-pressed={prop===k} className={prop===k?'active':''} onClick={()=>setProp(k)}>{k}</button>)}
       </div></div>
       <div className="prop-toolbar">
         <div className="prop-which"><span>PROP</span><strong>{PROP_DEFS[prop].label}</strong></div>
         <div className="prop-side-switch" aria-label="Prop direction">
           {['over','under'].map(x=><button type="button" key={x} className={x===side?'active':''} onClick={()=>setSide(x)} aria-pressed={x===side}>{x==='over'?'Over':'Under'}</button>)}
         </div>
         <label className="prop-line-input">LINE<input aria-label="Prop line" type="number" min=".5" max="400" step=".5" inputMode="decimal" value={line} onChange={e=>setLine(e.target.value)}/></label>
         <SelectWindow value={windowSize} onChange={setWindowSize}/>
       </div>
       <div className="prop-summary-row">
         <div className="prop-primary-hit"><span>HISTORICAL {direction.toUpperCase()} HIT RATE</span>
           <strong>{validLine?pct(summary.hitRate):'—'}</strong>
           <small>{validLine?summary.hits+'/'+(summary.decisions??summary.sample)+' games · '+rangeName(windowSize)+(summary.pushes?' · '+summary.pushes+' push':''):'Enter a prop line'}</small></div>
         <div className="prop-secondary-stats">
           <Stat label="FORM ESTIMATE" value={projected?show(projected.expected):'—'} hint={prop}/>
           <Stat label="L10 AVERAGE" value={show(aggregate(games,prop,10).mean)}/>
           <Stat label="MEDIAN" value={show(summary.median)}/>
           <Stat label="RECENT STREAK" value={validLine?summary.streak+' G':'—'}/>
         </div>
       </div>
       <div className="prop-chart-head"><div><strong>Last 20 Games</strong><small>{PROP_DEFS[prop].label} · line {validLine?line:'—'}</small></div>
         <div className="prop-chart-projection">{projected?'Middle 50%: '+show(projected.range[0])+'–'+show(projected.range[1]):'More games needed for a range'}</div>
       </div>
       <PropBars games={games} keyName={prop} line={validLine?threshold:null} side={side}/>
       <div className="prop-add-zone">
         <div className="prop-add-price"><label>OPTIONAL PRICE<input type="number" step="any" inputMode="decimal" value={odds} onChange={e=>setOdds(e.target.value)} placeholder={oddsFormat==='decimal'?'1.91':'-110'}/></label>
           <label>ODDS FORMAT<select value={oddsFormat} onChange={e=>{setOdds('');setOddsFormat(e.target.value);}}><option value="decimal">Decimal</option><option value="american">American</option></select></label></div>
         <button type="button" className="prop-add-button" disabled={!validLine||summary.sample<3||legs.length>=8} onClick={add}>
           <span>+ Add {prop} {direction} {validLine?line:'—'} to Board</span><span aria-hidden="true">↗</span></button>
       </div>
       {message&&<p className="prop-message" role="status">{message}</p>}
       <button type="button" className={'prop-details-toggle '+(details?'open':'')} aria-expanded={details}
         onClick={()=>setDetails(x=>!x)}>
         <span><b>Player Intelligence Report</b><small>Minutes · efficiency · +/− · defense · matchup</small></span>
         <span aria-hidden="true">{details?'−':'+'}</span>
       </button>
       {details&&<Insights data={d} games={games} prop={prop} team={team}/>}
       <div className="prop-source">ESPN · {count} regular-season games · {d?.metrics?.plusMinus?.sample||0} games with +/− · <FeedStamp at={d?.fetchedAt} kind="player"/></div>
       </>
     }
   </div>
   <ParlayBuilder legs={legs} setLegs={setLegs} clearStatus={()=>setMessage('')}/>
 </div>;
}

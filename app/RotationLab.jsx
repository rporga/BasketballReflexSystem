'use client';
import {useEffect,useMemo,useState} from 'react';
import {evaluateRotation} from '../lib/rotation-analytics.js';
import {probabilityMatchesScore} from '../lib/espn-live.js';
import FeedStamp from './FeedStamp';
import {trackEvent} from '../lib/analytics.js';

const num=(v,d=1)=>v==null?'—':Number(v).toFixed(d);
const delta=v=>v>0?'+':'';
function Squad({team,ids}){
  const active=new Set(ids);
  return <details className="rotation-squad rotation-roster-panel">
    <summary><span><small>FULL TEAM ROSTER</small><strong>{team.name||'Team'}</strong></span>
      <span>{team.players.length} players <b aria-hidden="true">+</b></span></summary>
    <div className="rotation-roster-list">{team.players.map(p=><div className="rotation-roster-row" key={p.id}>
      <div><strong>{p.name}</strong><small>{p.position||'—'} · {active.has(p.id)?'IN SELECTED FIVE':'BENCH / ROSTER'}{p.injury?.status?' · '+p.injury.status:''}</small></div>
      <b>{p.profile.sample?num(p.profile.pts)+' PPG · '+num(p.profile.minutes)+' MIN':'Recent stats unavailable'}</b>
    </div>)}</div>
  </details>;
}
export default function RotationLab({mode,data,loading,error,onRefresh,prior,liveGame,liveWin}){
  const [homeFive,setHomeFive]=useState([]);
  const [awayFive,setAwayFive]=useState([]);
  const [side,setSide]=useState('home');
  const [outId,setOutId]=useState('');
  const [inId,setInId]=useState('');
  const [attackerId,setAttackerId]=useState('');
  const [defenderId,setDefenderId]=useState('');
  const [history,setHistory]=useState([]);
  const home=data?.teams?.home,away=data?.teams?.away;
  const key=(home?.id||'')+'|'+(away?.id||'')+'|'+(data?.game?.id||'pregame');
  const baseH=home?.onCourt?.map(p=>p.id)||[],baseA=away?.onCourt?.map(p=>p.id)||[];
  const H=homeFive.length===5?homeFive:baseH,A=awayFive.length===5?awayFive:baseA;
  const current=side==='home'?H:A;
  const selected=side==='home'?home:away;
  const bench=selected?.players?.filter(p=>!current.includes(p.id))||[];
  const currentPlayers=selected?.players?.filter(p=>current.includes(p.id))||[];
  const all=[...(home?.players||[]).filter(p=>H.includes(p.id)).map(p=>({...p,side:'home'})),
    ...(away?.players||[]).filter(p=>A.includes(p.id)).map(p=>({...p,side:'away'}))];
  const attacker=all.find(p=>p.id===attackerId);
  const opposing=attacker?all.filter(p=>p.side!==attacker.side):[];
  const evaluation=useMemo(()=>{
    if(!data)return null;
    const observedGame=liveGame?{
      status:liveGame.status,period:liveGame.period,clock:liveGame.clock,
      homeScore:liveGame.home?.score,awayScore:liveGame.away?.score
    }:data.game;
    const liveHomeWin=probabilityMatchesScore(liveWin,liveGame)?liveWin.home:null;
    return evaluateRotation({...data,game:observedGame},{homeIds:H,awayIds:A,attackerId,defenderId,priorHomeWin:prior,liveHomeWin});
  },[data,liveGame,liveWin,homeFive,awayFive,attackerId,defenderId,prior]);
  const labels=new Map([...(home?.players||[]),...(away?.players||[])].map(p=>[p.id,p.name]));

  useEffect(()=>{setHomeFive([]);setAwayFive([]);setSide('home');setOutId('');setInId('');
    setAttackerId('');setDefenderId('');setHistory([]);},[key]);
  useEffect(()=>{
    if(!current.includes(outId))setOutId('');
    if(!bench.some(p=>p.id===inId))setInId('');
  },[side,homeFive,awayFive,data?.fetchedAt]);
  useEffect(()=>{
    if(!all.some(p=>p.id===attackerId)){setAttackerId('');setDefenderId('');}
    else if(!opposing.some(p=>p.id===defenderId))setDefenderId('');
  },[homeFive,awayFive,data?.fetchedAt]);
  function substitute(){
    if(!outId||!inId||!current.includes(outId)||!bench.some(p=>p.id===inId))return;
    const updated=current.map(id=>id===outId?inId:id);
    if(side==='home')setHomeFive(updated);else setAwayFive(updated);
    setHistory(items=>items.concat([{side,out:labels.get(outId),in:labels.get(inId)}]));
    trackEvent('rotation_substitution_tested',{side,scenario_type:'substitution'});
    setOutId('');setInId('');
  }
  const reset=()=>{setHomeFive([]);setAwayFive([]);setOutId('');setInId('');setAttackerId('');setDefenderId('');setHistory([]);trackEvent('rotation_reset',{scenario_type:'lineup'});};
  const changed=history.length||attackerId||defenderId;
  if(!home||!away)return <section className="rotation-section rotation-advanced">
    <div className="rotation-heading"><div><span className="intel-kicker">OPTIONAL DEEP DIVE</span><h2>Rotations & Full Rosters</h2></div></div>
    <div className="intel-surface"><p className="intel-muted">{loading?'Loading rosters and recent boxscores…':error||'Choose a game or two teams to explore rotations.'}</p>
      {error&&<button className="intel-refresh" onClick={onRefresh}>Retry ↻</button>}</div>
  </section>;
  return <section className="rotation-section rotation-advanced" aria-label="Advanced roster and rotation analysis">
    <details className="rotation-explorer">
      <summary className="rotation-explorer-trigger">
        <span className="rotation-explorer-icon" aria-hidden="true">↔</span>
        <span className="rotation-explorer-title"><small>OPTIONAL DEEP DIVE · FULL ROSTERS</small>
          <strong>Explore Rotations & Substitutions</strong>
          <span>Test bench changes, defensive matchups and lineup effects after reviewing the scouting report.</span></span>
        <span className="rotation-explorer-action" aria-hidden="true">Explore <b>+</b></span>
      </summary>
      <div className="rotation-explorer-body">
    <div className="rotation-heading rotation-explorer-heading"><div><span className="intel-kicker">SCOUTING / LINEUP DEEP DIVE</span><h2>Rotation Analysis</h2></div>
      <button className="intel-refresh" onClick={onRefresh}>Update lineup ↻</button></div>
    <div className="rotation-context">
      <span className="rotation-badge">{data.game?.status==='in'?'LIVE LINEUPS':data.game?.status==='post'?'FINAL':'RECENT STARTERS'}</span>
      <span>{home.gameSample} / {away.gameSample} recent games · <FeedStamp at={data.fetchedAt} kind={data.game?.status==='in'?'live':'rotation'}/></span>
    </div>
    <div className="rotation-squads"><Squad team={away} ids={A}/><Squad team={home} ids={H}/></div>
    {!!((home.firstQuarterLineups||[]).length||(away.firstQuarterLineups||[]).length)&&
      <details className="rotation-events rotation-observed">
        <summary>Observed Five-Man Lineups · Q1</summary>
        {[away,home].map(t=><div className="rotation-observed-team" key={t.id}>
          <h4>{t.name}</h4>
          {(t.firstQuarterLineups||[]).length?(t.firstQuarterLineups||[]).map((g,i)=>
            <div className="rotation-observed-row" key={i}>
              <span>{g.ids.map(id=>t.players.find(p=>p.id===id)?.name?.split(' ').slice(-1)[0]||'—').join(' · ')}</span>
              <small>{g.minutes.toFixed(1)} MIN</small>
              <strong>{g.plusMinus>0?'+':''}{g.plusMinus} +/-</strong>
            </div>):<p>No usable first-quarter stints.</p>}
        </div>)}
      </details>}

    {(home.warnings?.length||away.warnings?.length)?<p className="rotation-warning">{[...(home.warnings||[]),...(away.warnings||[])].join(' · ')}</p>:null}
    {!!(home.events?.length||away.events?.length)&&<details className="rotation-events"><summary>Recent substitutions from play-by-play</summary>
      {[...(home.events||[]).map(e=>({...e,team:home.name})),...(away.events||[]).map(e=>({...e,team:away.name}))].slice(0,8)
        .map((e,i)=><p key={i}><b>{e.team}</b> · Q{e.period} {e.clock}: {e.in} for {e.out}</p>)}</details>}
    <div className="rotation-workspace">
      <div className="rotation-heading"><div><span className="intel-kicker">WHAT IF?</span><h2>Scenario Builder</h2></div>
        <button className="rotation-reset" onClick={reset} disabled={!changed}>Reset ↺</button></div>
      <div className="rotation-controls">
        <div className="rotation-control-card">
          <h3><span>01</span> Substitution</h3>
          <div className="rotation-side-switch">{[['away',away],['home',home]].map(([s,t])=><button key={s}
            className={side===s?'active':''} onClick={()=>{setSide(s);setOutId('');setInId('');}}>{t.name}</button>)}</div>
          <div className="rotation-fields"><label>SUB OUT<select value={outId} onChange={e=>setOutId(e.target.value)}>
            <option value="">Choose on-court player</option>{currentPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select></label><label>SUB IN<select value={inId} onChange={e=>setInId(e.target.value)}>
            <option value="">Choose bench player</option>{bench.map(p=><option key={p.id} value={p.id}>{p.name}{p.injury?.status?' · '+p.injury.status:''}</option>)}
          </select></label></div>
          <button className="rotation-apply" disabled={!outId||!inId} onClick={substitute}>Test substitution <span>↗</span></button>
          {!!history.length&&<div className="rotation-history">{history.map((x,i)=><p key={i}>#{i+1} · {x.out} → {x.in}</p>)}</div>}
        </div>
        <div className="rotation-control-card">
          <h3><span>02</span> Defensive Matchup</h3>
          <p className="rotation-usage">Try a defensive matchup.</p>
          <div className="rotation-fields"><label>ATTACKER<select value={attackerId}
            onChange={e=>{setAttackerId(e.target.value);setDefenderId('');}}><option value="">Choose an offensive player</option>
            {all.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label>ASSIGNED DEFENDER<select value={defenderId} disabled={!attacker} onChange={e=>{setDefenderId(e.target.value);if(e.target.value)trackEvent('rotation_defender_selected',{scenario_type:'defensive_matchup'});}}> 
              <option value="">Choose a defender</option>{opposing.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label></div>
          <p className="rotation-usage"></p>
        </div>
      </div>
      <div className="rotation-forecast">
        <div className="rotation-forecast-top"><span className="intel-kicker">EFFECT OF YOUR CHANGES</span><span className="rotation-badge">WHAT-IF ESTIMATE</span></div>
        {evaluation?.available?(changed?<><div className="rotation-stat-grid">
          <div><span>BASELINE HOME</span><strong>{num(evaluation.baselineHome)}%</strong></div>
          <div><span>SIMULATED HOME</span><strong>{num(evaluation.scenarioHome)}%</strong></div>
          <div><span>SCENARIO SHIFT</span><strong>{delta(evaluation.changeHome)}{num(evaluation.changeHome,2)} pp</strong></div>
        </div>
        {evaluation.defensiveMatchup&&<div className="rotation-assignment">
          <b>{evaluation.defensiveMatchup.attacker} vs {evaluation.defensiveMatchup.defender}</b>
          <p>Hypothetical scoring over 10 minutes: {num(evaluation.defensiveMatchup.expectedPoints10)} → {num(evaluation.defensiveMatchup.versusDefender10)} points.</p></div>}
        <p className="rotation-usage">Recent form available for {evaluation.samples.home}/5 home and {evaluation.samples.away}/5 away players.</p>
        </>:<p className="rotation-usage">Make a substitution to compare its impact.</p>)
          :<p className="rotation-usage">{evaluation?.reason||'Not enough usable player data for a lineup estimate.'}</p>}
        <p className="rotation-disclaimer">Hypothetical changes · ESPN data</p>
      </div>
    </div>
      </div>
    </details>
  </section>;
}

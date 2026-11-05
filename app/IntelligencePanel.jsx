'use client';

import {useMemo,useState} from 'react';

const signed = (v,d=1) => v==null?'—':(v>0?'+':'')+Number(v).toFixed(d);
const fmt = v => v==null?'—':Number(v).toFixed(1);
function Evidence({source}) {
  return <div className="evidence-foot"><span>DATA LINEAGE</span><span>{source}</span></div>;
}
function Scouting({items=[]}) {
  return <div className="scout-list">{items.map((item,index)=><div className="scout-item" key={index}><span className="scout-index">{String(index+1).padStart(2,'0')}</span><p>{item.replaceAll('*','')}</p></div>)}</div>;
}
function QuarterLens({title,metrics,games,side}) {
  const [expanded,setExpanded]=useState(false);
  if(!metrics)return <div className="quarter-team"><h3>{title}</h3><p className="intel-muted">Not enough completed games with four-quarter scoring.</p></div>;
  return <div className="quarter-team">
    <div className="quarter-team-header"><div><span className="intel-kicker">{side} · {metrics.sample} GAMES</span><h3>{title}</h3></div><span className="quarter-strong">BEST Q{metrics.bestQuarter}</span></div>
    <div className="quarter-table-wrap"><table className="quarter-insights-table"><thead><tr><th>QUARTER</th><th>PTS FOR</th><th>PTS AGAINST</th><th>NET</th><th>Q WON</th></tr></thead><tbody>{metrics.quarters.map(q=><tr key={q.quarter} className={q.quarter>=3?'late-quarter':''}><th>Q{q.quarter}{q.quarter===metrics.bestQuarter?<small>STRONGEST</small>:null}</th><td>{fmt(q.scored)}</td><td>{fmt(q.allowed)}</td><td className={q.margin>0?'positive':q.margin<0?'negative':''}>{signed(q.margin)}</td><td>{q.winningQuarters}/{metrics.sample}</td></tr>)}</tbody></table></div>
    <div className="quarter-bars">{metrics.quarters.map(q=><div className="quarter-bar-item" key={q.quarter}><span>Q{q.quarter}</span><div className="bar-track"><div className="bar-mark" style={{width:(Math.min(100,Math.max(4,q.scored/39*100)))+'%'}}/></div><b>{fmt(q.scored)}</b></div>)}</div>
    <div className="period-drivers"><div><small>Q3 vs Q2 scoring</small><strong>{signed(metrics.q3Change)} PTS</strong></div><div><small>Q4 vs Q3 scoring</small><strong>{signed(metrics.q4Change)} PTS</strong></div><div><small>Second-half net</small><strong>{signed(metrics.half.secondNet)}</strong></div><div><small>Halftime comebacks</small><strong>{metrics.half.comebacks}/{metrics.half.trailingAtHalf}</strong></div></div>
    <button className="detail-expander" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?'Hide individual game quarters −':'See game-by-game quarter breakdown +'}</button>
    {expanded&&<div className="quarter-table-wrap"><table className="quarter-insights-table game-history"><thead><tr><th>OPPONENT</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>FINAL</th></tr></thead><tbody>{(games||[]).map(g=><tr key={g.id}><th>{g.home?'vs':'@'} {g.opponent}<small>{g.date?.slice(0,10)}</small></th>{[0,1,2,3].map(i=><td key={i}>{g.for[i]}–{g.against[i]}</td>)}<td><b className={g.won?'positive':'negative'}>{g.scored}–{g.allowed}</b></td></tr>)}</tbody></table></div>}
  </div>;
}
function InjuryList({report,title}) {
  const rows=(report?.players || []).filter(p=>['out','doubtful','questionable','probable','daytoday'].includes(p.status.toLowerCase().replace(/[^a-z]/g,'')));
  return <div className="injury-team">
    <div className="injury-head"><h4>{title}</h4><span>{rows.length} ACTIVE FLAGS</span></div>
    {!rows.length?<p className="intel-muted">No active-status injuries returned in the current feed. That does not guarantee a full-strength roster.</p>:rows.map((p,i)=><div className="injury-person" key={p.id||i}>
      <div className="injury-person-main"><b>{p.name}</b><span className={'status-token '+p.status.toLowerCase().replace(/[^a-z]/g,'')}>{p.status}</span></div>
      <p>{p.detail || p.injury || 'No injury details supplied.'}</p>
      <div className="injury-meta"><span>{p.ppg!=null?fmt(p.ppg)+' PPG':'Season PPG unavailable'}</span><span>{p.includedInEstimate?'Model adjustment: −'+fmt(p.estimatedPoints)+' pts':'Not quantified in current estimate'}</span></div>
    </div>)}
    <div className="injury-team-total"><span>EXPECTED AVAILABILITY DEDUCTION</span><strong>−{fmt(report?.totalAdjustment || 0)} pts</strong></div>
  </div>;
}
function PlayerIntelligence({player,stats,loading,error}) {
  const groups=stats?.groups || [];
  const group=groups.find(g=>g.kind==='averages') || groups[0];
  const get=k=>group?.stats?.find(s=>s.label.toUpperCase()===k)?.value;
  const scored=get('PTS'),assists=get('AST'),reb=get('REB'),minutes=get('MIN'),fg=get('FG%'),three=get('3P%'),games=get('GP');
  const analysis=[];
  if(scored)analysis.push('Scoring profile: '+player?.name+' averages '+scored+' points per game'+(minutes?', over '+minutes+' minutes':'')+' in the available regular-season record.');
  if(assists&&reb)analysis.push('All-around production: '+assists+' assists and '+reb+' rebounds per game, offering context for playmaking and possession involvement.');
  if(fg||three)analysis.push('Shooting indicators: '+(fg?fg+' field-goal percentage':'')+(fg&&three?' and ':'')+(three?three+' three-point percentage':'')+'. Compare with league baselines before inferring efficiency.');
  if(games)analysis.push('Sample availability: statistics are reported across '+games+' games. Interpretation should account for minutes, opponents and role changes.');
  return <section className="intel-player">
    <div className="intel-top"><span className="intel-kicker">PICK & ROLL / PLAYER INTELLIGENCE</span><span className="intel-mode">DATA-DERIVED REPORT</span></div>
    <div className="intel-identity"><div><h2>{player?'The numbers on '+player.name+'.':'Player intelligence.'}</h2><p>Automated interpretation of current-season individual statistics, without invented performance claims.</p></div><span className="intel-live">CURRENT SEASON</span></div>
    {loading?<p className="intel-muted">Reading player statistics…</p>:error?<p className="intel-muted">{error}</p>:analysis.length?<><div className="intel-player-highlights">{[['POINTS',scored],['ASSISTS',assists],['REBOUNDS',reb],['MINUTES',minutes]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value||'—'}</strong></div>)}</div><Scouting items={analysis}/></>:<p className="intel-muted">Select a player with available season averages to generate a report.</p>}
    <Evidence source="ESPN player-season statistics · deterministic scouting analysis, not a generative AI model"/>
  </section>;
}
function Model({report,home,away}) {
  const pred=report.prediction;
  const [scenario,setScenario]=useState('weighted');
  const scenarioResult=useMemo(()=>{
    if(!pred)return null;
    if(scenario==='weighted')return {prob:pred.homeWin,homeDeduction:pred.homeInjuryPoints,awayDeduction:pred.awayInjuryPoints};
    if(scenario==='none')return {prob:pred.withoutInjuries,homeDeduction:0,awayDeduction:0};
    const calc=side=>{
      const entries=report.injuryReports?.[side]?.players||[];
      const amount=entries.reduce((total,p)=>{
        const st=p.status.toLowerCase().replace(/[^a-z]/g,'');
        if(!p.includedInEstimate)return total;
        if(!['out','doubtful','questionable','daytoday','probable'].includes(st))return total;
        return total+Math.min(3.5,(p.ppg||0)*.20);
      },0);
      return Math.min(7,amount);
    };
    const h=calc('home'),a=calc('away');
    const margin=pred.projectedMargin+pred.homeInjuryPoints-h-pred.awayInjuryPoints+a;
    return {prob:100/(1+Math.exp(-margin/8.8)),homeDeduction:h,awayDeduction:a};
  },[pred,report.injuryReports,scenario]);
  if(!pred)return <div className="intel-surface"><p className="intel-muted">A win estimate requires completed recent games with quarter-level boxscores for both teams.</p></div>;
  const prob=scenarioResult?.prob??pred.homeWin;
  const favoured=prob>=50?home:away;
  return <div className="intel-surface">
    <div className="model-top"><div><span className="intel-kicker">MATCHUP PROBABILITY / EXPLORATORY</span><h3>Who has the edge?</h3></div><div className="model-grade">{pred.grade}</div></div>
    <div className="prob-heading"><div><span>FAVOURED TO WIN</span><strong>{favoured?.name}</strong></div><b>{Math.max(prob,100-prob).toFixed(1)}<small>%</small></b></div>
    <div className="prob-vs"><span>{home?.abbreviation} {prob.toFixed(1)}%</span><span>{away?.abbreviation} {(100-prob).toFixed(1)}%</span></div>
    <div className="prob-track" role="img" aria-label={home?.name+' '+prob.toFixed(1)+'% estimated win chance; '+away?.name+' '+(100-prob).toFixed(1)+'%'}><div style={{width:prob+'%'}}/></div>
    <div className="model-scenarios"><span>PLAYER AVAILABILITY SCENARIO</span><div className="scenario-tabs">{[['weighted','Reported status'],['none','No injuries'],['allout','All flagged out']].map(([key,label])=><button onClick={()=>setScenario(key)} className={scenario===key?'active':''} key={key} aria-pressed={scenario===key}>{label}</button>)}</div></div>
    <div className="model-diagnostics"><div><small>HOME INJURY ADJUSTMENT</small><strong>−{fmt(scenarioResult?.homeDeduction)} PTS</strong></div><div><small>AWAY INJURY ADJUSTMENT</small><strong>−{fmt(scenarioResult?.awayDeduction)} PTS</strong></div><div><small>MODEL BEFORE INJURIES</small><strong>{fmt(pred.withoutInjuries)}%</strong></div><div><small>HOME COURT ASSUMPTION</small><strong>+{fmt(pred.homeAdvantage)} PTS</strong></div></div>
    <p className="model-warning">This is a pregame-style heuristic, not a calibrated or historically validated betting probability. If a game is live, current score and clock are not included. All-injured-out is a hypothetical scenario, not an injury confirmation.</p>
  </div>;
}
export default function IntelligencePanel({mode,home,away,report,loading,error,onRefresh,player,playerStats,playerLoading,playerError}) {
  const [view,setView]=useState('all');
  if(mode==='players')return <PlayerIntelligence player={player} stats={playerStats} loading={playerLoading} error={playerError}/>;
  const h=report?.teams?.home;
  const a=report?.teams?.away;
  return <section className="intelligence" aria-label="Data-backed basketball intelligence">
    <div className="intel-top"><span className="intel-kicker">PICK & ROLL / SCOUTING INTELLIGENCE</span><span className="intel-mode">FORM + QUARTERS + AVAILABILITY</span></div>
    <div className="intel-identity"><div><h2>{mode==='games'?'The read before the result.':'Predict the matchup.'}</h2><p>{mode==='games'?'Scouting insights update for the selected game below.':'Real scoring tendencies, fourth-quarter strength and injury-aware win estimates.'}</p></div><button onClick={onRefresh} disabled={!home?.id||!away?.id} className="intel-refresh">Refresh analysis ↻</button></div>
    {!home||!away?<div className="intel-surface"><p className="intel-muted">Choose a matchup or game to generate a data-backed analysis.</p></div>:loading&&!report?<div className="intel-loading"><div className="loading-bar"/><p>Analyzing completed games, four-quarter patterns and current injury reports for {home.name} and {away.name}…</p></div>:error&&!report?<div className="intel-surface"><p className="intel-muted">{error}</p><button className="intel-refresh" onClick={onRefresh}>Retry analysis ↻</button></div>:report?<div className="intelligence-grid">
      <Model key={home.id+'-'+away.id} report={report} home={home} away={away}/>
      <div className="intel-surface scouting-surface"><div className="model-top"><div><span className="intel-kicker">AUTOMATED SCOUTING NOTES</span><h3>Key takeaways.</h3></div><span className="scout-count">{report.insights?.length||0} SIGNALS</span></div><Scouting items={report.insights||[]}/><div className="scout-mini">Analysis built from completed games, not generated from fictional results.</div></div>
      <div className="intel-surface quarter-wide"><div className="model-top"><div><span className="intel-kicker">DEEP QUARTER-BY-QUARTER SCOUTING</span><h3>How they adjust, Q1 to Q4.</h3></div><span className="scout-count">ACTUAL SCORES</span></div><div className="lens-pills"><button className={view==='all'?'active':''} onClick={()=>setView('all')}>Both teams</button><button className={view==='home'?'active':''} onClick={()=>setView('home')}>{home.abbreviation}</button><button className={view==='away'?'active':''} onClick={()=>setView('away')}>{away.abbreviation}</button></div><div className={'quarter-compare '+(view!=='all'?'single':'')}>{(view==='all'||view==='home')&&<QuarterLens title={home.name} metrics={h?.metrics} games={h?.games} side="HOME"/>}{(view==='all'||view==='away')&&<QuarterLens title={away.name} metrics={a?.metrics} games={a?.games} side="AWAY"/>}</div><div className="quarter-context"><b>Reading the quarters:</b> Net = points scored minus points allowed in that quarter. Q won = number of games in which the team outscored its opponent in that quarter. The data is descriptive; quarter trends may regress as more games are played.</div></div>
      <div className="intel-surface injury-wide"><div className="model-top"><div><span className="intel-kicker">PLAYER AVAILABILITY / INJURY REPORT</span><h3>Who might change the game?</h3></div><span className="scout-count">UPDATED REPORT</span></div><div className="injury-grid"><InjuryList title={home.name} report={report.injuryReports?.home}/><InjuryList title={away.name} report={report.injuryReports?.away}/></div><p className="model-warning">Injury statuses come from ESPN and may change or be incomplete. An estimated points deduction is based on a player's season PPG and status weights, not an on/off lineup model. Reports older than 72 hours or without PPG do not change the probability.</p></div>
      <div className="intel-provenance"><span>ESPN NBA · {h?.metrics?.sample||0} HOME GAMES / {a?.metrics?.sample||0} AWAY GAMES</span><span>{report.fetchedAt?'ANALYSIS '+new Date(report.fetchedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):''} · LIVE SCORES REFRESH SEPARATELY</span></div>
    </div>:null}
  </section>;
}

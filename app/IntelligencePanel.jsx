'use client';

import {useMemo,useState} from 'react';
import {liveWinEstimate} from '../lib/live-win-model.js';
import {probabilityMatchesScore} from '../lib/espn-live.js';

const signed = (v,d=1) => v==null?'—':(v>0?'+':'')+Number(v).toFixed(d);
const fmt = v => v==null?'—':Number(v).toFixed(1);
function Evidence({source}) {
  return <div className="evidence-foot"><span>SOURCE</span><span>{source}</span></div>;
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
      <div className="injury-meta"><span>{p.ppg!=null?fmt(p.ppg)+' PPG':'Season PPG unavailable'}</span><span>{p.includedInEstimate?'Impact: −'+fmt(p.estimatedPoints)+' pts':'Impact unavailable'}</span></div>
    </div>)}
    <div className="injury-team-total"><span>EST. IMPACT</span><strong>{report?.totalAdjustment==null?'Not quantified':'−'+fmt(report.totalAdjustment)+' pts'}</strong></div>
  </div>;
}
function PlayerIntelligence({player,propsData,loading,error}) {
  const d=propsData?.playerId===player?.id?propsData:null;
  const m=d?.metrics;
  const fixed=v=>v==null?'—':Number(v).toFixed(1);
  const over=v=>v>0?'+'+fixed(v):fixed(v);
  const notes=[];
  if(m?.minutes?.l5!=null&&m?.minutes?.season!=null){
    const trend=m.minutes.l5-m.minutes.season;
    notes.push({label:'MINUTES & OPPORTUNITY',
      text:Math.abs(trend)<1.5?'Playing time is near the season baseline, averaging '+fixed(m.minutes.l5)+' minutes over the last five games.':
      'Recent minutes are '+(trend>0?'up':'down')+' by '+fixed(Math.abs(trend))+' per game versus the season average.'});
  }
  if(m?.shooting?.ts!=null){
    notes.push({label:'SCORING EFFICIENCY',text:'True shooting '+fixed(m.shooting.ts)+'% · '+fixed(m.shooting.fgAttempts)+' field-goal attempts and '+fixed(m.shooting.threeAttempts)+' threes attempted per game over the last ten.'});
  }
  if(m?.assists?.l10!=null&&m?.turnovers?.l10!=null){
    notes.push({label:'CREATION & CONTROL',text:fixed(m.assists.l10)+' assists and '+fixed(m.turnovers.l10)+' turnovers per game across the latest sample.'});
  }
  if(m?.plusMinus){
    notes.push({label:'ON-COURT IMPACT',text:'Recent game plus/minus averages '+over(m.plusMinus.average)+', with positive margins in '+m.plusMinus.positive+' of '+m.plusMinus.sample+' tracked games.'});
  }
  return <section className="intel-player player-scout-notes">
    <div className="intel-top"><span className="intel-kicker">PLAYER INTELLIGENCE</span><span className="intel-mode">SCOUTING NOTES</span></div>
    <div className="intel-identity"><div><h2>Player Report</h2>{player&&<p>{player.name}</p>}</div><span className="intel-live">CURRENT SEASON</span></div>
    {loading&&!d?<p className="intel-muted">Reading recent performances…</p>:
      error&&!d?<p className="intel-muted">{error}</p>:
      notes.length?<div className="player-notes-grid">{notes.map((n,i)=><div key={i} className="player-note-card">
        <span>{n.label}</span><p>{n.text}</p></div>)}</div>:
      <p className="intel-muted">Select a player with current-season game logs to review their scouting report.</p>}
    <Evidence source="ESPN · Current-season game logs"/>
  </section>;
}
function StartingFives({rotation,loading,home,away}) {
  const teams=rotation?.teams;
  const gameStatus=rotation?.game?.status;
  const available=teams?.home?.onCourt?.length===5&&teams?.away?.onCourt?.length===5;
  return <div className="model-lineups">
    <div className="model-lineups-heading"><div><span className="intel-kicker">WHO'S ON THE FLOOR</span><h4>Starting Five & Current Lineups</h4></div>
      <span className="model-lineups-note">{gameStatus==='in'?'LIVE LINEUP':'LATEST STARTERS'}</span></div>
    {available?<div className="model-lineups-grid">
      {[['away',away],['home',home]].map(([side,team])=>{
        const squad=teams[side],liveVerified=gameStatus==='in'&&squad.source==='play-by-play reconstructed';
        const label=liveVerified?'LIVE · PBP':gameStatus==='in'?'UNCONFIRMED':gameStatus==='post'?'GAME FIVE':'RECENT FIVE';
        return <div className="model-lineups-team" key={side}>
          <div className="model-lineups-team-heading"><strong>{team?.abbreviation||squad.name}</strong><span>{label}</span></div>
          <div className="model-lineups-players">{squad.onCourt.map(player=><div className="model-lineups-player" key={player.id}>
            <div className="model-lineups-avatar">{player.headshot?<img src={player.headshot} alt="" loading="lazy"/>:<span>{player.jersey||'•'}</span>}</div>
            <div><b>{player.name}</b><small>{player.position||'—'} · {player.profile?.pts!=null?player.profile.pts.toFixed(1)+' PPG':'Recent form unavailable'}</small></div>
          </div>)}</div>
        </div>;
      })}
    </div>:<p className="intel-muted">{loading?'Checking starters and game substitutions…':'Reliable five-player lineups are not available from the current source.'}</p>}
    <p className="model-lineups-disclaimer">ESPN · Live lineups inferred from substitutions; pregame five from the latest game.</p>
  </div>;
}
function LiveScore({game,fetchedAt}){
  if(!game)return null;
  const inProgress=game.status==='in',finished=game.status==='post';
  const period=Number(game.period)||0;
  const label=finished?'FINAL':inProgress?('Q'+period+' · '+(game.clock||'Clock unavailable')):game.statusName||'Scheduled';
  const elapsed=fetchedAt?Math.round((Date.now()-Date.parse(fetchedAt))/1000):null;
  return <div className="live-score-overview" aria-label="Selected game score and period">
    <div className="live-score-top"><span className="intel-kicker">SELECTED GAME · SCOREBOARD</span><span className={inProgress?'live-score-status active':'live-score-status'}>{inProgress?'● LIVE':finished?'FINAL':'UPCOMING'}</span></div>
    <div className="live-score-layout">
      <div className="live-score-side away">
        {game.away?.logo?<img src={game.away.logo} alt=""/>:null}
        <div><strong>{game.away?.abbreviation||'AWAY'}</strong><span>{game.away?.name||'Away team'}</span></div>
        <b>{game.status==='pre'?'—':game.away?.score??'—'}</b>
      </div>
      <div className="live-score-clock"><strong>{label}</strong><span>{inProgress?'Updating live':finished?'Game complete':'Awaiting tip-off'}</span></div>
      <div className="live-score-side home">
        <b>{game.status==='pre'?'—':game.home?.score??'—'}</b>
        <div><strong>{game.home?.abbreviation||'HOME'}</strong><span>{game.home?.name||'Home team'}</span></div>
        {game.home?.logo?<img src={game.home.logo} alt=""/>:null}
      </div>
    </div>
    {(game.home?.linescores?.length||game.away?.linescores?.length)?<div className="live-quarters">
      <span className="live-quarters-label">POINTS BY PERIOD</span>
      <div className="live-quarters-list">
        {[['away',game.away],['home',game.home]].map(([side,t])=><div className="live-quarters-row" key={side}>
          <b>{t?.abbreviation}</b>{t?.linescores?.map((v,i)=><span key={i}><small>{'Q'+(i+1)}</small><strong>{v??'—'}</strong></span>)}
        </div>)}
      </div>
    </div>:null}
    <div className="live-score-freshness">{'ESPN game data'}
      {fetchedAt?<span> · Feed fetched {new Date(fetchedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>:null}
    </div>
  </div>;
}
function Model({report,home,away,rotation,rotationLoading,game,scoreboardFetchedAt,gameDetail}){
  const pred=report?.prediction;
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
        const weight={out:1,doubtful:.8,questionable:.4,daytoday:.35,probable:.1}[st]||1;
        return total+Math.min(3.5,(p.estimatedPoints||0)/weight);
      },0);
      return Math.min(7,amount);
    };
    const h=calc('home'),a=calc('away');
    const margin=pred.projectedMargin+(pred.homeInjuryPoints??0)-h-(pred.awayInjuryPoints??0)+a;
    return {prob:100/(1+Math.exp(-margin/8.8)),homeDeduction:h,awayDeduction:a};
  },[pred,report?.injuryReports,scenario]);
  const estimate=game?liveWinEstimate(game,pred?.homeWin??null):null;
  const official=gameDetail?.winProbability;
  const sourcedLive=Boolean(probabilityMatchesScore(official,game));
  // If ESPN is temporarily one possession behind the scoreboard, never show its older probability.
  // Keep the score-driven estimate available when ESPN's play-level model stops updating.
  const fallbackLive=game?.status==='in'&&!sourcedLive&&estimate?.kind==='live';
  const isLive=sourcedLive||fallbackLive;
  const isFinal=estimate?.kind==='final';
  const isLiveUnavailable=game?.status==='in'&&!isLive;
  const prob=sourcedLive?official.home:fallbackLive?estimate.homePct:
    isFinal||isLiveUnavailable?null:scenarioResult?.prob??null;
  const hasEstimate=prob!=null&&Number.isFinite(prob);
  const favoured=hasEstimate?(prob>=50?home:away):null;
  return <div className="intel-surface model-surface">
    {game?<LiveScore game={game} fetchedAt={scoreboardFetchedAt}/>:null}
    <div className="model-top"><div><span className="intel-kicker">{isLive?'LIVE GAME STATE':isFinal?'FINAL GAME':game?'BEFORE TIP-OFF':'MATCHUP MODEL'}</span>
      <h3>{isFinal?'Final Result':isLive?'Live Win Probability':'Win Probability'}</h3></div>
      <div className="model-grade">{sourcedLive?'ESPN LIVE':isLive?'LIVE · ESTIMATE':isFinal?'FINAL':pred?'PREGAME · ESTIMATE':'PENDING'}</div>
    </div>
    {isFinal?<div className="live-no-prob">The game is finished. The score above is the result; a live win forecast no longer applies.</div>:
    hasEstimate?<><div className="prob-heading"><div><span>{'FAVOURED TO WIN'}</span>
      <strong>{favoured?.name}</strong></div><b>{Math.max(prob,100-prob).toFixed(1)}<small>%</small></b></div>
      <div className="prob-vs"><span>{home?.abbreviation} {prob.toFixed(1)}%</span><span>{away?.abbreviation} {(100-prob).toFixed(1)}%</span></div>
      <div className="prob-track" role="img" aria-label={home?.name+' '+prob.toFixed(1)+' percent estimated chance; '+away?.name+' '+(100-prob).toFixed(1)+' percent'}><div style={{width:prob+'%'}}/></div>
    </>:<p className="live-no-prob">{isLiveUnavailable?'Updating the in-game probability…':pred?'Game state estimate unavailable.':'Win probability is unavailable until the recent team data can be analysed.'}</p>}
    <StartingFives rotation={rotation} loading={rotationLoading} home={home} away={away}/>
    {pred&&!isLive&&!isFinal&&!isLiveUnavailable?<div className="model-pregame-assumptions">
      <div className="model-scenarios"><span>PLAYER AVAILABILITY SCENARIO</span><div className="scenario-tabs">
        {[['weighted','Reported status'],['none','No injuries'],['allout','All flagged out']].map(([key,label])=><button onClick={()=>setScenario(key)} className={scenario===key?'active':''} key={key} aria-pressed={scenario===key}>{label}</button>)}
      </div></div>
      <div className="model-diagnostics"><div><small>HOME INJURY IMPACT</small><strong>{scenarioResult?.homeDeduction==null?'Unquantified':'−'+fmt(scenarioResult.homeDeduction)+' PTS'}</strong></div>
        <div><small>AWAY INJURY IMPACT</small><strong>{scenarioResult?.awayDeduction==null?'Unquantified':'−'+fmt(scenarioResult.awayDeduction)+' PTS'}</strong></div>
      </div>
    </div>:null}
  </div>;
}
export default function IntelligencePanel({mode,home,away,report,loading,error,onRefresh,rotation,rotationLoading,game,scoreboardFetchedAt,gameBoxscore,gameDetail,player,playerStats,playerLoading,playerError,propsData}) {
  const [view,setView]=useState('all');
  if(mode==='players')return <PlayerIntelligence player={player} propsData={propsData} loading={playerLoading} error={playerError}/>;
  const h=report?.teams?.home;
  const a=report?.teams?.away;
  return <section className="intelligence" aria-label="Data-backed basketball intelligence">
    <div className="intel-top"><span className="intel-kicker">SCOUTING</span><span className="intel-mode">DATA ANALYSIS</span></div>
    <div className="intel-identity"><div><h2>{mode==='games'?'Scouting Report':'Matchup Analysis'}</h2></div><button onClick={onRefresh} disabled={!home?.id||!away?.id} className="intel-refresh">Refresh analysis ↻</button></div>
    {!home||!away?<div className="intel-surface"><p className="intel-muted">Choose a matchup or game to generate a data-backed analysis.</p></div>:
    mode!=='games'&&loading&&!report?<div className="intel-loading"><div className="loading-bar"/><p>Analysing recent games and current injuries for {home.name} and {away.name}…</p></div>:
    mode!=='games'&&error&&!report?<div className="intel-surface"><p className="intel-muted">{error}</p><button className="intel-refresh" onClick={onRefresh}>Retry analysis ↻</button></div>:
    <div className="intelligence-grid">
      <Model key={home.id+'-'+away.id} report={report} home={home} away={away} rotation={rotation} rotationLoading={rotationLoading} game={mode==='games'?game:null} scoreboardFetchedAt={scoreboardFetchedAt} gameDetail={gameDetail}/>
      {mode==='games'&&gameBoxscore}
      {!report&&(loading?<div className="intel-loading"><p>Analysing recent games, quarter patterns and injuries… The live score and game estimate above continue updating.</p></div>:
        error?<div className="intel-surface"><p className="intel-muted">{error}</p><button className="intel-refresh" onClick={onRefresh}>Retry scouting ↻</button></div>:null)}
      {report&&<>
      <div className="intel-surface scouting-surface"><div className="model-top"><div><span className="intel-kicker">SCOUTING NOTES</span><h3>Key Takeaways</h3></div><span className="scout-count">{report.insights?.length||0} SIGNALS</span></div><Scouting items={report.insights||[]}/></div>
      <div className="intel-surface quarter-wide"><div className="model-top"><div><span className="intel-kicker">TEAM TENDENCIES</span><h3>Quarter Analysis</h3></div><span className="scout-count">ACTUAL SCORES</span></div><div className="lens-pills"><button className={view==='all'?'active':''} onClick={()=>setView('all')}>Both teams</button><button className={view==='home'?'active':''} onClick={()=>setView('home')}>{home.abbreviation}</button><button className={view==='away'?'active':''} onClick={()=>setView('away')}>{away.abbreviation}</button></div><div className={'quarter-compare '+(view!=='all'?'single':'')}>{(view==='all'||view==='home')&&<QuarterLens title={home.name} metrics={h?.metrics} games={h?.games} side="HOME"/>}{(view==='all'||view==='away')&&<QuarterLens title={away.name} metrics={a?.metrics} games={a?.games} side="AWAY"/>}</div><div className="quarter-context">Net = scored − allowed · Q won = winning quarters.</div></div>
      <div className="intel-surface injury-wide"><div className="model-top"><div><span className="intel-kicker">AVAILABILITY</span><h3>Injury Report</h3></div><span className="scout-count">UPDATED REPORT</span></div><div className="injury-grid"><InjuryList title={home.name} report={report.injuryReports?.home}/><InjuryList title={away.name} report={report.injuryReports?.away}/></div></div>
      <div className="intel-provenance"><span>SOURCE · ESPN · {h?.metrics?.sample||0} HOME / {a?.metrics?.sample||0} AWAY GAMES</span><span>{report.fetchedAt?'ANALYSIS '+new Date(report.fetchedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):''}</span></div>
      </>}
    </div>}
  </section>;
}

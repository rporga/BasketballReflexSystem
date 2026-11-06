'use client';

import {useEffect,useState} from 'react';
import IntelligencePanel from './IntelligencePanel';
import DimeChat from './DimeChat';
import ThemeToggle from './ThemeToggle';
import BackToTop from './BackToTop';
import RotationLab from './RotationLab';
import PlayerPropHub from './PlayerPropHub';
import FeedStamp from './FeedStamp';

const POLL_LIVE=5000;
const POLL_IDLE=20000;
function dateET() {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return p.year+p.month+p.day;
}
function dateShift(d,step) {
  const x=new Date(d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8)+'T12:00:00Z');
  x.setUTCDate(x.getUTCDate()+step);
  return x.toISOString().slice(0,10).replaceAll('-','');
}
function dateLabel(d) {
  return new Date(d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8)+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
}
function api(view,params={}) {
  return '/api/nba?'+new URLSearchParams({view,...params}).toString();
}
function useRemote(url,interval=0,liveInterval=0) {
  const [state,setState]=useState({data:null,loading:!!url,error:''});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!url) {setState({data:null,loading:false,error:''});return;}
    let mounted=true,controller=null,lastData=null,lastFetched=0;
    async function load() {
      lastFetched=Date.now();
      controller?.abort();
      controller=new AbortController();
      try {
        const response=await fetch(url,{cache:'no-store',signal:controller.signal});
        const body=await response.json();
        if(!response.ok) throw new Error(body.error || 'Request failed');
        if(mounted){lastData=body;setState({data:body,loading:false,error:''});}
      } catch(e) {
        if(e.name!=='AbortError' && mounted) setState(s=>({...s,loading:false,error:e.message}));
      }
    }
    setState({data:null,loading:true,error:''});
    load();
    const timer=interval?setInterval(()=>{
      const active=lastData?.games?.some(g=>g.status==='in');
      const pace=active&&liveInterval?liveInterval:interval;
      if(document.visibilityState==='visible' && Date.now()-lastFetched>=pace)load();
    },1000):null;
    const onFocus=()=>{if(document.visibilityState==='visible' && Date.now()-lastFetched>=5000)load();};
    document.addEventListener('visibilitychange',onFocus);
    window.addEventListener('focus',onFocus);
    return ()=>{mounted=false;controller?.abort();if(timer)clearInterval(timer);document.removeEventListener('visibilitychange',onFocus);window.removeEventListener('focus',onFocus);};
  },[url,interval,liveInterval,revision]);
  return {...state,refresh:()=>setRevision(v=>v+1)};
}
function TabIcon({id}) {
  const shared={fill:'none',stroke:'currentColor',strokeWidth:1.85,strokeLinecap:'round',strokeLinejoin:'round'};
  return <svg className="mobile-tab-icon" viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" focusable="false" {...shared}>
    {id==='games'?<><rect x="3.25" y="4.25" width="17.5" height="15.5" rx="3.25"/><path d="M3.5 9h17"/><path d="M7.4 14.5h2.2l1.5-2.6 2.3 5 1.5-2.4h1.7"/></>:
      id==='teams'?<><path d="M4 17.5 9.3 12l3.8 3.8L20 8.5"/><path d="M14.5 8.5H20V14"/><path d="M4 6.5h6M4 10h3.5"/></>:
      <><circle cx="9" cy="8.25" r="3.25"/><path d="M2.9 19.5v-1.25c0-3 2.5-5.25 6.1-5.25s6.1 2.25 6.1 5.25v1.25H2.9Z"/><path d="M16 5.4a3.25 3.25 0 0 1 0 6.2M17.7 14.1c2 .7 3.4 2.2 3.4 4.2v1.2h-3.5"/></>}
  </svg>;
}
function Logo({team,size=36}) {
  return team?.logo?<img src={team.logo} alt="" className="team-logo" style={{width:size,height:size}}/>:<span className="team-fallback">{team?.abbreviation || 'NBA'}</span>;
}
function Notice({children,error,retry}) {
  return <div className={'notice'+(error?' notice-error':'')}><span>{children}</span>{retry&&<button onClick={retry}>Retry ↻</button>}</div>;
}
function Badge({status,text}) {
  return <span className={'badge '+(status==='in'?'live':status==='post'?'final':'upcoming')}><i/>{status==='in'?'LIVE · ':''}{text || (status==='post'?'Final':'Scheduled')}</span>;
}
function GameCard({game,selected,click}) {
  return <button className={'game-card '+(selected?'selected':'')} onClick={click}>
    <div className="game-card-top"><Badge status={game.status} text={game.statusName}/><span>{game.start?new Date(game.start).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'TBC'}</span></div>
    {[game.away,game.home].map((t,i)=><div className="game-line" key={i}><Logo team={t}/><div><strong>{t?.abbreviation || '—'}</strong><small>{t?.record}</small></div><b>{t?.score ?? '—'}</b></div>)}
    <div className="game-card-foot">{game.venue || 'NBA GAME'}<span>VIEW DETAILS ↗</span></div>
  </button>;
}
function Boxscore({selected,feed,compact=false}) {
  const [side,setSide]=useState('away');
  useEffect(()=>setSide('away'),[selected?.id]);
  if(!selected)return <div className="panel padded"><Notice>Select a game to see the full boxscore.</Notice></div>;
  const team=selected[side];
  const group=feed.data?.players?.find(x=>x.team?.id===team?.id || x.team?.abbreviation===team?.abbreviation);
  const cols=['MIN','PTS','REB','AST','FG','3PT','STL','BLK','+/-'].filter(c=>group?.columns?.includes(c));
  if(!cols.length && group)cols.push(...group.columns.slice(0,8));
  const teamStat=feed.data?.teamStats?.find(x=>x.team?.id===team?.id);
  return <section className={'panel padded boxscore '+(compact?'boxscore-compact':'')}>
    <div className="heading-row"><div><span className="eyebrow">GAME DATA · BOX SCORE</span><h2>{compact?'Live Game Boxscore':selected.away?.name+' at '+selected.home?.name}</h2></div><Badge status={selected.status} text={selected.statusName}/></div>
    {!compact&&<>
      <div className="big-score"><div><Logo team={selected.away} size={56}/><strong>{selected.away?.name}</strong><b>{selected.away?.score ?? '—'}</b></div><span>@</span><div><Logo team={selected.home} size={56}/><strong>{selected.home?.name}</strong><b>{selected.home?.score ?? '—'}</b></div></div>
      <div className="quarter-box"><div className="quarter-row table-head"><span>TEAM</span>{[1,2,3,4].map(q=><span key={q}>Q{q}</span>)}<span>TOTAL</span></div>{[selected.away,selected.home].map((t,i)=><div className="quarter-row" key={i}><b>{t?.abbreviation}</b>{[0,1,2,3].map(q=><span key={q}>{t?.linescores?.[q] ?? '—'}</span>)}<b>{t?.score ?? '—'}</b></div>)}</div>
      <div className="separator"/>
    </>}
    <div className="heading-row"><h3>Live player boxscore</h3><div className="segmented">{['away','home'].map(s=><button key={s} className={side===s?'active':''} onClick={()=>setSide(s)}>{selected[s]?.abbreviation}</button>)}</div></div>
    {feed.loading && <Notice>Loading player statistics…</Notice>}
    {feed.error && <Notice error retry={feed.refresh}>Couldn't load the player boxscore: {feed.error}</Notice>}
    {!feed.loading && !feed.error && !group?.rows?.length && <Notice>Player boxscore data isn't available yet. It usually appears around tip-off.</Notice>}
    {!!group?.rows?.length && <div className="table-scroll"><table className="box-table"><thead><tr><th>PLAYER</th>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{group.rows.map((r,i)=><tr key={r.id||i}><td><strong>{r.name}</strong><small>{r.position}{r.jersey?' · #'+r.jersey:''}{r.didNotPlay?' · DNP':''}</small></td>{cols.map(c=><td key={c}>{r.stats[c] ?? '—'}</td>)}</tr>)}</tbody></table></div>}
    {!!teamStat?.stats?.length && <><div className="separator"/><h3>Team game statistics · {team?.abbreviation}</h3><div className="stat-grid">{teamStat.stats.slice(0,12).map((s,i)=><div key={i}><span>{s.label}</span><b>{s.value}</b></div>)}</div></>}
    <p className="smallprint">ESPN · <FeedStamp at={feed.data?.fetchedAt} kind={selected.status==='in'?'live':'score'}/></p>
  </section>;
}
function Games({date,setDate,score,gameId,setGameId,detail}) {
  const games=score.data?.games || [];
  useEffect(()=>{
    setGameId(prev=>games.some(g=>g.id===prev)?prev:(games.find(g=>g.status==='in') || games[0])?.id || '');
  },[score.data?.fetchedAt,date]);
  const chosen=games.find(g=>g.id===gameId);
  const live=games.filter(g=>g.status==='in').length;
  return <><div className="module-line"><div><span>LIVE GAME CENTER</span><h2>NBA Games</h2></div><button className="module-refresh" onClick={score.refresh}>Refresh scores ↻</button></div>
    <div className="date-nav"><button onClick={()=>setDate(d=>dateShift(d,-1))} aria-label="Previous date">←</button><div><small>NBA DATE · US EASTERN</small><strong>{dateLabel(date)}</strong></div><button onClick={()=>setDate(d=>dateShift(d,1))} aria-label="Next date">→</button><button onClick={()=>setDate(dateET())}>Today</button><span>{score.data ? (live ? live+' LIVE · ' : '') + games.length + ' games' : 'Waiting for feed'}</span></div>
    {score.loading && <Notice>Fetching the real NBA scoreboard…</Notice>}
    {score.error && <Notice error retry={score.refresh}>Unable to fetch games: {score.error}</Notice>}
    {!score.loading && !score.error && !games.length && <Notice>No NBA games were returned for this date. Choose another day.</Notice>}
    {!!games.length && <div className="games-grid">{games.map(g=><GameCard key={g.id} game={g} selected={g.id===gameId} click={()=>setGameId(g.id)}/>)}</div>}
  </>;
}
function Form({data,loading,error,retry}) {
  if(loading)return <Notice>Loading recent completed games…</Notice>;
  if(error)return <Notice error retry={retry}>{error}</Notice>;
  if(!data?.results?.length)return <Notice>Recent regular-season results haven't been returned by this source.</Notice>;
  return <><div className="mini-kpis"><div><small>LAST 5 RECORD</small><strong>{data.last5?data.last5.wins+'–'+(data.last5.games-data.last5.wins):'—'}</strong></div><div><small>PTS / GAME</small><strong>{data.last5?.ppg ?? '—'}</strong></div><div><small>OPP PPG</small><strong>{data.last5?.oppg ?? '—'}</strong></div></div>
    <div className="results">{data.results.map((r,i)=><div key={i}><span className={r.won?'win':'loss'}>{r.won?'W':'L'}</span><span>{r.home?'vs ':'@ '}{r.opponent}</span><b>{r.scored}–{r.allowed}</b><small>{r.date?new Date(r.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''}</small></div>)}</div></>;
}
function Matchup({teams,home,setHome,away,setAway,first,second}) {
  const a=teams.find(x=>x.id===home),b=teams.find(x=>x.id===away);
  const edgeA=first.data?.last5 ? +(first.data.last5.ppg-first.data.last5.oppg).toFixed(1) : null;
  const edgeB=second.data?.last5 ? +(second.data.last5.ppg-second.data.last5.oppg).toFixed(1) : null;
  return <><div className="module-line"><div><span>TEAM FORM</span><h2>Recent Form</h2></div><small className="muted">Verified completed regular-season games</small></div>

    <div className="compare-grid">{[[a,first,'HOME'],[b,second,'AWAY']].map(([team,feed,side])=><div className="panel padded" key={side}><div className="team-heading"><Logo team={team} size={48}/><div><span className="eyebrow">{side}</span><h2>{team?.name || 'Choose team'}</h2></div></div><Form data={feed.data} loading={feed.loading} error={feed.error} retry={feed.refresh}/></div>)}</div>
    <div className="panel padded"><span className="eyebrow">RECENT FORM</span><h2>Last 5: Point Differential</h2><div className="diff-grid">{[[a,edgeA],[b,edgeB]].map(([t,v],i)=><div key={i}><span>{t?.abbreviation || '—'}</span><strong>{v==null?'—':(v>0?'+':'')+v.toFixed(1)}</strong></div>)}</div><p className="explainer">Last five games · ESPN</p></div>
  </>;
}
function PlayerView({teams,teamId,setTeamId,roster,playerId,setPlayerId,propsFeed}) {
  const selectedTeam=teams.find(t=>t.id===teamId);
  const players=roster.data?.players||[];
  useEffect(()=>{setPlayerId(old=>players.some(p=>p.id===old)?old:(players[0]?.id||''));},[roster.data?.fetchedAt,teamId]);
  const selected=players.find(p=>p.id===playerId);
  const d=propsFeed?.data?.playerId===playerId?propsFeed.data:null,m=d?.metrics;
  const asNumber=n=>n==null?'—':Number(n).toFixed(1);
  const featured=m?[['PTS',m.points?.season],['REB',m.rebounds?.season],['AST',m.assists?.season],
    ['MIN',m.minutes?.season],['3PM',m.threes?.season],['TS%',m.efficiency?.ts]]:[];
  const extra=m?[['GAMES',m.sample],['FG ATT',m.shotAttempts?.season],['3PT ATT',m.threeAttempts?.season],
    ['STL',m.steals?.season],['BLK',m.blocks?.season],['TO',m.turnovers?.season],
    ['RECENT +/−',m.plusMinus?.average]]:[];
  return <>
    <div className="module-line"><div><span>PLAYER EXPLORER</span><h2>Player Statistics</h2></div></div>
    <div className="players-layout">
      <section className="panel padded"><h2>Select a team</h2>
        <label className="input-label">NBA TEAM<select value={teamId} onChange={e=>setTeamId(e.target.value)}>
          <option value="">Select</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select></label>
        <div className="team-heading"><Logo team={selectedTeam} size={42}/><div><h3>{selectedTeam?.name||'NBA'}</h3><small>{players.length} roster players</small></div></div>
        <label className="player-mobile-picker">CHOOSE PLAYER
          <select value={playerId} onChange={e=>setPlayerId(e.target.value)}>
            {players.length===0&&<option value="">Choose a player</option>}
            {players.map(p=><option key={p.id} value={p.id}>{p.name} · {p.position}</option>)}
          </select>
        </label>
        {roster.loading&&<Notice>Loading team roster…</Notice>}
        {roster.error&&<Notice error retry={roster.refresh}>{roster.error}</Notice>}
        <div className="roster-list">{players.map(p=><button key={p.id} type="button"
          className={p.id===playerId?'active':''} aria-pressed={p.id===playerId} onClick={()=>setPlayerId(p.id)}>
          <span className="headshot">{p.headshot?<img src={p.headshot} width="42" height="42" alt=""/>:p.jersey||'•'}</span>
          <span><strong>{p.name}</strong><small>{p.position}{p.jersey?' · #'+p.jersey:''}</small></span><b aria-hidden="true">›</b>
        </button>)}</div>
      </section>
      <section className="panel padded">
        <div className="heading-row"><h2>Player Profile</h2><span className="muted">Current Season</span></div>
        {selected?<div className="profile">{selected.headshot?<img src={selected.headshot} width="84" height="84" alt=""/>:<span className="headshot">#{selected.jersey}</span>}
          <div><span className="eyebrow">{selectedTeam?.abbreviation} · {selected.position}</span><h2>{selected.name}</h2>
            <small>{[selected.height,selected.age?selected.age+' years':''].filter(Boolean).join(' · ')}</small></div></div>:<Notice>Select a team and player.</Notice>}
        {propsFeed?.loading&&!d&&<Notice>Loading this season's game logs…</Notice>}
        {propsFeed?.error&&!d&&<Notice error retry={propsFeed.refresh}>{propsFeed.error}</Notice>}
        {d&&m?.sample===0&&<Notice>No current-season game logs yet.</Notice>}
        {featured.length>0&&<><div className="heading-row"><h3>{d?.season?String(d.season-1)+'–'+String(d.season).slice(-2):'Current'} Season</h3><small className="muted">{m.sample} games</small></div>
          <div className="player-highlights">{featured.map(([label,v])=><div key={label}><small>{label}</small><strong>{asNumber(v)}</strong></div>)}</div>
          <div className="stats-list">{extra.map(([label,v])=><div key={label}><span>{label}</span><b>{asNumber(v)}</b></div>)}</div></>}
        <p className="smallprint">ESPN · Regular-season game logs · <FeedStamp at={d?.fetchedAt} kind="player"/></p>
      </section>
    </div>
    {selected&&<PlayerPropHub player={selected} team={selectedTeam} feed={propsFeed}/>}
  </>;
}
export default function Home() {
  const [tab,setTab]=useState('games');
  const [date,setDate]=useState(dateET);
  const [gameId,setGameId]=useState('');
  const [home,setHome]=useState('');
  const [away,setAway]=useState('');
  const [teamId,setTeamId]=useState('');
  const [playerId,setPlayerId]=useState('');
  const teamsFeed=useRemote(api('teams'),300000);
  const teams=teamsFeed.data?.teams || [];
  useEffect(()=>{if(!teams.length)return;const a=teams.find(x=>x.abbreviation==='BOS')?.id || teams[0].id;const b=teams.find(x=>x.abbreviation==='LAL')?.id || teams.find(x=>x.id!==a)?.id;setHome(x=>x||a);setAway(x=>x||b);setTeamId(x=>x||a);},[teamsFeed.data?.fetchedAt]);
  const scores=useRemote(api('scoreboard',{date}),POLL_IDLE,POLL_LIVE);
  const selectedLiveGame=scores.data?.games?.find(x=>x.id===gameId);
  const detail=useRemote(tab==='games' && gameId?api('game',{id:gameId}):null,selectedLiveGame?.status==='in'?POLL_LIVE:POLL_IDLE);
  const formA=useRemote(tab==='teams' && home?api('form',{team:home}):null,300000);
  const formB=useRemote(tab==='teams' && away?api('form',{team:away}):null,300000);
  const roster=useRemote(tab==='players' && teamId?api('roster',{team:teamId}):null,300000);
  const propsFeed=useRemote(tab==='players'&&playerId?'/api/props?'+new URLSearchParams({player:playerId}):null,180000);
  const selectedGame=scores.data?.games?.find(x=>x.id===gameId);
  const intelHome=tab==='games'?selectedGame?.home:teams.find(x=>x.id===home);
  const intelAway=tab==='games'?selectedGame?.away:teams.find(x=>x.id===away);
  const reportUrl=tab!=='players'&&intelHome?.id&&intelAway?.id?'/api/intelligence?'+new URLSearchParams({home:intelHome.id,away:intelAway.id}):null;
  const intelligence=useRemote(reportUrl,180000);
  const rotationUrl=tab!=='players'&&intelHome?.id&&intelAway?.id?'/api/rotations?'+new URLSearchParams({home:intelHome.id,away:intelAway.id,...(tab==='games'&&gameId?{game:gameId}:{})}):null;
  const rotation=useRemote(rotationUrl,tab==='games'&&selectedLiveGame?.status==='in'?12000:180000);
  const selectedPlayer=roster.data?.players?.find(p=>p.id===playerId);
  const live=scores.data?.games?.filter(x=>x.status==='in').length || 0;
  const pages=[{id:'games',symbol:'◉',label:'Live Games'},{id:'teams',symbol:'▥',label:'Matchup Lab'},{id:'players',symbol:'♧',label:'Player Explorer'}];
  return <div className="site-shell">
    <header className="site-header">
      <div className="site-header-inner">
        <a href="/" className="wordmark" aria-label="Pick and Roll, go to live games" onClick={e=>{e.preventDefault();setTab('games')}}><img src="/pick-roll-logo.webp" alt="Pick & Roll" width="320" height="127" /></a>
        <nav className="topnav" aria-label="Main navigation">{pages.map(p=><button key={p.id} className={'nav-item '+(tab===p.id?'active':'')} onClick={()=>setTab(p.id)} aria-current={tab===p.id?'page':undefined}>{p.label}</button>)}</nav>
        <div className="header-actions"><ThemeToggle/>{live?<span className="live-pulse">{live} LIVE NOW</span>:null}</div>
      </div>
    </header>
    <main className="main-stage"><div className="content">
      <div className="workspace-meta"><span>PICK & ROLL <b>/</b> INTELLIGENCE</span><span>{pages.find(x=>x.id===tab)?.label.toUpperCase()}</span></div>
      {tab==='games'&&<div className="brand-intro" aria-label="About Pick and Roll">
        <div><h1>Pick &amp; Roll</h1><p className="brand-intro-tagline">Understand the game. Anticipate what happens next.</p></div>
        <p className="brand-intro-description">Live NBA intelligence that connects player performance, matchups, rotations and statistical projections in one place.</p>
      </div>}
      {tab==='teams'&&<div className="matchup-selector"><div className="module-line"><div><span>BUILD YOUR MATCHUP</span><h2>Select Teams</h2></div></div>    <section className="panel padded"><div className="heading-row"><h2>Matchup</h2><small className="muted">Most recent 10 completed regular-season games</small></div><div className="team-pickers"><label>HOME TEAM<select value={home} onChange={e=>{setHome(e.target.value);if(e.target.value===away)setAway(home);}}><option value="">Select</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><span>VS</span><label>AWAY TEAM<select value={away} onChange={e=>{setAway(e.target.value);if(e.target.value===home)setHome(away);}}><option value="">Select</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div></section></div>}
      {tab==='games'&&<Games date={date} setDate={setDate} score={scores} gameId={gameId} setGameId={setGameId}/>}
      {tab!=='players'&&<IntelligencePanel mode={tab} home={intelHome} away={intelAway} report={intelligence.data} loading={intelligence.loading} error={intelligence.error}
        onRefresh={intelligence.refresh} rotation={rotation.data} rotationLoading={rotation.loading}
        game={tab==='games'?selectedGame:null} gameDetail={tab==='games'?detail.data:null} scoreboardFetchedAt={scores.data?.fetchedAt}
        gameBoxscore={tab==='games'?<Boxscore selected={selectedGame} feed={detail} compact/>:null}/>}
      {tab==='teams'&&<>{teamsFeed.error&&<Notice error retry={teamsFeed.refresh}>{teamsFeed.error}</Notice>}
        <Matchup teams={teams} home={home} setHome={setHome} away={away} setAway={setAway} first={formA} second={formB}/></>}
      {tab!=='players'&&<RotationLab key={rotationUrl||'rotation'} mode={tab} data={rotation.data} loading={rotation.loading}
        error={rotation.error} onRefresh={rotation.refresh} prior={intelligence.data?.prediction?.homeWin??null}
        liveGame={tab==='games'?selectedGame:null} liveWin={tab==='games'?detail.data?.winProbability:null}/>}
      {tab==='players'&&<>
        {teamsFeed.error&&<Notice error retry={teamsFeed.refresh}>{teamsFeed.error}</Notice>}
        <PlayerView teams={teams} teamId={teamId} setTeamId={setTeamId} roster={roster} playerId={playerId} setPlayerId={setPlayerId} propsFeed={propsFeed}/>
      </>}
      <footer className="site-footer"><span>PICK & ROLL <b>© 2026</b></span><span>Independent NBA analytics · ESPN <a href="/about">About &amp; model accuracy</a></span></footer>
    </div></main>
    <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
      {pages.map(p=><button type="button" key={p.id} className={'mobile-tab '+(tab===p.id?'active':'')}
        aria-current={tab===p.id?'page':undefined}
        onClick={()=>{setTab(p.id);window.scrollTo({top:0,behavior:'instant'});}}>
        <span className="mobile-tab-symbol"><TabIcon id={p.id}/></span>
        <span className="mobile-tab-label">{p.id==='games'?'Games':p.id==='teams'?'Matchups':'Players'}</span>
      </button>)}
    </nav>
    <BackToTop/>
    <DimeChat context={{tab,gameId:tab==='games'?selectedGame?.id||'':'',homeId:intelHome?.id||'',awayId:intelAway?.id||'',teamId:teamId||'',playerId:tab==='players'?playerId||'':''}}/>
  </div>;
}

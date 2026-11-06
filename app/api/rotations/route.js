import {NextResponse} from 'next/server';
import {playerProfile,evaluateRotation} from '../../../lib/rotation-analytics.js';
import {combineLineupStints} from '../../../lib/lineup-stints.js';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const valid=x=>/^\d{1,12}$/.test(String(x||''));
const val=x=>typeof x==='string'?x:'';
const id=x=>String(x??'');
const num=x=>{const n=Number.parseFloat(String(x??''));return Number.isFinite(n)?n:0};
const time=x=>new Date(x).getTime();
const unique=arr=>[...new Set(arr.filter(Boolean))];
const injuryId=a=>id(a?.id||a?.uid?.match(/~a:(\d+)/)?.[1]||a?.links?.[0]?.href?.match(/\/id\/(\d+)/)?.[1]||'');
async function get(url,ttl=300){
  const r=await fetch(url,{headers:{Accept:'application/json'},next:{revalidate:ttl},signal:AbortSignal.timeout(13000)});
  if(!r.ok)throw Error('ESPN unavailable '+r.status);
  return r.json();
}
const summary=(g,ttl=600)=>get(ROOT+'/summary?event='+g,ttl);
const getRoster=(t)=>get(ROOT+'/teams/'+t+'/roster',1800);
async function recentSummaries(t){
  const schedule=await get(ROOT+'/teams/'+t+'/schedule?seasontype=2',300);
  const events=(schedule.events||[]).filter(e=>e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed)
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
  const res=await Promise.allSettled(events.map(e=>summary(id(e.id),900)));
  return res.filter(x=>x.status==='fulfilled').map(x=>x.value);
}
function rosterEntries(r){
  return (r?.athletes||r?.team?.athletes||[]).flatMap(p=>p.items||p.athletes||[p]).map(p=>({
    id:id(p.id),name:val(p.displayName||p.fullName),position:val(p.position?.abbreviation),
    jersey:val(p.jersey),headshot:p.headshot?.href||null
  })).filter(p=>valid(p.id)&&p.name);
}
function participants(report,t){
  const group=(report?.boxscore?.players||[]).find(b=>id(b.team?.id)===t);
  const b=group?.statistics?.[0]||{},headers=b.labels||[];
  return (b.athletes||[]).map(x=>{
    const a=x.athlete||{},row=Object.fromEntries(headers.map((k,i)=>[k,x.stats?.[i]]));
    return {id:id(a.id),name:val(a.displayName||a.fullName),position:val(a.position?.abbreviation),
      headshot:a.headshot?.href||null,jersey:val(a.jersey),starter:x.starter===true,active:x.active===true,
      didNotPlay:!!x.didNotPlay,
      minutes:num(row.MIN),row:{
        min:num(row.MIN),pts:num(row.PTS),reb:num(row.REB),ast:num(row.AST),
        stl:num(row.STL),blk:num(row.BLK),to:num(row.TO),pf:num(row.PF)
      }};
  }).filter(p=>valid(p.id)&&p.name);
}
function startersFrom(report,t){
  const players=participants(report,t);
  return players.filter(p=>p.starter&&!p.didNotPlay).slice(0,5).map(p=>p.id);
}
function reconstruct(report,teamId){
  const members=participants(report,teamId);
  const starters=members.filter(p=>p.starter&&!p.didNotPlay).map(p=>p.id);
  if(starters.length!==5)return {ids:[],type:'unavailable',lastEvents:[],warnings:['Starting five not confirmed in game boxscore']};
  let active=[...starters],errors=0;
  const transitions=[];
  const plays=Array.isArray(report?.plays)?report.plays:[];
  const rosterMap=new Map(members.map(p=>[p.id,p]));
  const sorted=[...plays].sort((a,b)=>Number(a.sequenceNumber||0)-Number(b.sequenceNumber||0));
  for(const play of sorted){
    if(!/substitution/i.test(play.type?.text||''))continue;
    if(id(play.team?.id)!==teamId)continue;
    const enter=id(play.participants?.[0]?.athlete?.id);
    const leave=id(play.participants?.[1]?.athlete?.id);
    if(!valid(enter)||!valid(leave)||!active.includes(leave)||active.includes(enter)){errors++;continue;}
    active=active.map(p=>p===leave?enter:p);
    transitions.push({in:rosterMap.get(enter)?.name||enter,out:rosterMap.get(leave)?.name||leave,
      period:Number(play.period?.number)||null,clock:val(play.clock?.displayValue)});
  }
  const rawActive=members.filter(p=>p.active&&!p.didNotPlay).map(p=>p.id);
  const fromActive=rawActive.length===5&&rawActive.every(p=>rosterMap.has(p));
  const periods=new Set(sorted.map(p=>Number(p.period?.number)).filter(Number.isFinite));
  const periodBoundary=periods.size>1||[...periods].some(p=>p>1);
  const consistent=active.length===5&&unique(active).length===5&&errors===0&&transitions.length>0;
  // Quarter breaks are a hard evidence boundary: a new five can begin without a substitution event.
  // 'active' is not a verified on-floor flag; it must never be described as a confirmed live five.
  const confidence=consistent&&!periodBoundary?'moderate':'low';
  const source=consistent?'play-by-play estimate':fromActive?'boxscore active estimate':'unverified starter fallback';
  const ids=consistent?active:fromActive?rawActive:starters;
  return {ids,type:source,confidence,lastEvents:transitions.slice(-8).reverse(),warnings:[
    ...(periodBoundary?['On-court five may change at quarter breaks without recorded substitution events']:[]),
    ...(errors?[errors+' substitution events did not reconcile with tracked lineup']:[]),
    ...(source!=='play-by-play estimate'?['Live five could not be reconstructed from complete substitution history']:[])
  ]};
}
function teamBox(teamId,roster,latest,liveReport,injuries){
  const rosterList=rosterEntries(roster);
  const playedById=new Map();
  for(const report of latest){
    for(const p of participants(report,teamId)){
      if(!p.didNotPlay&&p.minutes>0){
        if(!playedById.has(p.id))playedById.set(p.id,[]);
        playedById.get(p.id).push(p.row);
      }
    }
  }
  const fromGame=liveReport?participants(liveReport,teamId):[];
  const map=new Map(rosterList.map(p=>[p.id,{...p}]));
  for(const p of fromGame)if(!map.has(p.id))map.set(p.id,p);
  const reported=(injuries?.injuries||[]).find(x=>id(x.id)===teamId);
  const injuriesById=new Map((reported?.injuries||[]).map(j=>[injuryId(j.athlete),{status:val(j.status),updatedAt:j.date||null}]));
  const players=[...map.values()].map(p=>{
    const played=playedById.get(p.id)||[];
    const reported=injuriesById.get(p.id);
    const game=fromGame.find(x=>x.id===p.id);
    return {...p,profile:playerProfile(played),gameMinutes:game?.minutes??null,
      gamePoints:game?.row?.pts??null,starter:game?.starter||false,
      injury:reported||null};
  }).sort((a,b)=>(b.profile.minutes||0)-(a.profile.minutes||0));
  let source='latest completed game starters',warnings=[],events=[],confidence='low';
  let onIds=latest.map(r=>startersFrom(r,teamId)).find(g=>g.length===5)||[];
  if(liveReport){
    const status=liveReport.header?.competitions?.[0]?.status?.type?.state;
    if(status==='post'){
      const starters=startersFrom(liveReport,teamId);
      if(starters.length===5){onIds=starters;source='confirmed game starters';confidence='high';}
    }else if(status==='in'){
      const rec=reconstruct(liveReport,teamId);
      if(rec.ids.length===5){
        onIds=rec.ids;source=rec.type;events=rec.lastEvents;warnings=rec.warnings;confidence=rec.confidence;
      }
    }
  }
  if(onIds.length!==5) {
    onIds=players.filter(p=>p.profile.minutes>0).slice(0,5).map(p=>p.id);
    source='estimated from recent minutes';confidence='low';
  }
  const onCourt=onIds.map(athleteId=>players.find(p=>p.id===athleteId)).filter(Boolean);
  const onSet=new Set(onCourt.map(p=>p.id));
  return {id:teamId,name:val(roster?.team?.displayName),onCourt,bench:players.filter(p=>!onSet.has(p.id)),
    players,source,confidence,events,warnings,firstQuarterLineups:combineLineupStints(latest,teamId),gameSample:latest.length,
    latestStarters:latest.map(r=>startersFrom(r,teamId)).find(g=>g.length===5)||[]};
}
async function collect(home,away,gameId){
  const [rh,ra,sh,sa,active,inj]=await Promise.allSettled([
    getRoster(home),getRoster(away),recentSummaries(home),recentSummaries(away),
    gameId?summary(gameId,5):Promise.resolve(null),get(ROOT+'/injuries',120)
  ]);
  if(rh.status!=='fulfilled'||ra.status!=='fulfilled')throw Error('Roster source unavailable');
  const source=active.status==='fulfilled'?active.value:null;
  const reportInj=inj.status==='fulfilled'?inj.value:null;
  const H=teamBox(home,rh.value,sh.status==='fulfilled'?sh.value:[],source,reportInj);
  const A=teamBox(away,ra.value,sa.status==='fulfilled'?sa.value:[],source,reportInj);
  const comp=source?.header?.competitions?.[0]||{};
  const status=comp.status?.type?.state||'pre';
  const homeComp=comp.competitors?.find(x=>id(x.team?.id)===home);
  const awayComp=comp.competitors?.find(x=>id(x.team?.id)===away);
  const scoreValue=c=>{
    const v=c?.score?.value??c?.score?.displayValue??c?.score;
    return v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
  };
  const game=gameId?{id:gameId,status,period:Number(comp.status?.period)||0,clock:val(comp.status?.displayClock),
    homeScore:scoreValue(homeComp),awayScore:scoreValue(awayComp)}:null;
  return {teams:{home:H,away:A},game,fetchedAt:new Date().toISOString(),
    dataQuality:{roster:true,recentGames:{home:H.gameSample,away:A.gameSample},
      gameSummary:!!source,
      injuryReport:!!reportInj,
      source:'ESPN public unofficial NBA rosters, play-by-play and recent game boxscores'},
    methodology:'Starting fives come from the selected game boxscore or last completed game, not a verified future lineup. Live on-court combinations are estimates inferred from substitutions; quarter breaks can invalidate their continuity. Full roster includes DNP/unknown-availability players. Player production is an average of up to five recent completed regular-season game boxscores.'};
}
const fail=(message,status)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request){
  const q=new URL(request.url).searchParams;
  const home=q.get('home')||'',away=q.get('away')||'',gameId=q.get('game')||'';
  if(!valid(home)||!valid(away)||home===away||home.length>5||away.length>5)
    return fail('Choose two different valid NBA teams',400);
  if(gameId&&(!valid(gameId)||gameId.length<8))return fail('Invalid game ID',400);
  try{
    const data=await collect(home,away,gameId);
    const incoming=q.get('in')||'',outgoing=q.get('out')||'';
    const side=q.get('side')||'';
    const attacker=q.get('attacker')||'',defender=q.get('defender')||'';
    const prior=Number(q.get('prior'));
    if(incoming||outgoing||attacker||defender){
      let h=data.teams.home.onCourt.map(p=>p.id),a=data.teams.away.onCourt.map(p=>p.id);
      if(incoming||outgoing){
        if(!valid(incoming)||!valid(outgoing)||!['home','away'].includes(side))return fail('Invalid substitution',400);
        const t=data.teams[side];
        if(!t.onCourt.some(x=>x.id===outgoing)||!t.bench.some(x=>x.id===incoming))
          return fail('Substitution must exchange an on-court player and a bench player',400);
        if(side==='home')h=h.map(x=>x===outgoing?incoming:x);
        else a=a.map(x=>x===outgoing?incoming:x);
      }
      if(attacker&&!valid(attacker)||defender&&!valid(defender))return fail('Invalid player ID',400);
      const calc=evaluateRotation(data,{homeIds:h,awayIds:a,
        attackerId:attacker,defenderId:defender,
        priorHomeWin:Number.isFinite(prior)&&prior>=1&&prior<=99?prior:null});
      return NextResponse.json({scenario:calc,context:{game:data.game,home:data.teams.home.name,away:data.teams.away.name},
        fetchedAt:data.fetchedAt,methodology:data.methodology},{headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.json(data,{headers:{'Cache-Control':gameId?'public, s-maxage=8, stale-while-revalidate=6':'public, s-maxage=120, stale-while-revalidate=30'}});
  }catch(e){
    console.error('NBA rotation source error',String(e?.message||e).slice(0,160));
    return fail('Live roster and rotation data are unavailable; no synthetic players are substituted.',502);
  }
}

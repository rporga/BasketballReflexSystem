import {NextResponse} from 'next/server';
import {parseGamelog,aggregate,shooting,forecast} from '../../../lib/prop-analytics.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const WEB='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
const SITE='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const validId=x=>/^\d{1,12}$/.test(String(x||''));
const validYear=x=>Number.isInteger(Number(x))&&Number(x)>=2020&&Number(x)<=2035;
const parseNumeric=x=>x!=null&&String(x).trim()!==''&&Number.isFinite(Number(x))?Number(x):null;
const activeYear=()=>{
 const now=new Date();return now.getUTCFullYear()+(now.getUTCMonth()>=6?1:0);
};
async function fetchESPN(url,revalidate=600,ms=9500){
 const response=await fetch(url,{headers:{Accept:'application/json'},next:{revalidate},signal:AbortSignal.timeout(ms)});
 if(!response.ok)throw Error('ESPN '+response.status);
 return response.json();
}
async function gamePlusMinus(eventId,athleteId){
 try{
  const d=await fetchESPN(SITE+'/summary?event='+eventId,3600,7500);
  for(const group of d.boxscore?.players||[])for(const block of group.statistics||[]){
   const at=block.labels?.findIndex(x=>x==='+/-'||x==='PLUSMINUS');
   if(at==null||at<0)continue;
   const row=block.athletes?.find(a=>String(a.athlete?.id)===String(athleteId));
   if(row&&row.stats?.[at]!=null)return parseNumeric(row.stats[at]);
  }
 }catch{}
 return null;
}
async function nextScheduled(teamId){
 if(!validId(teamId))return null;
 try{
  const data=await fetchESPN(SITE+'/teams/'+teamId+'/schedule?seasontype=2',600,8500);
  const now=Date.now();
  const games=(data.events||[]).filter(e=>{
    const dt=Date.parse(e.date);return Number.isFinite(dt)&&dt>=now-4*60*60*1000&&!(e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed);
  }).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  const e=games[0];if(!e)return null;
  const participants=e.competitions?.[0]?.competitors||[];
  const me=participants.find(x=>String(x.team?.id)===String(teamId));
  const opponent=participants.find(x=>String(x.team?.id)!==String(teamId));
  return {id:String(e.id||''),date:e.date,home:me?.homeAway==='home',
    opponentId:String(opponent?.team?.id||''),opponent:opponent?.team?.displayName||opponent?.team?.name||'',
    abbreviation:opponent?.team?.abbreviation||'',status:e.status?.type?.state||'pre'};
 }catch{return null;}
}
async function opponentOutlook(teamId){
 if(!validId(teamId))return null;
 try{
  const data=await fetchESPN(SITE+'/teams/'+teamId+'/schedule?seasontype=2',600,8500);
  const games=(data.events||[]).filter(e=>e.status?.type?.completed||e.competitions?.[0]?.status?.type?.completed)
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
  const scores=games.map(e=>{
   const sides=e.competitions?.[0]?.competitors||[];
   const me=sides.find(c=>String(c.team?.id)===String(teamId));
   const foe=sides.find(c=>String(c.team?.id)!==String(teamId));
   const p=c=>parseNumeric(c?.score?.value??c?.score);
   return {scored:p(me),allowed:p(foe)};
  }).filter(x=>x.scored!=null&&x.allowed!=null);
  if(!scores.length)return null;
  const avg=(xs)=>Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*10)/10;
  return {sample:scores.length,pointsAllowed:avg(scores.map(x=>x.allowed)),
    pointsScored:avg(scores.map(x=>x.scored)),
    wins:scores.filter(x=>x.scored>x.allowed).length};
 }catch{return null;}
}
async function injuryReport(teamId,playerId){
 if(!validId(teamId))return {player:null,teammates:[],asOf:null};
 try{
  const d=await fetchESPN(SITE+'/injuries',160,8000);
  const club=(d.injuries||[]).find(g=>String(g.id||g.team?.id)===String(teamId));
  const listed=(club?.injuries||[]).map(j=>({
   id:String(j.athlete?.id||''),name:j.athlete?.displayName||'',
   status:String(j.status||j.fantasy?.status||''),
   date:j.date||null
  })).filter(j=>j.id&&j.name);
  // The feed can include old status records. Hide records older than one week.
  const fresh=listed.filter(j=>!j.date||Date.now()-Date.parse(j.date)<7*86400000);
  return {player:fresh.find(j=>j.id===playerId)||null,
    teammates:fresh.filter(j=>j.id!==playerId).slice(0,7),asOf:new Date().toISOString()};
 }catch{return {player:null,teammates:[],asOf:null};}
}
const averages=(games,key,n)=>aggregate(games,key,n).mean;
function diagnostics(games){
 const last=games.slice(0,20);
 const latest=games.slice(0,5);
 const stat=name=>({
  l5:averages(games,name,5),l10:averages(games,name,10),l20:averages(games,name,20),
  season:averages(games,name,52)
 });
 const withPlus=games.filter(g=>Number.isFinite(g.stats?.PLUSMINUS));
 return {
  sample:games.length,
  points:stat('PTS'),rebounds:stat('REB'),assists:stat('AST'),threes:stat('3PM'),minutes:stat('MIN'),
  shotAttempts:stat('FGA'),threeAttempts:stat('3PA'),turnovers:stat('TO'),steals:stat('STL'),blocks:stat('BLK'),
  plusMinus:withPlus.length?{sample:withPlus.length,average:averages(withPlus,'PLUSMINUS',10),
    positive:withPlus.filter(g=>g.stats.PLUSMINUS>0).length,last:withPlus.slice(0,8).map(g=>({id:g.id,date:g.date,value:g.stats.PLUSMINUS}))}:null,
  shooting:shooting(games,10),
  efficiency:shooting(games,52),
  predictions:Object.fromEntries(['PTS','REB','AST','3PM','PRA','PR','PA','RA','STL','BLK','STOCKS'].map(k=>[k,forecast(games,k)])),
  splits:{home:last.filter(g=>g.home).length,away:last.filter(g=>!g.home).length,
   homePoints:averages(games.filter(g=>g.home),'PTS',20),
   awayPoints:averages(games.filter(g=>!g.home),'PTS',20)},
  latestDates:latest.map(g=>g.date)
 };
}
const fail=(message,status)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request){
 const q=new URL(request.url).searchParams,playerId=q.get('player')||'',year=q.get('season');
 const season=year?Number(year):activeYear();
 if(!validId(playerId))return fail('Choose a valid NBA player.',400);
 if(!validYear(season))return fail('Invalid NBA season.',400);
 try{
  const raw=await fetchESPN(WEB+'/athletes/'+playerId+'/gamelog?season='+season+'&seasontype=2',300);
  const games=parseGamelog(raw,season);
  const teamId=games[0]?.teamId||'';
  const sampled=games.slice(0,8);
  const [boxScores,nextResult,injResult]=await Promise.all([
   Promise.allSettled(sampled.map(g=>gamePlusMinus(g.id,playerId))),
   nextScheduled(teamId),
   injuryReport(teamId,playerId)
  ]);
  const plusMap=new Map(sampled.map((g,i)=>[g.id,boxScores[i]?.status==='fulfilled'?boxScores[i].value:null]));
  for(const game of games)game.stats.PLUSMINUS=plusMap.has(game.id)?plusMap.get(game.id):null;
  const opponentForm=nextResult?.opponentId?await opponentOutlook(nextResult.opponentId):null;
  const output={
    playerId,season,teamId,team:games[0]?.teamAbbreviation||'',
    games,metrics:diagnostics(games),nextGame:nextResult,opponentForm,injuries:injResult,
    dataQuality:{regularSeasonOnly:true,gameLogCount:games.length,plusMinusGames:games.filter(g=>Number.isFinite(g.stats.PLUSMINUS)).length,
     tracking:false,marketOdds:false},
    fetchedAt:new Date().toISOString(),source:'ESPN NBA'
  };
  return NextResponse.json(output,{headers:{'Cache-Control':'public, s-maxage=180, stale-while-revalidate=30'}});
 }catch(e){
  console.error('Player log feed error',String(e?.message||e).slice(0,140));
  return fail('Player game logs are temporarily unavailable.',502);
 }
}

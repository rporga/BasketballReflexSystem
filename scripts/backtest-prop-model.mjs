import {parseGamelog,backtestPropForecast} from '../lib/prop-analytics.js';
const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const WEB='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
const req=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(14000)});if(!r.ok)throw Error(r.status+' '+url);return r.json()};
const teamIds=['13','2','8','14','15','21','23','25','6','7'];
const athletes=new Set(),errors=[];
await Promise.all(teamIds.map(async id=>{
 try{
  const roster=await req(ROOT+'/teams/'+id+'/roster');
  const players=(roster.athletes||roster.team?.athletes||[]).flatMap(g=>g.items||g.athletes||[g]);
  for(const p of players.slice(0,5))if(/^\d+$/.test(String(p.id)))athletes.add(String(p.id));
 }catch(e){errors.push('roster '+id+':'+String(e.message||e))}
}));
const ids=[...athletes],logs=[],queue=[...ids];
await Promise.all(Array.from({length:8},async()=>{
 while(queue.length){
  const id=queue.shift();
  try{
    const raw=await req(WEB+'/athletes/'+id+'/gamelog?season=2026&seasontype=2');
    const games=parseGamelog(raw,2026);
    if(games.length>=25)logs.push({id,games});
  }catch(e){errors.push('player '+id+':'+String(e.message||e))}
 }
}));
const summary={teamCount:teamIds.length,playersRequested:ids.length,playersMeasured:logs.length,errors:errors.slice(0,5),props:{}};
for(const stat of ['PTS','REB','AST','3PM','PRA']){
 let n=0,mae=0,baseline=0,squared=0,baselineSquared=0,players=0;
 for(const p of logs){
  const r=backtestPropForecast(p.games,stat,10);
  if(!r.sample)continue;
  players++;n+=r.sample;mae+=r.mae*r.sample;baseline+=r.baselineMAE*r.sample;
  squared+=r.rmse*r.rmse*r.sample;baselineSquared+=r.baselineRMSE*r.baselineRMSE*r.sample;
 }
 summary.props[stat]={players,forecasts:n,modelMAE:n?Number((mae/n).toFixed(2)):null,
  recent5MAE:n?Number((baseline/n).toFixed(2)):null,
  modelRMSE:n?Number(Math.sqrt(squared/n).toFixed(2)):null,
  recent5RMSE:n?Number(Math.sqrt(baselineSquared/n).toFixed(2)):null};
}
console.log('PROP_BACKTEST',JSON.stringify(summary));
if(logs.length<8||summary.props.PTS.forecasts<100)throw Error('Insufficient historical player samples to assess forecast accuracy');
console.log('PASS 2025-26 historical player forecast vs five-game baseline');

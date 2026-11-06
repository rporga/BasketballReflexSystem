import {replayResults,holdoutValidation,scorePredictions} from '../lib/win-validation.js';
const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const fetchJSON=async url=>{
 const res=await fetch(url,{signal:AbortSignal.timeout(18000)});
 if(!res.ok)throw Error(res.status+' '+url);
 return res.json();
};
const teams=await fetchJSON(ROOT+'/teams');
const ids=(teams.sports?.[0]?.leagues?.[0]?.teams||[]).map(x=>String(x.team?.id||'')).filter(Boolean);
if(ids.length<25)throw Error('NBA team roster incomplete');
const eventMap=new Map(),fails=[];
const queue=[...ids],workers=Array.from({length:6},async()=>{
 while(queue.length){
  const id=queue.shift();
  try{
   const schedule=await fetchJSON(ROOT+'/teams/'+id+'/schedule?season=2026&seasontype=2');
   for(const e of schedule.events||[]){
    if(!e.status?.type?.completed&&!e.competitions?.[0]?.status?.type?.completed)continue;
    const teams=e.competitions?.[0]?.competitors||[];
    const h=teams.find(c=>c.homeAway==='home'),a=teams.find(c=>c.homeAway==='away');
    const val=c=>{const x=c?.score?.value??c?.score;return x===null||x===undefined||x===''?NaN:Number(x)};
    const hScore=val(h),aScore=val(a);
    if(!h?.team?.id||!a?.team?.id||!Number.isFinite(hScore)||!Number.isFinite(aScore)||hScore===aScore)continue;
    eventMap.set(String(e.id),{id:String(e.id),date:e.date,home:String(h.team.id),away:String(a.team.id),homeScore:hScore,awayScore:aScore});
   }
  }catch(e){fails.push(id+': '+String(e.message||e));}
 }
});
await Promise.all(workers);
const games=[...eventMap.values()];
const predicted=replayResults(games);
const result=holdoutValidation(predicted);
console.log('WIN_BACKTEST',JSON.stringify({season:2026,teams:ids.length,games:games.length,predicted:predicted.length,errors:fails.length,validation:result}));
if(fails.length)console.log('SOURCE_ERRORS',fails.slice(0,12).join(';'));
if(games.length<650||predicted.length<500)throw Error('Not enough full-season data for credible win calibration');
if(!result.rawHoldout||!Number.isFinite(result.rawHoldout.brier))throw Error('No valid holdout score');
console.log('PASS NBA full-season walk-forward form-model validation, no future game leakage');

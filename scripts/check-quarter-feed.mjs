const base='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(16000)}); console.log('GET',r.status,url.split('nba/')[1]); if(!r.ok)return null;return r.json();}
const sched=await get(base+'/teams/2/schedule?seasontype=2');
const finished=(sched?.events||[]).filter(e=>e.competitions?.[0]?.status?.type?.completed);
console.log('SCHEDULE finished',finished.length);
console.log('SCHEDULE linescore sample',JSON.stringify(finished[0]?.competitions?.[0]?.competitors?.map(c=>({team:c.team?.abbreviation,score:c.score,linescores:c.linescores?.map(x=>({value:x.value,period:x.period,displayValue:x.displayValue}))}))).slice(0,1700));
const date=finished[0]?.date?.slice(0,10).replaceAll('-','');
const sb=await get(base+'/scoreboard?dates='+(date||'20261023')+'&limit=100');
const game=sb?.events?.find(e=>e.id===finished[0]?.id) || sb?.events?.[0];
console.log('SCOREBOARD sample',JSON.stringify({id:game?.id,date:game?.date,teams:game?.competitions?.[0]?.competitors?.map(c=>({abbr:c.team?.abbreviation,homeAway:c.homeAway,score:c.score,linescores:c.linescores?.map(x=>({period:x.period,value:x.value,displayValue:x.displayValue}))}))}).slice(0,2400));
const range=await get(base+'/scoreboard?dates=20261020-20261105&limit=500');
console.log('RANGE events',range?.events?.length,'first and last',range?.events?.[0]?.date,range?.events?.at(-1)?.date);
if(!game?.competitions?.[0]?.competitors?.some(c=>c.linescores?.length>=4)){throw Error('No quarter detail in scoreboard')}

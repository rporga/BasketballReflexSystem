// Runs in GitHub Actions, where outbound network access is available.
// Checks the public sports provider directly; this is not a live-deployment test.
const base='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
async function get(url) {
  const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Provider HTTP '+response.status+' at '+url);
  return response.json();
}
const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const p=Object.fromEntries(fmt.formatToParts(new Date()).map(x=>[x.type,x.value]));
const date=p.year+p.month+p.day;
const teams=await get(base+'/teams?limit=50');
const entries=teams.sports?.[0]?.leagues?.[0]?.teams;
if(!Array.isArray(entries) || entries.length<25)throw new Error('NBA teams API returned an unexpected team structure');
console.log('PASS team endpoint: '+entries.length+' teams');
const board=await get(base+'/scoreboard?dates='+date+'&limit=100');
if(!Array.isArray(board.events))throw new Error('NBA scoreboard has no events array');
console.log('PASS scoreboard endpoint: '+date+' returned '+board.events.length+' events');
const bos=entries.find(x=>x.team?.abbreviation==='BOS');
const teamId=bos?.team?.id;
if(!teamId)throw new Error('Could not identify ESPN Celtics team ID');
const roster=await get(base+'/teams/'+teamId+'/roster');
if(!Array.isArray(roster.athletes)||roster.athletes.length<5)throw new Error('NBA roster returned no recognized athletes');
console.log('PASS roster endpoint: '+roster.athletes.length+' players');
console.log('Provider smoke test completed. Next.js app still requires a server-capable deployment to serve public requests.');


const eventId=board.events[0]?.id;
if(eventId) {
  const summary=await get(base+'/summary?event='+eventId);
  if(!summary.header && !summary.boxscore)throw new Error('Game summary returned no expected structure');
  console.log('PASS game summary endpoint: '+eventId+'; hasBoxscore='+!!summary.boxscore);
}
const playerId=roster.athletes.find(p=>p.displayName==='Jaylen Brown')?.id || roster.athletes[0]?.id;
const season=new Date().getUTCMonth()>=6?new Date().getUTCFullYear()+1:new Date().getUTCFullYear();
const statsResponse=await get('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/'+playerId+'/stats?season='+season+'&seasontype=2');
if(!statsResponse || typeof statsResponse!=='object')throw new Error('Player stat response was invalid');
console.log('PASS player stats endpoint: '+playerId+'; top-level keys='+Object.keys(statsResponse).slice(0,8).join(','));


console.log('STATS SHAPE '+JSON.stringify((statsResponse.categories || []).slice(0,2).map(c=>({
  name:c.name,keys:Object.keys(c).slice(0,14),labels:c.labels?.slice(0,6),
  totals:Array.isArray(c.totals)?c.totals.slice(0,3):null,
  statsType:Array.isArray(c.stats)?typeof c.stats[0]:typeof c.stats
}))).slice(0,900));
const schedule=await get(base+'/teams/'+teamId+'/schedule?seasontype=2');
const finished=(schedule.events || []).find(e=>e.status?.type?.completed);
console.log('SCHEDULE SHAPE '+JSON.stringify({
  eventCount:(schedule.events || []).length,
  sample:finished?{
    status:finished.status?.type?.name,
    competitors:finished.competitions?.[0]?.competitors?.map(c=>({
      id:c.team?.id,homeAway:c.homeAway,score:c.score
    }))
  }:null
}).slice(0,900));


console.log('SCHEDULE EVENTS '+JSON.stringify((schedule.events || []).slice(0,3).map(e=>({
  id:e.id,date:e.date,status:e.status,competitions:e.competitions?.slice(0,1).map(c=>({
    status:c.status,competitors:c.competitors?.map(s=>({name:s.team?.abbreviation,score:s.score,homeAway:s.homeAway}))
  }))
}))).slice(0,2000));

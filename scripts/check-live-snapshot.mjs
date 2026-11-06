const id='401909934';
const u='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event='+id;
const r=await fetch(u,{signal:AbortSignal.timeout(12000)});
if(!r.ok)throw Error('ESPN '+r.status);
const d=await r.json();
const header=d.header?.competitions?.[0]||{};
console.log('LIVE_SNAPSHOT_STRUCTURE',JSON.stringify({
  top:Object.keys(d).slice(0,18),competitor:header.competitors?.map(c=>({
    team:c.team?.abbreviation,homeAway:c.homeAway,score:c.score,linescores:c.linescores
  })),
  samplePlay:d.plays?.[0]&&Object.keys(d.plays[0]),sampleText:d.plays?.[0]?.text,
  playScores:d.plays?.[0]?{home:d.plays[0].homeScore,away:d.plays[0].awayScore}:null
}).slice(0,7000));

const win=d.winprobability;
console.log('ESPN_WINPROBABILITY',JSON.stringify({type:typeof win,isArray:Array.isArray(win),length:win?.length,
 first:Array.isArray(win)?win.slice(0,3):win&&Object.keys(win).slice(0,20),
 last:Array.isArray(win)?win.slice(-4):null}).slice(0,9500));

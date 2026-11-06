const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});console.log('REQ',r.status,url);if(!r.ok)throw Error('fetch failed '+r.status);return r.json()};
const board=await get(ROOT+'/scoreboard?dates=20261104&limit=100');
const e=board.events?.find(x=>x.status?.type?.completed);
if(!e)throw Error('No completed game');
console.log('GAME',e.id,e.name);
const s=await get(ROOT+'/summary?event='+e.id);
console.log('SUMMARY TOP KEYS',Object.keys(s));
console.log('PLAYS META',JSON.stringify({type:typeof s.plays,isArray:Array.isArray(s.plays),keys:s.plays&&!Array.isArray(s.plays)?Object.keys(s.plays):[],first:Array.isArray(s.plays)?s.plays.slice(0,2):s.plays?.items?.slice(0,1)}).slice(0,2400));
const buckets=['plays','scoringPlays','keyEvents','boxscore','header','drives','rosters','gameInfo','leaders'];
for(const key of buckets)console.log('BUCKET',key,'type',typeof s[key], 'keys',s[key]&&typeof s[key]==='object'?Object.keys(s[key]).slice(0,12):[]);
for(const g of s.boxscore?.players||[]){
  console.log('GROUP',g.team?.id,g.team?.abbreviation,'stats',g.statistics?.length);
  for(const b of g.statistics||[]){
    console.log('BLOCK',b.name,b.labels,'rows',b.athletes?.length,'first',JSON.stringify(b.athletes?.slice(0,2)).slice(0,1600));
    console.log('STARTERS',b.athletes?.filter(x=>x.starter===true).map(x=>({id:x.athlete?.id,name:x.athlete?.displayName,starter:x.starter})).slice(0,6));
  }
}
const plays=Array.isArray(s.plays)?s.plays:s.plays?.items||[];
console.log('PBP LENGTH',plays.length);
console.log('FIRST PLAY',JSON.stringify(plays[0]).slice(0,1700));
console.log('SUB EXAMPLES',JSON.stringify(plays.filter(p=>/substitut/i.test((p.type?.text||'')+' '+(p.text||''))).slice(0,5)).slice(0,6500));
console.log('PERIOD EXAMPLES',JSON.stringify(plays.filter(p=>/start of/i.test(p.text||'')).slice(0,3)).slice(0,1800));
if(!plays.length)throw Error('No plays in summary');

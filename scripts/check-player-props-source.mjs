const root='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes';
for(const year of [2027,2026]){
  const url=root+'/3945274/gamelog?season='+year+'&seasontype=2';
  const response=await fetch(url,{signal:AbortSignal.timeout(14000)});
  console.log('PROP FETCH',response.status,year);
  if(!response.ok)continue;
  const d=await response.json();
  console.log('PROP KEYS',Object.keys(d));
  for(const k of ['labels','names','displayNames','events','seasonTypes','seasonType','filters','categories','statistics','team','opponents','gameLog','eventsByDate']){
    const v=d[k];if(v==null)continue;
    console.log('PROP',k,Array.isArray(v)?'ARRAY '+v.length:typeof v,JSON.stringify(Array.isArray(v)?v.slice(0,3):v).slice(0,4900));
  }
  console.log('PROP SAMPLE JSON',JSON.stringify(d).slice(0,14000));
  if(d.events?.length)break;
}
const test='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/3945274/splits?season=2027&seasontype=2';
const resp=await fetch(test,{signal:AbortSignal.timeout(14000)});
console.log('SPLITS',resp.status);
if(resp.ok){const d=await resp.json();console.log('SPLIT KEYS',Object.keys(d));console.log('SPLIT SAMPLE',JSON.stringify(d).slice(0,4500));}

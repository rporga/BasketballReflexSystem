// Shareable Pick & Roll routes. No user text or sportsbook prices appear in URLs.
const allowedTabs=new Set(['games','teams','players']);
export function parseAppRoute(pathname='/'){
  const path=String(pathname||'/').split('?')[0].replace(/\/+$/,'')||'/';
  if(path==='/'||path==='/games')return {tab:'games',gameId:null,homeAbbr:null,awayAbbr:null,playerId:null};
  if(path==='/matchups')return {tab:'teams',gameId:null,homeAbbr:null,awayAbbr:null,playerId:null};
  if(path==='/players')return {tab:'players',gameId:null,homeAbbr:null,awayAbbr:null,playerId:null};
  const game=path.match(/^\/games\/(\d{8,12})$/);
  if(game)return {tab:'games',gameId:game[1],homeAbbr:null,awayAbbr:null,playerId:null};
  const player=path.match(/^\/players\/(\d{1,12})$/);
  if(player)return {tab:'players',gameId:null,homeAbbr:null,awayAbbr:null,playerId:player[1]};
  const matchup=path.match(/^\/matchups\/([a-z]{2,5})-vs-([a-z]{2,5})$/);
  if(matchup&&matchup[1]!==matchup[2])return {tab:'teams',gameId:null,homeAbbr:matchup[1].toUpperCase(),awayAbbr:matchup[2].toUpperCase(),playerId:null};
  return {tab:'games',gameId:null,homeAbbr:null,awayAbbr:null,playerId:null};
}
export function gamesPath(id=''){
  const value=String(id||'');
  return /^\d{8,12}$/.test(value)?'/games/'+value:'/games';
}
export function playersPath(id=''){
  const value=String(id||'');
  return /^\d{1,12}$/.test(value)?'/players/'+value:'/players';
}
export function matchupsPath(home='',away=''){
  const h=String(home||'').toLowerCase(),a=String(away||'').toLowerCase();
  return /^[a-z]{2,5}$/.test(h)&&/^[a-z]{2,5}$/.test(a)&&h!==a
    ?'/matchups/'+h+'-vs-'+a
    :'/matchups';
}
export function dateInNewYork(iso){
  if(!iso||Number.isNaN(Date.parse(iso)))return null;
  const bits=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date(iso)).map(x=>[x.type,x.value]));
  return bits.year+bits.month+bits.day;
}
export function propQuery(prop,windowSize){
  const params=new URLSearchParams();
  if(['PTS','REB','AST','3PM','PRA','PR','PA','RA','STL','BLK','STOCKS'].includes(prop)&&prop!=='PTS')params.set('prop',prop);
  if([5,10,20,52].includes(Number(windowSize))&&Number(windowSize)!==10)params.set('window',String(windowSize));
  return params.toString();
}
export function parsePropQuery(search=''){
  const params=new URLSearchParams(String(search).replace(/^\?/,''));
  const prop=params.get('prop'),num=Number(params.get('window'));
  return {prop:['PTS','REB','AST','3PM','PRA','PR','PA','RA','STL','BLK','STOCKS'].includes(prop)?prop:'PTS',
    windowSize:[5,10,20,52].includes(num)?num:10};
}

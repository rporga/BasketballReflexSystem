// Pure season game-log and player-prop analytics. Never invent missing tracking or odds data.
export const PROP_DEFS={
  PTS:{label:'Points',step:0.5},
  REB:{label:'Rebounds',step:0.5},
  AST:{label:'Assists',step:0.5},
  '3PM':{label:'3-Pointers',step:0.5},
  PRA:{label:'Points + Rebounds + Assists',step:0.5},
  PR:{label:'Points + Rebounds',step:0.5},
  PA:{label:'Points + Assists',step:0.5},
  RA:{label:'Rebounds + Assists',step:0.5},
  STL:{label:'Steals',step:0.5},
  BLK:{label:'Blocks',step:0.5},
  STOCKS:{label:'Steals + Blocks',step:0.5}
};
const rnd=(x,n=1)=>Number.isFinite(x)?Number(x.toFixed(n)):null;
const num=x=>x==null||String(x).trim()===''||String(x)==='—'?null:Number.isFinite(Number(x))?Number(x):null;
const seasonYear=iso=>Number(String(iso).slice(0,4))+(Number(String(iso).slice(5,7))>=7?1:0);
const pair=x=>{const m=String(x||'').match(/^(\d+)-(\d+)$/);return m?[Number(m[1]),Number(m[2])]:[null,null]};
const sortByDate=(a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id).localeCompare(String(a.id));
export function parseGamelog(raw,season){
 const seasons=(raw?.seasonTypes||[]).filter(s=>/regular season/i.test(String(s.displayName||'')));
 const events=raw?.events&&typeof raw.events==='object'?raw.events:{};
 const labels=Array.isArray(raw?.labels)?raw.labels:[];
 const entries=seasons.flatMap(section=>(section.categories||[]).flatMap(category=>category.type==='event'?category.events||[]:[]));
 const seen=new Set(),out=[];
 for(const row of entries){
  const id=String(row.eventId||row.id||'');
  if(!/^\d{8,12}$/.test(id)||seen.has(id)||!Array.isArray(row.stats))continue;
  const e=events[id];if(!e||!e.gameDate)continue;
  if(Number.isFinite(season)&&seasonYear(e.gameDate)!==Number(season))continue;
  const flat=Object.fromEntries(labels.map((label,i)=>[String(label),row.stats[i]]));
  const [fgm,fga]=pair(flat.FG),[tpm,tpa]=pair(flat['3PT']),[ftm,fta]=pair(flat.FT);
  const required=['PTS','REB','AST'];
  if(required.some(label=>num(flat[label])==null))continue;
  const isHome=String(e.homeTeamId||'')===String(e.team?.id||'');
  const plusMinus=num(flat['+/-']);
  const stats={
   PTS:num(flat.PTS),REB:num(flat.REB),AST:num(flat.AST),'3PM':tpm,'3PA':tpa,
   STL:num(flat.STL),BLK:num(flat.BLK),TO:num(flat.TO),MIN:num(flat.MIN),
   FGM:fgm,FGA:fga,FTM:ftm,FTA:fta,FGP:num(flat['FG%']),'3PP':num(flat['3P%']),
   FTP:num(flat['FT%']),PF:num(flat.PF),
   PLUSMINUS:plusMinus
  };
  for(const [key,parts] of Object.entries({PRA:['PTS','REB','AST'],PR:['PTS','REB'],PA:['PTS','AST'],RA:['REB','AST'],STOCKS:['STL','BLK']})){
   stats[key]=parts.every(k=>stats[k]!=null)?parts.reduce((v,k)=>v+stats[k],0):null;
  }
  seen.add(id);
  out.push({id,date:e.gameDate,opponent:e.opponent?.abbreviation||'—',opponentId:String(e.opponent?.id||''),opponentName:e.opponent?.displayName||'',
    teamId:String(e.team?.id||''),teamAbbreviation:e.team?.abbreviation||'',
    home:isHome,result:e.gameResult||'',score:e.score||'',stats});
 }
 return out.sort(sortByDate).slice(0,52);
}
export function quantile(values,p){
 const vals=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
 if(!vals.length)return null;
 const pos=(vals.length-1)*Math.min(1,Math.max(0,p));
 const lo=Math.floor(pos),hi=Math.ceil(pos);
 return rnd(vals[lo]+(vals[hi]-vals[lo])*(pos-lo),2);
}
export function aggregate(games,key,window=10,threshold=null,side='over'){
 const sample=games.slice(0,window).filter(g=>Number.isFinite(g?.stats?.[key]));
 const vals=sample.map(g=>g.stats[key]),count=vals.length;
 if(!count)return {sample:0,mean:null,median:null,p25:null,p75:null,sd:null,hits:null,hitRate:null,min:null,max:null,streak:0,values:[]};
 const mean=vals.reduce((a,b)=>a+b,0)/count;
 const variance=count>1?vals.reduce((a,b)=>a+(b-mean)**2,0)/(count-1):0;
 const hits=threshold==null?null:vals.filter(v=>side==='under'?v<threshold:v>threshold).length;
 const pushes=threshold==null?null:vals.filter(v=>v===threshold).length;
 const settled=count-(pushes||0);
 let streak=0;
 if(threshold!=null)for(const v of vals){if(side==='under'?v<threshold:v>threshold)streak++;else break;}
 return {sample:count,mean:rnd(mean,2),median:quantile(vals,.5),p25:quantile(vals,.25),p75:quantile(vals,.75),
  sd:rnd(Math.sqrt(variance),2),hits,pushes,decisions:settled,
  hitRate:hits==null||settled===0?null:rnd(100*hits/settled),min:Math.min(...vals),max:Math.max(...vals),
  streak,values:vals};
}
export function shooting(games,window=10){
 const list=games.slice(0,window).filter(g=>g.stats?.FGA!=null&&g.stats?.FGM!=null);
 if(!list.length)return null;
 const sum=k=>list.reduce((x,g)=>x+(g.stats[k]??0),0);
 const fg=sum('FGM'),fga=sum('FGA'),three=sum('3PM'),threes=sum('3PA'),fta=sum('FTA'),pts=sum('PTS');
 return {games:list.length,fgAttempts:rnd(fga/list.length),threeAttempts:rnd(threes/list.length),freeThrowAttempts:rnd(fta/list.length),
  fgPct:fga?rnd(100*fg/fga):null,eFg:fga?rnd(100*(fg+.5*three)/fga):null,ts:(2*(fga+.44*fta))?rnd(100*pts/(2*(fga+.44*fta))):null};
}
export function pearson(pairs){
 if(pairs.length<5)return null;
 const xs=pairs.map(x=>x[0]),ys=pairs.map(x=>x[1]),avg=a=>a.reduce((x,y)=>x+y,0)/a.length,mx=avg(xs),my=avg(ys);
 const cov=pairs.reduce((v,x)=>v+(x[0]-mx)*(x[1]-my),0);
 const sx=Math.sqrt(xs.reduce((v,x)=>v+(x-mx)**2,0)),sy=Math.sqrt(ys.reduce((v,y)=>v+(y-my)**2,0));
 return sx>0&&sy>0?rnd(cov/(sx*sy),2):null;
}
export function legStat(game,leg){return game?.stats?.[leg.prop];}
export function comparison(legs){
 if(!legs.length)return {count:0,pairs:[],sameGameSample:0,coHits:null,independentReference:null};
 const rates=legs.map(leg=>{
  const r=aggregate(leg.games||[],leg.prop,10,Number(leg.line),leg.side);
  return r.hitRate==null||r.sample<5?null:r.hitRate/100;
 });
 const independentReference=rates.every(x=>x!==null)?rnd(100*rates.reduce((x,y)=>x*y,1),1):null;
 // Same-game co-hits and within-game correlations only make sense
 // for legs targeting the same upcoming game.
 const sameTarget=legs.length>=2&&Boolean(legs[0].targetGameId)&&legs.every(l=>l.targetGameId===legs[0].targetGameId);
 const pairs=[];
 if(sameTarget)for(let i=0;i<legs.length;i++)for(let j=i+1;j<legs.length;j++){
  const a=legs[i],b=legs[j],map=new Map((b.games||[]).map(g=>[g.id,g]));
  const overlap=(a.games||[]).map(g=>[legStat(g,a),legStat(map.get(g.id),b)]).filter(pair=>pair.every(Number.isFinite));
  if(overlap.length>=10)pairs.push({a:i,b:j,n:overlap.length,r:pearson(overlap)});
 }
 const common=sameTarget?legs.reduce((ids,l)=>{
  // Equal-to-line results are pushes and do not belong in either the win or loss denominator.
  const valid=new Set((l.games||[]).filter(g=>Number.isFinite(legStat(g,l))&&legStat(g,l)!==Number(l.line)).map(g=>g.id));
  return ids==null?valid:new Set([...ids].filter(id=>valid.has(id)));
 },null):null;
 const sample=common?.size||0;
 let hits=null;
 if(sample>=5){
  const hit=Array.from(common).filter(id=>legs.every(l=>{
   const g=(l.games||[]).find(x=>x.id===id),v=legStat(g,l);
   return l.side==='under'?v<Number(l.line):v>Number(l.line);
  })).length;
  hits={count:hit,rate:rnd(100*hit/sample,1),n:sample};
 }
 return {count:legs.length,pairs,sameGameSample:sample,coHits:hits,independentReference};
}
export function decimalOdds(value,format='decimal'){
 const n=Number(value);
 if(!Number.isFinite(n))return null;
 if(format==='american')return n>0?1+n/100:n<=-100?1+100/Math.abs(n):null;
 return n>=1.01&&n<=100000?n:null;
}
// Minutes-adjusted descriptive forecast. Form-only estimates, not an odds model.
export function forecast(games,key){
 const eligible=games.filter(g=>Number.isFinite(g?.stats?.[key])&&Number.isFinite(g?.stats?.MIN)&&g.stats.MIN>0).slice(0,20);
 if(eligible.length<5)return null;
 const recent=eligible.slice(0,5),long=eligible;
 const weighted=(rows,field)=>rows.reduce((n,g)=>n+g.stats[field],0)/rows.length;
 const averageRecentMinutes=weighted(recent,'MIN');
 const averageLongMinutes=weighted(long,'MIN');
 const projectedMinutes=Math.max(0,Math.min(48,.6*averageRecentMinutes+.4*averageLongMinutes));
 const rate=rows=>rows.reduce((n,g)=>n+g.stats[key],0)/rows.reduce((n,g)=>n+g.stats.MIN,0);
 const expected=Math.max(0,projectedMinutes*(.6*rate(recent)+.4*rate(long)));
 // Empirical IQR is scaled to projected minutes rather than presented as a calibrated confidence interval.
 const historical=long.map(g=>g.stats[key]*projectedMinutes/g.stats.MIN);
 const q1=quantile(historical,.25),q3=quantile(historical,.75);
 const low=Math.min(q1,expected),high=Math.max(q3,expected);
 return {expected:rnd(expected,1),range:[rnd(low,1),rnd(high,1)],minutes:rnd(projectedMinutes,1),
   formDifference:rnd(weighted(recent,key)-weighted(long,key),1),sample:long.length,
   basis:'recent per-minute production and projected minutes',validated:false};
}
// Walk-forward evaluation, strictly using games prior to each observed result.
export function backtestPropForecast(games,key,minHistory=10){
 const chronological=games.filter(g=>Number.isFinite(g?.stats?.[key])&&Number.isFinite(g?.stats?.MIN)&&g.stats.MIN>0).slice().reverse();
 let absolute=0,squared=0,baselineAbsolute=0,baselineSquared=0,n=0;
 for(let i=minHistory;i<chronological.length;i++){
   const history=chronological.slice(0,i).reverse();
   const guess=forecast(history,key),baseline=aggregate(history,key,5).mean;
   if(guess==null||baseline==null)continue;
   const actual=chronological[i].stats[key],a=guess.expected-actual,b=baseline-actual;
   absolute+=Math.abs(a);squared+=a*a;baselineAbsolute+=Math.abs(b);baselineSquared+=b*b;n++;
 }
 return {sample:n,mae:n?rnd(absolute/n,2):null,rmse:n?rnd(Math.sqrt(squared/n),2):null,
   baselineMAE:n?rnd(baselineAbsolute/n,2):null,baselineRMSE:n?rnd(Math.sqrt(baselineSquared/n),2):null,
   beatsBaseline:n>0?absolute<baselineAbsolute:null};
}

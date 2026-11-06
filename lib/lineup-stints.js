// Reconstruct observed *first-quarter* five-man stints from ESPN game PBP.
// A new period can start with different players without an explicit substitution,
// so we deliberately do NOT extrapolate these observations past Q1.
const id=x=>String(x??'');
const valid=n=>Number.isFinite(Number(n))?Number(n):null;
const seconds=x=>{
 const m=String(x||'').match(/^(\d{1,2}):(\d{2})(?:\.\d+)?$/);
 return m?Number(m[1])*60+Number(m[2]):null;
};
const five=report=>new Map((report?.boxscore?.players||[]).map(g=>{
 const starters=(g.statistics?.[0]?.athletes||[]).filter(a=>a.starter&&!a.didNotPlay)
   .map(a=>id(a.athlete?.id)).filter(Boolean);
 return [id(g.team?.id),starters.length===5?starters:null];
}));
export function firstQuarterStints(report){
 const comp=report?.header?.competitions?.[0];
 const home=id(comp?.competitors?.find(c=>c.homeAway==='home')?.team?.id);
 const away=id(comp?.competitors?.find(c=>c.homeAway==='away')?.team?.id);
 const starters=five(report);
 const h=starters.get(home),a=starters.get(away);
 if(!home||!away||!h||!a)return {};
 const plays=(Array.isArray(report.plays)?report.plays:[]).filter(p=>Number(p.period?.number)===1)
   .slice().sort((x,y)=>Number(x.sequenceNumber||0)-Number(y.sequenceNumber||0));
 if(plays.length<20)return {};
 const lineups={home:[...h],away:[...a]},groups={home:new Map(),away:new Map()};
 let clock=720,scoredHome=0,scoredAway=0,errors=0,scoringEvents=0;
 const append=(duration,dH,dA)=>{
  for(const side of ['home','away']){
   const ids=lineups[side].slice().sort(),key=ids.join(',');
   let s=groups[side].get(key);
   if(!s){s={ids,minutes:0,pointsFor:0,pointsAgainst:0};groups[side].set(key,s);}
   s.minutes+=duration;
   s.pointsFor+=side==='home'?dH:dA;
   s.pointsAgainst+=side==='home'?dA:dH;
  }
 };
 for(const play of plays){
  const current=seconds(play.clock?.displayValue);
  if(current==null||current>clock||current<0){errors++;continue;}
  const hScore=valid(play.homeScore),aScore=valid(play.awayScore);
  if(hScore==null||aScore==null||hScore<scoredHome||aScore<scoredAway){errors++;continue;}
  const diffH=hScore-scoredHome,diffA=aScore-scoredAway;
  if(diffH+diffA>0)scoringEvents++;
  append((clock-current)/60,diffH,diffA);
  scoredHome=hScore;scoredAway=aScore;clock=current;
  if(/substitution/i.test(play.type?.text||'')){
   const side=id(play.team?.id)===home?'home':id(play.team?.id)===away?'away':null;
   const entering=id(play.participants?.[0]?.athlete?.id),leaving=id(play.participants?.[1]?.athlete?.id);
   if(!side||!lineups[side].includes(leaving)||lineups[side].includes(entering)||!entering){errors++;continue;}
   lineups[side]=lineups[side].map(x=>x===leaving?entering:x);
  }
 }
 // Do not add unobserved play time at the end; cap to covered Q1 evidence.
 if(scoringEvents<12||errors>0||clock>50)return {};
 const result={};
 for(const side of ['home','away']){
  result[side==='home'?home:away]=[...groups[side].values()].filter(x=>x.minutes>=.5)
   .map(x=>({...x,minutes:Number(x.minutes.toFixed(1)),plusMinus:x.pointsFor-x.pointsAgainst,
      period:'Q1'}))
   .sort((a,b)=>b.minutes-a.minutes);
 }
 return result;
}
export function combineLineupStints(reports,teamId){
 const byLineup=new Map();
 for(const report of reports){
  const stints=firstQuarterStints(report)[String(teamId)]||[];
  for(const s of stints){
   const key=s.ids.join(',');
   const existing=byLineup.get(key)||{ids:s.ids,minutes:0,pointsFor:0,pointsAgainst:0,gameCount:0};
   existing.minutes+=s.minutes;existing.pointsFor+=s.pointsFor;existing.pointsAgainst+=s.pointsAgainst;existing.gameCount++;
   byLineup.set(key,existing);
  }
 }
 return [...byLineup.values()].map(x=>({...x,minutes:Number(x.minutes.toFixed(1)),
   plusMinus:x.pointsFor-x.pointsAgainst})).filter(x=>x.minutes>=4).sort((a,b)=>b.minutes-a.minutes).slice(0,6);
}

// Extract ESPN's published play-level in-game probability without inventing live values.
const number=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
export function sourceWinProbability(summary){
 const series=Array.isArray(summary?.winprobability)?summary.winprobability:[];
 const item=[...series].reverse().find(p=>number(p.homeWinPercentage)!=null&&
   number(p.homeWinPercentage)>=0&&number(p.homeWinPercentage)<=1);
 if(!item)return null;
 const match=(summary.plays||[]).find(x=>String(x.id)===String(item.playId));
 const homeScore=number(match?.homeScore),awayScore=number(match?.awayScore);
 return {home:+(number(item.homeWinPercentage)*100).toFixed(1),
   away:+((1-number(item.homeWinPercentage))*100).toFixed(1),
   source:'ESPN',playId:String(item.playId||''),
   homeScore,awayScore,
   period:number(match?.period?.number),clock:match?.clock?.displayValue||null,
   sample:series.length};
}
const seconds=x=>{
 const m=String(x||'').match(/^(\d{1,2}):(\d{2})(?:\.(\d+))?$/);
 if(!m)return null;
 return Number(m[1])*60+Number(m[2])+(m[3]?Number('0.'+m[3]):0);
};
export function probabilityMatchesScore(probability,game){
 if(!probability||game?.status!=='in')return false;
 const home=number(game?.home?.score),away=number(game?.away?.score);
 if(home===null||away===null||probability.homeScore!==home||probability.awayScore!==away)return false;
 const period=number(game?.period);
 if(period!=null&&probability.period!=null&&period!==probability.period)return false;
 const current=seconds(game?.clock),published=seconds(probability.clock);
 if(current!=null&&published!=null&&Math.abs(current-published)>90)return false;
 return true;
}

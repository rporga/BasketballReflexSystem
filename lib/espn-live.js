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
export function probabilityMatchesScore(probability,game){
 if(!probability||game?.status!=='in')return false;
 const home=number(game?.home?.score),away=number(game?.away?.score);
 return home!==null&&away!==null&&probability.homeScore===home&&probability.awayScore===away;
}

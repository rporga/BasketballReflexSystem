import assert from 'node:assert/strict';
import {parseGamelog,aggregate,shooting,comparison,decimalOdds,forecast,pearson} from '../lib/prop-analytics.js';
const day=i=>'2026-10-'+String(11+i).padStart(2,'0')+'T01:00:00.000Z';
const mkStats=i=>['32','9-18','50.0','3-8','37.5','5-6','83.3','7',String(6+i),'1','2','2','3',String(24+i)];
const events={};
for(let i=0;i<10;i++)events[String(401909001+i)]={id:String(401909001+i),gameDate:day(i),team:{id:'13',abbreviation:'LAL'},homeTeamId:i%2?'13':'23',
  opponent:{id:'23',abbreviation:'SAC',displayName:'Sacramento Kings'},gameResult:'W',score:'120-108'};
events['401898711']={id:'401898711',gameDate:'2026-10-05T01:00:00Z',team:{id:'13'},opponent:{id:'23',abbreviation:'SAC'}};
const raw={labels:['MIN','FG','FG%','3PT','3P%','FT','FT%','REB','AST','BLK','STL','PF','TO','PTS'],events,
 seasonTypes:[
  {displayName:'2026-27 Regular Season',categories:[{type:'event',events:Object.keys(events).filter(x=>x!=='401898711').map((id,i)=>({eventId:id,stats:mkStats(i)}))}]},
  {displayName:'2026-27 Preseason',categories:[{type:'event',events:[{eventId:'401898711',stats:mkStats(20)}]}]}
 ]};
const log=parseGamelog(raw,2027);
assert.equal(log.length,10,'preseason never included');
assert.equal(log[0].stats.PTS,33);
assert.equal(log[0].stats['3PM'],3);
assert.equal(log[0].stats['3PA'],8);
assert.equal(log[0].stats.PRA,33+7+15);
assert.equal(log[0].home,true);
assert.equal(log[0].stats.PLUSMINUS,null);
const pts=aggregate(log,'PTS',5,30.5);
assert.equal(pts.sample,5);assert.equal(pts.hits,3);assert.equal(pts.hitRate,60);
const under=aggregate(log,'PTS',5,30.5,'under');assert.equal(under.hits,2);
const efficiency=shooting(log,10);
assert.equal(efficiency.games,10);assert.equal(efficiency.threeAttempts,8);
assert.ok(Number.isFinite(efficiency.ts));
assert.equal(decimalOdds('-110','american')?.toFixed(3),'1.909');
assert.equal(decimalOdds(1.9,'decimal'),1.9);
assert.equal(decimalOdds(0.4,'decimal'),null);
assert.equal(forecast(log,'PTS').sample,10);
assert.equal(pearson([[1,2],[2,4],[3,6],[4,8],[5,10]]),1);
const paired={games:log,prop:'PTS',line:29.5,side:'over'};
const another={games:log,prop:'AST',line:10.5,side:'over'};
const all=comparison([paired,another]);
assert.equal(all.sameGameSample,10);assert.ok(all.coHits);
assert.equal(all.pairs.length,1);
const none=comparison([paired,{...another,games:log.map(g=>({...g,id:'x'+g.id}))}]);
assert.equal(none.coHits,null);assert.equal(none.pairs.length,0);
console.log('PASS current-season log, preseason exclusion, prop hit rates, efficiency, plus/minus gaps and parlay co-hit logic');

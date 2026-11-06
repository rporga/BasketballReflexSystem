import assert from 'node:assert/strict';
import {sourceWinProbability,probabilityMatchesScore} from '../lib/espn-live.js';
import {evaluateRotation} from '../lib/rotation-analytics.js';
const report={winprobability:[{homeWinPercentage:.45,playId:'a'},{homeWinPercentage:.63,playId:'b'}],
 plays:[{id:'a',homeScore:40,awayScore:44,period:{number:2},clock:{displayValue:'07:12'}},
        {id:'b',homeScore:73,awayScore:64,period:{number:3},clock:{displayValue:'03:11'}}]};
const x=sourceWinProbability(report);
assert.equal(x.home,63);assert.equal(x.away,37);
assert.equal(x.homeScore,73);assert.equal(x.playId,'b');assert.equal(x.source,'ESPN');
assert.equal(probabilityMatchesScore(x,{status:'in',home:{score:73},away:{score:64}}),true);
assert.equal(probabilityMatchesScore(x,{status:'in',home:{score:75},away:{score:64}}),false);
assert.equal(probabilityMatchesScore(x,{status:'post',home:{score:73},away:{score:64}}),false);
assert.equal(sourceWinProbability({winprobability:[]}),null);
assert.equal(sourceWinProbability({winprobability:[{homeWinPercentage:4,playId:'b'}]}),null);
const p=(id)=>({id,profile:{role:3,per36:{pts:18},defense:2},name:id});
const data={teams:{home:{onCourt:['a','b','c','d','e'].map(p),players:['a','b','c','d','e'].map(p)},
  away:{onCourt:['f','g','h','i','j'].map(p),players:['f','g','h','i','j'].map(p)}},
 game:{status:'in',period:3,clock:'03:11',homeScore:73,awayScore:64}};
const calc=evaluateRotation(data,{priorHomeWin:51,liveHomeWin:63});
assert.equal(calc.available,true);assert.equal(calc.baselineHome,63);assert.equal(calc.baselineSource,'ESPN');
console.log('PASS ESPN sourced live win probability, score freshness, and consistent lineup baseline');

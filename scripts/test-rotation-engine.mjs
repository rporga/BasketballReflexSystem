import assert from 'node:assert/strict';
import {playerProfile,evaluateRotation,gameClock} from '../lib/rotation-analytics.js';
const player=(id,pts,stl=1,blk=.5)=>({id,name:'Player '+id,profile:playerProfile([
 {min:30,pts,reb:5,ast:4,stl,blk,to:2},
 {min:32,pts:pts+2,reb:6,ast:3,stl,blk,to:2}
])});
const homeP=[player('1',20),player('2',15),player('3',15),player('4',12),player('5',11),player('6',32)];
const awayP=[player('7',18),player('8',16),player('9',14),player('10',13),player('11',11)];
const fixture={teams:{
 home:{players:homeP,onCourt:homeP.slice(0,5)},away:{players:awayP,onCourt:awayP}
},game:null};
const old=evaluateRotation(fixture,{priorHomeWin:55});
assert.equal(old.available,true);
assert.equal(old.changed,false);
assert.ok(Math.abs(old.baselineHome-55)<.05);
const newer=evaluateRotation(fixture,{priorHomeWin:55,homeIds:['6','2','3','4','5']});
assert.equal(newer.available,true);
assert.ok(newer.scenarioHome>old.scenarioHome,'Subbing in stronger player should improve home estimate in this fixture');
const defend=evaluateRotation(fixture,{priorHomeWin:55,attackerId:'1',defenderId:'7'});
assert.ok(defend.defensiveMatchup?.attacker==='Player 1');
const noSamples=structuredClone(fixture);
noSamples.teams.home.players[5].profile=playerProfile([]);
const unavailable=evaluateRotation(noSamples,{homeIds:['6','2','3','4','5'],priorHomeWin:55});
assert.equal(unavailable.available,false,'Unknown incoming player data must not be treated as zero');
const live=structuredClone(fixture);
live.game={status:'in',period:4,clock:'2:00',homeScore:100,awayScore:90};
const late=evaluateRotation(live,{priorHomeWin:55});
assert.ok(late.baselineHome>old.baselineHome);
assert.equal(gameClock(live.game),2);
const final=structuredClone(live);final.game.status='post';
assert.equal(evaluateRotation(final,{priorHomeWin:55}).available,false);
console.log('PASS lineup tests: roster swap, defender proxy, live score/time, unknown data and final status');

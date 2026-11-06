import assert from 'node:assert/strict';
import {officialGameOutcome} from '../lib/game-outcome.js';
import {aggregate,backtestPropForecast,decimalOdds,comparison} from '../lib/prop-analytics.js';
const ot=officialGameOutcome([22,30,20,28],[25,27,24,24],112,108);
assert.equal(ot.overtime,true);assert.equal(ot.otFor,12);assert.equal(ot.otAgainst,8);
assert.equal(ot.scored,112);assert.equal(ot.allowed,108);assert.equal(ot.margin,4);
assert.equal(ot.won,true);assert.equal(ot.firstHalf,0);assert.equal(ot.secondHalf,0);
assert.equal(officialGameOutcome([20,22,25,31],[21,20,25,30],98,96).overtime,false);
assert.equal(officialGameOutcome([20,22,25,31],[21,20,25,30],90,96),null);
const games=Array.from({length:18},(_,i)=>({id:String(i),date:'2026-10-'+String(i+1).padStart(2,'0'),stats:{
  MIN:30+(i%6),PTS:20+i%5,REB:4+i%4,AST:3+i%3
}})).reverse();
const pushes=aggregate(games,'PTS',10,22,'over');
assert.ok(pushes.pushes>0);assert.equal(pushes.decisions+pushes.pushes,pushes.sample);
assert.equal(pushes.hitRate,Number((100*pushes.hits/pushes.decisions).toFixed(1)));
const test=backtestPropForecast(games,'PTS',10);
assert.equal(test.sample,8);assert.ok(Number.isFinite(test.mae));assert.ok(Number.isFinite(test.baselineMAE));
assert.equal(decimalOdds(-110,'american').toFixed(3),'1.909');
assert.equal(decimalOdds(3,'decimal'),3);
const noOverlap=comparison([{targetGameId:'a',games,prop:'PTS',side:'over',line:21},
 {targetGameId:'b',games,prop:'REB',side:'over',line:5}]);
assert.equal(noOverlap.coHits,null);
console.log('PASS overtime authoritative scoring, push denominators and walk-forward prop evaluation');

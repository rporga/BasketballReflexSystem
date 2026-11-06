import assert from 'node:assert/strict';
import {firstQuarterStints,combineLineupStints} from '../lib/lineup-stints.js';
const starters=(team,base)=>({team:{id:team},statistics:[{athletes:Array.from({length:5},(_,i)=>({starter:true,athlete:{id:String(base+i)}}))}]});
let home=0,away=0;
const plays=[];
for(let i=0;i<24;i++){
 const sub=i===12;
 if(!sub){if(i%2)home+=2;else away+=2;}
 const seconds=720-(i+1)*30;
 plays.push({sequenceNumber:String(i+1),period:{number:1},
   clock:{displayValue:Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')},
   homeScore:home,awayScore:away,
   type:{text:sub?'Substitution':'Made Shot'},
   team:{id:'1'},participants:sub?[{athlete:{id:'16'}},{athlete:{id:'10'}}]:[]});
}
plays.push({sequenceNumber:'40',period:{number:2},clock:{displayValue:'12:00'},
 homeScore:home,awayScore:away,type:{text:'Start Period'}});
const fixture={header:{competitions:[{competitors:[{homeAway:'home',team:{id:'1'}},{homeAway:'away',team:{id:'2'}}]}]},
 boxscore:{players:[starters('1',10),starters('2',20)]},plays};
const stints=firstQuarterStints(fixture);
assert.equal(stints['1'].length,2);
assert.equal(stints['2'].length,1);
assert.equal(stints['1'].reduce((s,x)=>s+x.minutes,0),12);
assert.equal(stints['2'][0].minutes,12);
assert.ok(stints['1'].some(x=>x.ids.includes('16')));
assert.equal(combineLineupStints([fixture,fixture],'1').length,2);
const broken=structuredClone(fixture);
broken.plays[11].participants=[{athlete:{id:'88'}},{athlete:{id:'99'}}];
broken.plays[11].type.text='Substitution';
assert.deepEqual(firstQuarterStints(broken),{});
console.log('PASS reconstructed Q1 five-man lineups, substitutions, minutes and evidence failure mode');

// Exploratory lineup and possession analysis. Not a fitted NBA model.
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const finite=x=>Number.isFinite(Number(x))?Number(x):null;
const round=(x,d=1)=>Number(x.toFixed(d));
const logit=p=>Math.log(p/(1-p));
const sigmoid=x=>1/(1+Math.exp(-x));
export function playerProfile(games=[]){
  const valid=games.filter(g=>Number.isFinite(g.min)&&g.min>0);
  if(!valid.length)return {sample:0,minutes:0,pts:null,reb:null,ast:null,stl:null,blk:null,to:null,per36:null,defense:null,role:null};
  const sum=k=>valid.reduce((v,g)=>v+(Number(g[k])||0),0);
  const total=valid.reduce((v,g)=>v+g.min,0),played=valid.length;
  const per36=k=>sum(k)/total*36;
  const points=per36('pts'),reb=per36('reb'),ast=per36('ast'),stl=per36('stl'),blk=per36('blk'),turnovers=per36('to');
  // All coefficients are illustrative weights. Stocks and boards are not a causal defender rating.
  const offense=points*.16+ast*.19+reb*.055-turnovers*.13;
  const defense=stl*.75+blk*.65+reb*.07;
  const role=offense+defense*.28;
  return {
    sample:played,minutes:round(total/played),pts:round(sum('pts')/played),reb:round(sum('reb')/played),
    ast:round(sum('ast')/played),stl:round(sum('stl')/played),blk:round(sum('blk')/played),
    to:round(sum('to')/played),
    per36:{pts:round(points),reb:round(reb),ast:round(ast),stl:round(stl),blk:round(blk),to:round(turnovers)},
    offense:round(offense,2),defense:round(defense,2),role:round(role,2)
  };
}
export function gameClock(game){
  const period=finite(game?.period),clock=game?.clock||'';
  if(!period||period<1)return null;
  const parts=String(clock).split(':');
  const sec=parts.length===2?(Number(parts[0])*60+Number(parts[1])):null;
  if(!Number.isFinite(sec)||sec<0)return null;
  if(period<=4)return clamp((4-period)*12+sec/60,0,48);
  return clamp(sec/60,0,5);
}
function dataPlayer(data,side,id){return data?.teams?.[side]?.players?.find(p=>String(p.id)===String(id));}
function strength(data,side,ids){
  const members=ids.map(id=>dataPlayer(data,side,id)).filter(Boolean);
  if(members.length!==5)return null;
  const valid=members.filter(p=>p.profile?.role!=null);
  if(valid.length!==5)return null; // Unknown production must never be silently treated as zero.
  return {value:members.reduce((sum,p)=>sum+p.profile.role,0),
    count:5,missing:0};
}
export function evaluateRotation(data,{homeIds,awayIds,attackerId='',defenderId='',priorHomeWin=null}={}){
  const home=data?.teams?.home,away=data?.teams?.away;
  if(!home||!away)return {available:false,reason:'Both teams are required'};
  const baseH=home.onCourt?.map(p=>p.id)||[],baseA=away.onCourt?.map(p=>p.id)||[];
  const currentH=homeIds||baseH,currentA=awayIds||baseA;
  if(baseH.length!==5||baseA.length!==5||currentH.length!==5||currentA.length!==5)
    return {available:false,reason:'Five players must be available for both teams'};
  const originalH=strength(data,'home',baseH),originalA=strength(data,'away',baseA);
  const updatedH=strength(data,'home',currentH),updatedA=strength(data,'away',currentA);
  if(!originalH||!originalA||!updatedH||!updatedA)return {available:false,reason:'No usable recent player production'};
  const affected=[...new Set([...baseH,...currentH])].filter(id=>baseH.includes(id)!==currentH.includes(id));
  const affectedAway=[...new Set([...baseA,...currentA])].filter(id=>baseA.includes(id)!==currentA.includes(id));
  const changed=affected.length>0||affectedAway.length>0;
  const h=round((updatedH.value-originalH.value)*.48,2);
  const a=round((updatedA.value-originalA.value)*.48,2);
  // A modest scenario-only estimate, not a direct extrapolation of raw plus/minus.
  const rosterShift=clamp(h-a,-8,8);
  const clock=gameClock(data.game);
  const isLive=data.game?.status==='in'&&clock!=null&&data.game?.homeScore!=null&&data.game?.awayScore!=null;
  const isFinal=data.game?.status==='post';
  const prior=finite(priorHomeWin);
  const priorProb=prior!=null&&prior>=1&&prior<=99?prior/100:null;
  if(isFinal)return {available:false,reason:'The game is final; win probability is no longer forecast'};
  const basePrior=priorProb??.5;
  const scoreDiff=isLive?(data.game.homeScore-data.game.awayScore):0;
  // Unvalidated clock-and-score heuristic; do not call this a calibrated live predictor.
  const timeScale=isLive?2.3*Math.sqrt(clock+1):null;
  const baseLogit=logit(basePrior)+(isLive?scoreDiff/timeScale:0);
  let assignment=null,assignmentShift=0;
  if(attackerId&&defenderId){
    const attackerSide=currentH.includes(attackerId)?'home':currentA.includes(attackerId)?'away':null;
    const defenderSide=attackerSide==='home'?'away':attackerSide==='away'?'home':null;
    const opponentOn=defenderSide==='home'?currentH:currentA;
    if(defenderSide&&opponentOn.includes(defenderId)){
      const attacker=dataPlayer(data,attackerSide,attackerId);
      const defender=dataPlayer(data,defenderSide,defenderId);
      const defenseValues=opponentOn.map(id=>dataPlayer(data,defenderSide,id)?.profile?.defense).filter(v=>v!=null);
      const averageDefense=defenseValues.length?defenseValues.reduce((x,y)=>x+y,0)/defenseValues.length:0;
      if(attacker?.profile?.per36?.pts!=null&&defender?.profile?.defense!=null){
        const expected10=attacker.profile.per36.pts/3.6;
        const suppress=clamp((defender.profile.defense-averageDefense)*.07,-.15,.15);
        const relative=clamp(expected10*suppress,-1.5,1.5);
        assignmentShift=attackerSide==='home'?-relative:relative;
        assignment={attacker:attacker.name,defender:defender.name,
          side:attackerSide,expectedPoints10:round(expected10),versusDefender10:round(expected10-relative),
          differential:round(-relative),verifiedAssignment:false};
      }
    }
  }
  const factor=isLive?clamp(Math.sqrt(clock/48),.06,1):1;
  const deltaMargin=(rosterShift+assignmentShift)*factor;
  const scenarioLogit=baseLogit+deltaMargin/8.8;
  const baselineHome=100*sigmoid(baseLogit);
  const scenarioHome=100*sigmoid(scenarioLogit);
  return {available:true,
    baselineHome:round(baselineHome),scenarioHome:round(scenarioHome),
    baselineAway:round(100-baselineHome),scenarioAway:round(100-scenarioHome),
    changeHome:round(scenarioHome-baselineHome,2),
    relativeMargin:round(rosterShift+assignmentShift,2),homeRotationEffect:h,awayRotationEffect:a,
    defensiveMatchup:assignment,
    samples:{home:updatedH.count,away:updatedA.count},
    mode:isLive?'LIVE EXPLORATORY':'PREGAME EXPLORATORY',
    clockRemaining:isLive?round(clock):null,baselineProvided:priorProb!==null,
    changed:changed||Boolean(assignment),
    note:'Exploratory uncalibrated scenario model. Recent per-game production is converted into player-role proxies; substitutes and defender assignments modify relative scoring strength. Live baseline uses score, period and clock, but does not model actual possessions, pace, usage, defensive tracking, or lineup chemistry. Values are not betting odds.'
  };
}

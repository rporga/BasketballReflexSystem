// Historical holdout evaluation for pregame team scoring-form estimates.
const round=(x,n=3)=>Number(x.toFixed(n));
const logistic=x=>1/(1+Math.exp(-x));
const logit=p=>Math.log(p/(1-p));
export function pregameFormProbability(home=[],away=[],homeCourt=1.8){
  if(home.length<5||away.length<5)return null;
  const rating=g=>{
    const h=g.slice(-12),l=g.slice(-5),avg=x=>x.reduce((sum,n)=>sum+n,0)/x.length;
    return (.65*avg(h)+.35*avg(l))*(h.length/(h.length+8));
  };
  const margin=homeCourt+rating(home)-rating(away);
  return logistic(margin/8.8);
}
export function replayResults(games){
  const sorted=games.filter(g=>Number.isFinite(Number(g.homeScore))&&Number.isFinite(Number(g.awayScore))&&g.home!==g.away)
    .slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id)));
  const histories=new Map(),predictions=[];
  for(const game of sorted){
    const h=histories.get(game.home)||[],a=histories.get(game.away)||[];
    const p=pregameFormProbability(h,a);
    if(p!==null)predictions.push({id:game.id,date:game.date,p,outcome:Number(game.homeScore)>Number(game.awayScore)?1:0,home:game.home,away:game.away});
    histories.set(game.home,[...h,Number(game.homeScore)-Number(game.awayScore)].slice(-12));
    histories.set(game.away,[...a,Number(game.awayScore)-Number(game.homeScore)].slice(-12));
  }
  return predictions;
}
export function scorePredictions(samples,{scale=1,bias=0}={}){
  if(!samples.length)return null;
  let brier=0,baseline=0,logloss=0,correct=0;
  const bins=Array.from({length:5},(_,i)=>({min:i*.2,max:(i+1)*.2,n:0,pSum:0,winSum:0}));
  for(const x of samples){
    const p=Math.min(.999,Math.max(.001,logistic(scale*logit(Math.min(.999,Math.max(.001,x.p)))+bias)));
    brier+=(p-x.outcome)**2;baseline+=(.5-x.outcome)**2;
    logloss-=x.outcome*Math.log(p)+(1-x.outcome)*Math.log(1-p);
    if((p>=.5)===(x.outcome===1))correct++;
    const i=Math.min(4,Math.floor(p*5));
    bins[i].n++;bins[i].pSum+=p;bins[i].winSum+=x.outcome;
  }
  return {games:samples.length,brier:round(brier/samples.length),baselineBrier:round(baseline/samples.length),
    logLoss:round(logloss/samples.length),accuracy:round(correct/samples.length),
    bins:bins.map(x=>({range:round(x.min,1)+'-'+round(x.max,1),sample:x.n,
      predicted:x.n?round(x.pSum/x.n):null,observed:x.n?round(x.winSum/x.n):null}))};
}
export function fitTemperature(samples){
  if(samples.length<100)return {available:false,reason:'At least 100 pregame results are required'};
  let best=null;
  for(let i=4;i<=18;i++)for(let b=-6;b<=6;b++){
    const scale=i/10,bias=b/20;
    const score=scorePredictions(samples,{scale,bias});
    if(!best||score.brier<best.brier)best={scale,bias,brier:score.brier};
  }
  return {available:true,...best};
}
export function holdoutValidation(samples){
  const sorted=samples.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const border=Math.floor(sorted.length*.7),train=sorted.slice(0,border),test=sorted.slice(border);
  const fit=fitTemperature(train),raw=scorePredictions(test);
  const tuned=fit.available?scorePredictions(test,fit):null;
  const improves=Boolean(tuned&&raw&&tuned.brier<=raw.brier-.003);
  return {train:train.length,test:test.length,fit,rawHoldout:raw,calibratedHoldout:tuned,
    recommended:improves?{scale:fit.scale,bias:fit.bias}:null};
}

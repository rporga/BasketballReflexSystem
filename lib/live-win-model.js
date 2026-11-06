// Experimental score-and-clock game-state estimate for on-screen exploration.
// NOT trained, calibrated, or suitable as betting or financial odds.
// The user's team's prior is a separate pregame historical heuristic.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const logistic=x=>1/(1+Math.exp(-x));
const logit=p=>Math.log(p/(1-p));
export function minutesRemaining(period,clock){
  const q=Number(period);
  if(!Number.isInteger(q)||q<1||q>20)return null;
  const text=String(clock??'').trim();
  const match=text.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?$/);
  if(!match)return null;
  const sec=Number(match[1])*60+Number(match[2])+(match[3]?Number('0.'+match[3]):0);
  if(!Number.isFinite(sec)||sec<0||sec>(q<=4?12:5)*60)return null;
  return q<=4?(4-q)*12+sec/60:sec/60;
}
export function liveWinEstimate(game,priorHomePercent=null){
  if(!game)return {kind:'unavailable',reason:'No selected game'};
  const status=String(game.status||'');
  const homeScore=game.home?.score,awayScore=game.away?.score;
  const scoreValid=homeScore!=null&&awayScore!=null&&Number.isFinite(Number(homeScore))&&Number.isFinite(Number(awayScore));
  const priorValid=priorHomePercent!=null&&Number.isFinite(Number(priorHomePercent))&&Number(priorHomePercent)>0&&Number(priorHomePercent)<100;
  const prior=priorValid?clamp(Number(priorHomePercent)/100,.02,.98):.5;
  if(status==='post')return {kind:'final',homeScore,awayScore,winner:scoreValid?Math.sign(Number(homeScore)-Number(awayScore)):null};
  if(status!=='in')return {kind:'pregame',homePct:priorValid?+(prior*100).toFixed(1):null,hasPrior:priorValid};
  const clock=minutesRemaining(game.period,game.clock);
  if(!scoreValid||clock==null)return {kind:'unavailable',reason:'Live scores, period and game clock are needed for an in-game estimate'};
  const diff=Number(homeScore)-Number(awayScore);
  // With less time remaining, the observed lead carries progressively more weight.
  // The pregame prior fades as the game advances. Constants are illustrative only.
  const priorWeight=Math.sqrt(clamp(clock/48,0,1));
  const scoringScale=2.8*Math.sqrt(clock+1);
  const homePct=+(100*logistic(priorWeight*logit(prior)+diff/scoringScale)).toFixed(1);
  return {kind:'live',homePct,awayPct:+(100-homePct).toFixed(1),
    minutesLeft:+clock.toFixed(2),period:Number(game.period),margin:diff,hasPrior:priorValid,
    source:'Experimental live score-and-clock heuristic, not a calibrated probability'};
}

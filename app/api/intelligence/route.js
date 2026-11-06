import { NextResponse } from 'next/server';
import { parseGamelog, aggregate } from '../../../lib/prop-analytics.js';
import { officialGameOutcome } from '../../../lib/game-outcome.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const ATHLETE = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
const HOURS = 1000 * 60 * 60;
const n = x => { const v = x && typeof x === 'object' ? (x.value ?? x.displayValue) : x; return v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v); };
const round = (x,d=1) => Number(x.toFixed(d));
const text = value => typeof value === 'string' ? value : '';
const avg = vals => vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : null;
const statusKey = value => text(value).toLowerCase().replace(/[^a-z]/g,'');
const teamIdValid = x => /^\d{1,5}$/.test(x);
const seasonYear = () => { const date=new Date(); return date.getUTCFullYear()+(date.getUTCMonth()>=6?1:0); };
const dateET = date => {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date(date));
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value])); return p.year+p.month+p.day;
};
async function get(url,ttl=300) {
  const response=await fetch(url,{headers:{Accept:'application/json'},next:{revalidate:ttl},signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw new Error('ESPN API '+response.status);
  return response.json();
}
function gameSet(raw,teamId) {
  const competition=raw?.competitions?.[0];
  if(!competition?.status?.type?.completed)return null;
  const me=competition.competitors?.find(c=>String(c.team?.id)===teamId);
  const opp=competition.competitors?.find(c=>c!==me);
  if(!me||!opp)return null;
  return {id:String(raw.id), date:raw.date, opponent:text(opp.team?.abbreviation), opponentName:text(opp.team?.displayName), home:me.homeAway==='home'};
}
function scoreboardLine(board,gameInfo,teamId) {
  const e=board?.events?.find(g=>String(g.id)===gameInfo.id);
  const comp=e?.competitions?.[0];
  if(!comp)return null;
  const own=comp.competitors?.find(c=>String(c.team?.id)===teamId);
  const other=comp.competitors?.find(c=>c!==own);
  if(!own||!other||!own.linescores||!other.linescores)return null;
  const extract=c=>[1,2,3,4].map(q=>n(c.linescores.find(l=>Number(l.period)===q)?.value));
  const q=extract(own),opp=extract(other);
  if(q.some(v=>v===null)||opp.some(v=>v===null))return null;
  const outcome=officialGameOutcome(q,opp,n(own.score),n(other.score));
  return outcome?{...gameInfo,for:q,against:opp,...outcome}:null;
}
async function recentGames(teamId) {
  const schedule=await get(ESPN+'/teams/'+teamId+'/schedule?seasontype=2',300);
  const events=(schedule.events || []).map(x=>gameSet(x,teamId)).filter(Boolean)
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12);
  const dates=[...new Set(events.map(g=>dateET(g.date)))];
  const boards=new Map();
  for(let p=0;p<dates.length;p+=6) {
    const chunk=dates.slice(p,p+6);
    const results=await Promise.allSettled(chunk.map(d=>get(ESPN+'/scoreboard?dates='+d+'&limit=100',300)));
    results.forEach((res,i)=>{if(res.status==='fulfilled')boards.set(chunk[i],res.value);});
  }
  return events.map(e=>scoreboardLine(boards.get(dateET(e.date)),e,teamId)).filter(Boolean);
}
function stat(games) {
  if(!games.length)return null;
  const last5=games.slice(0,5);
  const summary=sample=>({n:sample.length,wins:sample.filter(g=>g.won).length,ppg:round(avg(sample.map(g=>g.scored))),allowed:round(avg(sample.map(g=>g.allowed))),net:round(avg(sample.map(g=>g.margin)))});
  const quarters=[0,1,2,3].map(i=>{
    const scored=avg(games.map(g=>g.for[i]));
    const allowed=avg(games.map(g=>g.against[i]));
    const margin=avg(games.map(g=>g.for[i]-g.against[i]));
    return {quarter:i+1,scored:round(scored),allowed:round(allowed),margin:round(margin),winningQuarters:games.filter(g=>g.for[i]>g.against[i]).length,tiedQuarters:games.filter(g=>g.for[i]===g.against[i]).length};
  });
  const before=avg(games.map(g=>g.firstHalf));
  const after=avg(games.map(g=>g.secondHalf));
  const trailing=games.filter(g=>g.firstHalf<0);
  return {sample:games.length,last5:summary(last5),last12:summary(games),quarters,
    bestQuarter:[...quarters].sort((a,b)=>b.margin-a.margin)[0].quarter,
    worstQuarter:[...quarters].sort((a,b)=>a.margin-b.margin)[0].quarter,
    half:{firstNet:round(before),secondNet:round(after),halfTimeRecovery:round(after-before),comebacks:trailing.filter(g=>g.won).length,trailingAtHalf:trailing.length},
    q3Change:round(quarters[2].scored-quarters[1].scored),
    q4Change:round(quarters[3].scored-quarters[2].scored),
    fourthWins:quarters[3].winningQuarters,
    missingQuarters:0
  };
}
function observations(name,m) {
  if(!m)return [];
  const q=m.quarters;
  const qBest=q[m.bestQuarter-1],qWorst=q[m.worstQuarter-1];
  const words=[];
  words.push(name+' has its strongest scoring margin in Q'+m.bestQuarter+' ('+(qBest.margin>=0?'+':'')+qBest.margin.toFixed(1)+' points per quarter) across '+m.sample+' tracked games.');
  words.push('Q3 scoring '+(m.q3Change>=0?'rises':'falls')+' '+Math.abs(m.q3Change).toFixed(1)+' points from Q2 on average; Q4 scoring '+(m.q4Change>=0?'rises':'falls')+' '+Math.abs(m.q4Change).toFixed(1)+' points versus Q3.');
  words.push('Q4: '+q[3].scored.toFixed(1)+' scored / '+q[3].allowed.toFixed(1)+' allowed, '+m.fourthWins+' winning quarters out of '+m.sample+' games.');
  words.push('Halftime pattern: second-half margin '+(m.half.secondNet>=0?'+':'')+m.half.secondNet.toFixed(1)+' vs first-half '+(m.half.firstNet>=0?'+':'')+m.half.firstNet.toFixed(1)+'.');
  if(m.half.trailingAtHalf)words.push('Comebacks: '+m.half.comebacks+' wins in '+m.half.trailingAtHalf+' games when behind at halftime.');
  words.push('Most difficult quarter by scoring differential: Q'+m.worstQuarter+' ('+(qWorst.margin>=0?'+':'')+qWorst.margin.toFixed(1)+').');
  return words;
}
function injuryAthleteId(athlete) {
  if(!athlete)return '';
  const candidates=[athlete.id,athlete.uid?.match(/~a:(\d+)/)?.[1],athlete.$ref?.match(/athletes\/(\d+)/)?.[1]];
  for (const link of athlete.links||[]) {
    const href=link.href||'';
    candidates.push(href.match(/\/id\/(\d+)(?:\/|$)/)?.[1]);
    candidates.push(href.match(/~a:(\d+)/)?.[1]);
  }
  return String(candidates.find(value=>/^\d{1,12}$/.test(String(value||'')))||'');
}
function normalizedInjuries(raw,teamId) {
  const bucket=(raw.injuries||[]).find(x=>String(x.id)===teamId);
  return (bucket?.injuries||[]).map(i=>({
    id:injuryAthleteId(i.athlete),name:text(i.athlete?.displayName),status:text(i.status),
    detail:text(i.shortComment),date:text(i.date),injury:text(i.type?.description || i.details?.type || '')
  })).filter(i=>i.name);
}
async function playerForm(id) {
  if(!/^\d{1,12}$/.test(id))return null;
  try {
    const year=seasonYear();
    const body=await get(ATHLETE+'/athletes/'+id+'/gamelog?season='+year+'&seasontype=2',900);
    const games=parseGamelog(body,year);
    if(games.length<2)return null;
    const ppg=aggregate(games,'PTS',52).mean;
    const minutes=aggregate(games,'MIN',52).mean;
    // Season-restricted game logs only. Never substitute career-level totals.
    if(ppg==null||minutes==null||minutes<=0)return null;
    return {ppg,minutes,latestPlayed:games[0].date,gameCount:games.length};
  } catch {return null;}
}
const relevance={out:1,doubtful:.8,questionable:.4,daytoday:.35,probable:.1};
async function injuryReport(raw,id,teamGames=[]) {
  const entries=normalizedInjuries(raw,id);
  const current=entries.filter(x=>relevance[statusKey(x.status)]!==undefined);
  const scored=await Promise.all(current.slice(0,12).map(async x=>{
    const hrs=x.date?(Date.now()-new Date(x.date).getTime())/HOURS:null;
    const form=await playerForm(x.id);
    const ppg=form?.ppg??null;
    const weight=relevance[statusKey(x.status)] || 0;
    const recordedAt=x.date?Date.parse(x.date):NaN;
    const lastPlayed=form?.latestPlayed?Date.parse(form.latestPlayed):NaN;
    // A player who has appeared since the reported injury should not be subtracted.
    const superseded=Number.isFinite(recordedAt)&&Number.isFinite(lastPlayed)&&lastPlayed>recordedAt+6*HOURS;
    // Still-listed OUT players remain relevant after 72 hours; recheck game log for returns.
    // Questionable/probable statuses must be recently updated.
    const stillOut=statusKey(x.status)==='out'&&hrs!==null&&hrs>=-6;
    const fresh=hrs!==null&&hrs>=-6&&hrs<=72;
    const validStatus=(stillOut||fresh)&&!superseded;
    // The team form already includes an absence if the player missed the entire recent window.
    // Only apply an additional absence penalty to someone who appeared during the last five team games.
    const windowStart=teamGames[Math.min(4,teamGames.length-1)]?.date;
    const previouslyContributing=Boolean(windowStart&&Number.isFinite(lastPlayed)&&lastPlayed>=Date.parse(windowStart));
    const includedInEstimate=validStatus&&previouslyContributing&&form!==null&&weight>0;
    // Estimated impact has a minutes component and is capped; this is not a causal on/off value.
    const availability=Math.min(1,Math.max(0,(form?.minutes??0)/30));
    const adjustment=includedInEstimate?Math.min(3.5,ppg*.20*weight*availability):null;
    return {...x,ppg,seasonGames:form?.gameCount??0,reportAgeHours:hrs===null?null:round(hrs),
      superseded,previouslyContributing,includedInEstimate,estimatedPoints:adjustment===null?null:round(adjustment,2)};
  }));
  const scoredNames=new Set(scored.map(x=>x.name));
  const unscored=entries.filter(x=>!scoredNames.has(x.name)).map(x=>({...x,ppg:null,estimatedPoints:null,includedInEstimate:false,reportAgeHours:null}));
  const players=[...scored,...unscored];
  const quantified=scored.filter(x=>x.includedInEstimate).length;
  const unknown=scored.filter(x=>!x.includedInEstimate).length;
  return {players,reportCount:players.length,quantified,unquantified:unknown,
    totalAdjustment:quantified===0&&current.length>0?null:round(Math.min(7,scored.reduce((acc,x)=>acc+(x.estimatedPoints??0),0)),2),reportSource:'ESPN public injuries',assumption:'Status weights: Out 100%, Doubtful 80%, Questionable 40%, Day-to-day 35%, Probable 10%; uses 20% of player season PPG (max 3.5 points per player, 7 total). Long-term OUT statuses stay eligible unless game logs show the player returned; other statuses require updates within 72 hours. Current-season game logs, minutes, and an appearance within the last five team games are required to reduce double-counting absences already embedded in team form. This is a heuristic, not a measured on/off model.'};
}
function probability(h,a,hi,ai) {
  if(!h||!a)return null;
  // Shrinks observed net-margin signals in small samples, without claiming calibration.
  function rating(m) {
    const base=.65*m.last12.net+.35*m.last5.net;
    return base*(m.sample/(m.sample+8));
  }
  const baseline=1.8+rating(h)-rating(a);
  const adjusted=baseline-(hi.totalAdjustment??0)+(ai.totalAdjustment??0);
  const p=1/(1+Math.exp(-adjusted/8.8));
  const rawP=1/(1+Math.exp(-baseline/8.8));
  return {homeWin:round(p*100,1),awayWin:round(100-p*100,1),
    withoutInjuries:round(rawP*100,1),injuryShift:round((p-rawP)*100,1),
    projectedMargin:round(adjusted),homeAdvantage:1.8,
    homeFormRating:round(rating(h)),awayFormRating:round(rating(a)),
    homeInjuryPoints:hi.totalAdjustment,awayInjuryPoints:ai.totalAdjustment,
    grade:Math.min(h.sample,a.sample)<5?'VERY LIMITED SAMPLE':Math.min(h.sample,a.sample)<10?'EARLY SEASON SAMPLE':'EXPLORATORY MODEL',
    methodology:'Illustrative, uncalibrated logistic estimate using a shrinkage-weighted blend of last-12 and last-5 net scoring margin, a fixed 1.8-point home advantage, and heuristic player availability deductions. Not validated through historical backtesting. Not in-game win probability or a betting recommendation.'};
}
function insights(home,away,mh,ma,prob,hi,ai) {
  const messages=[];
  if(!prob)return ['Not enough complete quarter-by-quarter games to estimate this matchup responsibly.'];
  messages.push((prob.homeWin>=50?home:away)+' is favoured at '+Math.max(prob.homeWin,prob.awayWin).toFixed(1)+'% in this *uncalibrated* pregame estimate, based on scoring form and reported availability.');
  if(mh&&ma){
    const diff=round(mh.quarters[2].margin-ma.quarters[2].margin);
    messages.push('Third-quarter matchup edge: '+(diff>=0?home:away)+' by '+Math.abs(diff).toFixed(1)+' average Q3 margin points based on the tracked samples.');
    const fourth=round(mh.quarters[3].margin-ma.quarters[3].margin);
    messages.push('Fourth-quarter matchup edge: '+(fourth>=0?home:away)+' by '+Math.abs(fourth).toFixed(1)+' average Q4 margin points.');
    messages.push('Halftime adjustment: '+home+' changes its scoring margin '+(mh.half.halfTimeRecovery>=0?'+':'')+mh.half.halfTimeRecovery.toFixed(1)+' from H1 to H2; '+away+' changes '+(ma.half.halfTimeRecovery>=0?'+':'')+ma.half.halfTimeRecovery.toFixed(1)+'.');
  }
  messages.push('Estimated injury adjustment: '+home+' '+(hi.totalAdjustment===null?'not quantified':'−'+hi.totalAdjustment+' pts')+', '+away+' '+(ai.totalAdjustment===null?'not quantified':'−'+ai.totalAdjustment+' pts')+'. Only recently updated player reports with available season PPG affect this estimate.');
  return messages;
}
function sendError(message,status=502){return NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}
export async function GET(request) {
  const q=new URL(request.url).searchParams;
  const home=q.get('home') || '',away=q.get('away') || '';
  if(!teamIdValid(home)||!teamIdValid(away)||home===away)return sendError('Select two different valid ESPN team IDs.',400);
  try {
    const [gamesH,gamesA,report]=await Promise.all([recentGames(home),recentGames(away),get(ESPN+'/injuries',120)]);
    const [hi,ai]=await Promise.all([injuryReport(report,home,gamesH),injuryReport(report,away,gamesA)]);
    const h=stat(gamesH),a=stat(gamesA);
    const prediction=probability(h,a,hi,ai);
    const nameH=text((report.injuries||[]).find(x=>String(x.id)===home)?.displayName)||'Home';
    const nameA=text((report.injuries||[]).find(x=>String(x.id)===away)?.displayName)||'Away';
    const reportDate=text(report.timestamp || report.date) || null;
    return NextResponse.json({
      teams:{home:{id:home,name:nameH,metrics:h,findings:observations(nameH,h),games:gamesH},
             away:{id:away,name:nameA,metrics:a,findings:observations(nameA,a),games:gamesA}},
      injuryReports:{home:hi,away:ai,asOf:reportDate},
      prediction,
      insights:insights(nameH,nameA,h,a,prediction,hi,ai),
      dataProvenance:{source:'ESPN unofficial NBA public JSON feeds',season:seasonYear(),method:'completed current-season regular-season games, latest 12 per team; quarter data from dated scoreboards',note:'An analytical rules engine, not an LLM; probability is heuristic and uncalibrated. Absences and status may change before tip-off.'},
      fetchedAt:new Date().toISOString()
    },{headers:{'Cache-Control':'public, s-maxage=120, stale-while-revalidate=90'}});
  } catch(e) {
    console.error('NBA intelligence error',e?.message);
    return sendError('Insufficient NBA provider coverage right now. Analysis is unavailable rather than using simulated statistics.');
  }
}

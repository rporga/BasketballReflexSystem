import { NextResponse } from 'next/server';
import { sourceWinProbability } from '../../../lib/espn-live.js';

const ROOT = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const PLAYER_ROOT = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const str = value => value == null ? '' : String(value);
const numeric = value => { const v = value && typeof value === 'object' ? (value.value ?? value.displayValue ?? null) : value; return v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v); };
const safe = value => typeof value === 'string' ? value : '';

async function request(url, seconds) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: seconds },
    signal: AbortSignal.timeout(9500)
  });
  if (!response.ok) throw new Error('Upstream sports API returned ' + response.status);
  return response.json();
}
function normalizeTeam(value) {
  if (!value) return null;
  const t = value.team || value;
  return {
    id: str(t.id),
    name: safe(t.displayName || [t.location,t.name].filter(Boolean).join(' ')),
    abbreviation: safe(t.abbreviation || t.shortDisplayName || t.name),
    logo: t.logo || t.logos?.[0]?.href || null,
    record: value.records?.find(x => x.type === 'total')?.summary || value.records?.[0]?.summary || '',
    score: numeric(value.score),
    linescores: (value.linescores || []).map(x => numeric(x.value ?? x.displayValue ?? x.score)),
    homeAway: value.homeAway || ''
  };
}
function currentDate() {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'})
    .formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type,x.value]));
  return p.year+p.month+p.day;
}
function validDate(d) {
  if (!/^20\d{6}$/.test(d)) return false;
  const iso = d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8);
  return !Number.isNaN(Date.parse(iso)) && new Date(iso+'T00:00:00Z').toISOString().slice(0,10) === iso;
}
async function teams() {
  const raw = await request(ROOT+'/teams?limit=50',3600);
  return {teams:(raw.sports?.[0]?.leagues?.[0]?.teams || [])
    .map(x => normalizeTeam(x.team)).filter(t => t?.id && t.name)
    .sort((a,b)=>a.name.localeCompare(b.name))};
}
async function scoreboard(date) {
  const data=await request(ROOT+'/scoreboard?dates='+date+'&limit=100',5);
  const games=(data.events || []).map(e => {
    const c=e.competitions?.[0] || {};
    const sides=c.competitors || [];
    return {
      id:str(e.id), start:e.date || c.date || null,
      status:safe(e.status?.type?.state || c.status?.type?.state || 'pre'),
      statusName:safe(e.status?.type?.shortDetail || e.status?.type?.detail || e.status?.type?.description || ''),
      period:numeric(e.status?.period), clock:safe(e.status?.displayClock),
      home:normalizeTeam(sides.find(x=>x.homeAway==='home')),
      away:normalizeTeam(sides.find(x=>x.homeAway==='away')),
      venue:safe(c.venue?.fullName || '')
    };
  }).filter(g=>g.id && g.home && g.away);
  return {date,games};
}
async function game(id) {
  const data=await request(ROOT+'/summary?event='+id,5);
  return {
    id,
    start:data.header?.competitions?.[0]?.date||data.header?.competitions?.[0]?.startDate||data.header?.date||null,
    winProbability:sourceWinProbability(data),
    players:(data.boxscore?.players || []).map(group => {
      const block=group.statistics?.[0] || {};
      const columns=block.labels || [];
      return {team:normalizeTeam(group.team),columns,rows:(block.athletes || []).map(row=>{
        const athlete=row.athlete || {};
        const stats={};
        columns.forEach((label,i)=>{stats[label]=str((row.stats || [])[i] ?? '—');});
        return {id:str(athlete.id),name:safe(athlete.displayName || athlete.fullName),position:safe(athlete.position?.abbreviation),jersey:safe(athlete.jersey),stats,didNotPlay:!!row.didNotPlay};
      })};
    }),
    teamStats:(data.boxscore?.teams || []).map(group=>({
      team:normalizeTeam(group.team),
      stats:(group.statistics || []).map(s=>({label:s.label || s.name,value:str(s.displayValue ?? s.value)}))
    }))
  };
}
async function roster(id) {
  const data=await request(ROOT+'/teams/'+id+'/roster',1800);
  const entries=(data.athletes || data.team?.athletes || []).flatMap(x=>Array.isArray(x.items)?x.items:Array.isArray(x.athletes)?x.athletes:[x]);
  return {team:normalizeTeam(data.team),players:entries.map(p=>({
    id:str(p.id),name:safe(p.displayName || p.fullName),jersey:safe(p.jersey),
    position:safe(p.position?.abbreviation),headshot:p.headshot?.href || null,
    age:numeric(p.age),height:safe(p.displayHeight)
  })).filter(p=>p.id && p.name)};
}
async function player(id,season) {
  const raw=await request(PLAYER_ROOT+'/athletes/'+id+'/stats?season='+season+'&seasontype=2',900);
  const groups=[];
  function collect(obj,depth=0) {
    if (!obj || typeof obj!=='object' || depth>6) return;
    if (Array.isArray(obj.labels)) {
      ['averages','totals','stats'].forEach(key=>{
        const values=obj[key];
        if(Array.isArray(values) && values.length && !Array.isArray(values[0]) && typeof values[0]!=='object') {
          groups.push({title:safe(obj.displayName || obj.name || key),kind:safe(obj.name || key),
            stats:obj.labels.map((label,i)=>({label:str(label),value:str(values[i]??'—')}))});
        }
      });
    }
    Object.values(obj).forEach(v=>{
      if(Array.isArray(v)) v.slice(0,30).forEach(item=>collect(item,depth+1));
      else if(v && typeof v==='object') collect(v,depth+1);
    });
  }
  collect(raw);
  return {id,season,groups:groups.slice(0,12)};
}
async function form(id) {
  const data=await request(ROOT+'/teams/'+id+'/schedule?seasontype=2',300);
  const results=(data.events || []).map(e=>{
    const c=e.competitions?.[0] || {};
    const participants=c.competitors || [];
    const me=participants.find(x=>str(x.team?.id)===id || safe(x.team?.abbreviation).toLowerCase()===id.toLowerCase());
    const opp=participants.find(x=>x!==me);
    if(!me || !opp || !(e.status?.type?.completed || c.status?.type?.completed)) return null;
    const scored=numeric(me.score),allowed=numeric(opp.score);
    if(scored===null || allowed===null) return null;
    return {date:e.date,opponent:safe(opp.team?.abbreviation),home:me.homeAway==='home',
      scored,allowed,won:scored>allowed};
  }).filter(Boolean).sort((a,b)=>str(b.date).localeCompare(str(a.date))).slice(0,10);
  function aggregate(items) {
    if(!items.length) return null;
    return {games:items.length,wins:items.filter(x=>x.won).length,
      ppg:+(items.reduce((sum,x)=>sum+x.scored,0)/items.length).toFixed(1),
      oppg:+(items.reduce((sum,x)=>sum+x.allowed,0)/items.length).toFixed(1)};
  }
  return {id,results,last5:aggregate(results.slice(0,5)),last10:aggregate(results)};
}
function fail(message, status) {
  return NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
}
export async function GET(request) {
  const q=new URL(request.url).searchParams;
  const view=q.get('view') || 'scoreboard';
  let data, ttl=30;
  try {
    if(view==='scoreboard') {
      const date=q.get('date') || currentDate();
      if(!validDate(date)) return fail('Invalid date. Expected YYYYMMDD.',400);
      data=await scoreboard(date); ttl=5;
    } else if(view==='teams') { data=await teams(); ttl=3600; }
    else if(view==='game') {
      const id=q.get('id') || '';
      if(!/^\d{8,12}$/.test(id)) return fail('Invalid game ID.',400);
      data=await game(id); ttl=5;
    } else if(view==='roster' || view==='form') {
      const id=q.get('team') || '';
      if(!/^[a-zA-Z0-9]{1,8}$/.test(id)) return fail('Invalid team ID.',400);
      data=view==='roster'?await roster(id):await form(id); ttl=view==='roster'?1800:300;
    } else if(view==='player') {
      const id=q.get('id') || '';
      if(!/^\d{1,12}$/.test(id)) return fail('Invalid player ID.',400);
      const now=new Date(),season=now.getUTCMonth()>=6?now.getUTCFullYear()+1:now.getUTCFullYear();
      data=await player(id,season); ttl=900;
    } else return fail('Unknown view.',400);
    return NextResponse.json({...data,fetchedAt:new Date().toISOString(),provider:'ESPN unofficial public feeds'},
      {headers:{'Cache-Control':'public, s-maxage='+ttl+', stale-while-revalidate='+Math.min(5,ttl)}});
  } catch(e) {
    console.error('NBA provider request failed for',view,e?.message);
    return fail('Sports data is temporarily unavailable. Retry shortly; demonstration numbers will not be substituted.',502);
  }
}

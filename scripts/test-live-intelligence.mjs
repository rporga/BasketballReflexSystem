const url='https://basketballreflexsystem.vercel.app/api/intelligence?home=2&away=13';
let succeeded=false;
for(let attempt=1;attempt<=3;attempt++){
  try{
    const response=await fetch(url,{headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(60000)});
    const raw=await response.text();
    let body;try{body=JSON.parse(raw)}catch{throw new Error('Response was not JSON ('+response.status+'): '+raw.slice(0,180))}
    console.log('Production intelligence attempt',attempt,'HTTP',response.status,'date',body.fetchedAt,'error',body.error);
    if(response.ok&&body.teams?.home?.metrics&&body.teams?.away?.metrics&&body.prediction){
      console.log('PASS '+JSON.stringify({homeGames:body.teams.home.metrics.sample,awayGames:body.teams.away.metrics.sample,
        homeWin:body.prediction.homeWin,injuriesHome:body.injuryReports?.home?.reportCount,
        injuriesAway:body.injuryReports?.away?.reportCount,
        homeQuarters:body.teams.home.metrics.quarters?.length,
        awayQuarters:body.teams.away.metrics.quarters?.length,
        insights:body.insights?.length}));
      succeeded=true;break;
    }
    console.log('Response preview',raw.slice(0,380));
  }catch(e){console.log('Attempt failed:',e.message)}
  if(attempt<3)await new Promise(r=>setTimeout(r,3500));
}
if(!succeeded)throw new Error('Production intelligence endpoint did not return an injury-aware matchup report');

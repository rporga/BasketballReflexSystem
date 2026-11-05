const ROOT='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const response=await fetch(ROOT+'/injuries',{signal:AbortSignal.timeout(15000)});
console.log('League injuries status',response.status);
if(!response.ok) throw new Error('Injuries endpoint inaccessible');
const raw=await response.json();
console.log('Root keys',Object.keys(raw));
console.log('Injury sample',JSON.stringify((raw.injuries||[]).slice(0,3)).slice(0,3400));
const t=await fetch(ROOT+'/teams/2/injuries',{signal:AbortSignal.timeout(15000)});
console.log('Team injuries status',t.status);
if(t.ok){const body=await t.json();console.log('Team injuries keys',Object.keys(body));console.log('Team sample',JSON.stringify((body.injuries||[]).slice(0,4)).slice(0,2200));}
if(!Array.isArray(raw.injuries))throw new Error('Unexpected injury structure');

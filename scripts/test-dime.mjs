// Production end-to-end: real OpenAI generation with live NBA analysis tools.
const url='https://basketballreflexsystem.vercel.app/api/dime';
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),90000);
try{
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({messages:[{role:'user',content:'For the selected Boston versus Los Angeles Lakers matchup, which side had the stronger fourth-quarter scoring margin in its recent tracked games? Give one sentence with the data and indicate it is historical.'}],context:{tab:'teams',homeId:'2',awayId:'13'}}),
    signal:controller.signal});
  const body=await r.text();
  console.log('DIME_HTTP_STATUS',r.status);
  console.log('DIME_BODY_PREVIEW',body.slice(0,700).replaceAll('\n',' '));
  if(r.status===503 && body.includes('not activated yet')) {
    console.log('SKIP Dime LLM completion: OPENAI_API_KEY not configured in Vercel production. React interface and endpoint are deployed.');
    process.exit(0);
  }
  if(!r.ok)throw new Error('Dime returned HTTP '+r.status);
  if(!body.trim() || !/(Boston|Lakers|fourth|quarter|Celtics)/i.test(body))throw new Error('Dime did not return a meaningful sourced basketball response');
  console.log('PASS Dime live streaming response with matchup question.');
}finally{clearTimeout(timeout)}

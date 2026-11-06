// NBA game outcome and period reconciliation.
// Regulation quarters are descriptive; game result and net margin always use final scoring.
const number=v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v);
export function officialGameOutcome(quartersFor,quartersAgainst,officialFor,officialAgainst){
 if(!Array.isArray(quartersFor)||!Array.isArray(quartersAgainst)||quartersFor.length<4||quartersAgainst.length<4)return null;
 const qFor=quartersFor.slice(0,4).map(number),qAgainst=quartersAgainst.slice(0,4).map(number);
 const forFinal=number(officialFor),againstFinal=number(officialAgainst);
 if([...qFor,...qAgainst,forFinal,againstFinal].some(x=>x===null))return null;
 const regulationFor=qFor.reduce((a,b)=>a+b,0),regulationAgainst=qAgainst.reduce((a,b)=>a+b,0);
 const otFor=forFinal-regulationFor,otAgainst=againstFinal-regulationAgainst;
 if(otFor<0||otAgainst<0)return null; // Period and final sources are inconsistent.
 return {scored:forFinal,allowed:againstFinal,regulationFor,regulationAgainst,
  overtime:otFor>0||otAgainst>0,otFor,otAgainst,won:forFinal>againstFinal,margin:forFinal-againstFinal,
  firstHalf:qFor[0]+qFor[1]-qAgainst[0]-qAgainst[1],
  secondHalf:qFor[2]+qFor[3]-qAgainst[2]-qAgainst[3]};
}

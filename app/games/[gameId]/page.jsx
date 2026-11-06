import {notFound} from 'next/navigation';
import PickRollApp from '../../page';
export const dynamic='force-dynamic';
const site='https://basketballreflexsystem.vercel.app';
export async function generateMetadata({params}){
  const {gameId}=await params;
  if(!/^\d{8,12}$/.test(gameId))return {title:'NBA Game | Pick & Roll',robots:{index:false}};
  let title='NBA Game '+gameId,description='Live NBA game boxscore, quarter-by-quarter scoring, win probabilities, and rotation analysis on Pick & Roll.';
  try{
    const resp=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event='+gameId,
      {next:{revalidate:300},signal:AbortSignal.timeout(4500)});
    if(resp.ok){
      const obj=await resp.json(),c=obj.header?.competitions?.[0]?.competitors||[];
      const home=c.find(x=>x.homeAway==='home')?.team?.displayName;
      const away=c.find(x=>x.homeAway==='away')?.team?.displayName;
      if(home&&away){title=away+' at '+home;description='NBA game intelligence for '+away+' at '+home+
        ': scores, game stats, quarter-by-quarter form and lineup analysis on Pick & Roll.';}
    }
  }catch{}
  return {title,description,alternates:{canonical:'/games/'+gameId},
    openGraph:{title:title+' | Pick & Roll',description,url:site+'/games/'+gameId}};
}
export default async function GameDetailPage({params}){
  const {gameId}=await params;
  if(!/^\d{8,12}$/.test(gameId))notFound();
  return <PickRollApp/>;
}

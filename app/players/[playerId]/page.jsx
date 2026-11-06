import {notFound} from 'next/navigation';
import PickRollApp from '../../page';
export const dynamic='force-dynamic';
const site='https://basketballreflexsystem.vercel.app';
export async function generateMetadata({params}){
  const {playerId}=await params;
  if(!/^\d{1,12}$/.test(playerId))return {title:'NBA Player | Pick & Roll',robots:{index:false}};
  let title='NBA Player '+playerId;
  let description='NBA player statistics, recent form, boxscores, plus/minus, prop trends and matchup analysis in Pick & Roll.';
  try{
    const resp=await fetch('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/'+playerId,
      {next:{revalidate:86400},signal:AbortSignal.timeout(4500)});
    if(resp.ok){
      const obj=await resp.json(),name=obj.athlete?.displayName||obj.athlete?.fullName||obj.displayName;
      if(name&&typeof name==='string'){title=name+' Stats & Player Intelligence';
        description='Explore '+name+' NBA stats, game logs, recent form, scoring efficiency, player prop trends and matchup context in Pick & Roll.';}
    }
  }catch{}
  return {title,description,alternates:{canonical:'/players/'+playerId},
    openGraph:{title:title+' | Pick & Roll',description,url:site+'/players/'+playerId}};
}
export default async function PlayerDetailPage({params}){
  const {playerId}=await params;
  if(!/^\d{1,12}$/.test(playerId))notFound();
  return <PickRollApp/>;
}

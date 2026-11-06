import {notFound} from 'next/navigation';
import PickRollApp from '../../page';
export const dynamic='force-dynamic';
const site='https://basketballreflexsystem.vercel.app';
export async function generateMetadata({params}){
  const {slug}=await params;
  const teams=slug.match(/^([a-z]{2,5})-vs-([a-z]{2,5})$/);
  if(!teams||teams[1]===teams[2])return {title:'NBA Matchup | Pick & Roll',robots:{index:false}};
  const home=teams[1].toUpperCase(),away=teams[2].toUpperCase();
  const title=home+' vs '+away+' NBA Matchup';
  const description='Compare '+home+' and '+away+' using NBA recent form, quarter splits, lineup rotations and matchup intelligence on Pick & Roll.';
  return {title,description,alternates:{canonical:'/matchups/'+slug},
    openGraph:{title:title+' | Pick & Roll',description,url:site+'/matchups/'+slug}};
}
export default async function MatchupDetailPage({params}){
  const {slug}=await params;
  const parts=slug.match(/^([a-z]{2,5})-vs-([a-z]{2,5})$/);
  if(!parts||parts[1]===parts[2])notFound();
  return <PickRollApp/>;
}

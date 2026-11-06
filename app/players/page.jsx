import PickRollApp from '../page';
export const metadata = {
  title: 'NBA Player Explorer',
  description: 'Research NBA player stats, recent form, game logs, plus/minus, player prop trends and matchup context in Pick & Roll.',
  alternates: { canonical: '/players' }
};
export default function PlayersIndex(){return <PickRollApp/>;}

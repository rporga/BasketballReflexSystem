import PickRollApp from '../page';
export const metadata = {
  title: 'Live NBA Games',
  description: 'Follow live NBA scores, quarter breakdowns, matchup intelligence, rotations and player boxscores with Pick & Roll.',
  alternates: { canonical: '/' }
};
export default function GamesIndex(){return <PickRollApp/>;}

import PickRollApp from '../page';
export const metadata = {
  title: 'NBA Matchup Lab',
  description: 'Compare NBA teams using recent scoring trends, quarter performance, availability and lineup scenarios in Pick & Roll.',
  alternates: { canonical: '/matchups' }
};
export default function MatchupsIndex(){return <PickRollApp/>;}

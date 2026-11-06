import Link from 'next/link';

export const metadata = {
  title: 'About the Model',
  description: 'Learn how Pick & Roll sources NBA game data, measures statistical accuracy and presents live basketball intelligence.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About the Model | Pick & Roll',
    description: 'Data sources, model accuracy and statistical definitions behind Pick & Roll.',
    url: 'https://basketballreflexsystem.vercel.app/about'
  }
};

const validation = [
  { range: '0–20%', games: 7, predicted: '16.4%', observed: '0.0%' },
  { range: '20–40%', games: 69, predicted: '30.5%', observed: '18.8%' },
  { range: '40–60%', games: 121, predicted: '49.9%', observed: '57.0%' },
  { range: '60–80%', games: 109, predicted: '69.1%', observed: '81.7%' },
  { range: '80–100%', games: 40, predicted: '84.2%', observed: '87.5%' }
];

export default function AboutModel() {
  return <main className="about-page">
    <nav className="about-navigation" aria-label="Page navigation"><Link href="/">← Pick &amp; Roll</Link><span>DATA / MODEL ACCURACY</span></nav>
    <header className="about-hero">
      <span className="intel-kicker">PICK &amp; ROLL</span>
      <h1>About the Model</h1>
      <p>Understand the game. Anticipate what happens next.</p>
      <div className="about-intro">Pick &amp; Roll connects live NBA scores, player performance, matchup trends, rotations and statistical projections. Real games power the analysis, and estimates are kept separate from recorded results.</div>
    </header>
    <section className="about-section">
      <span className="intel-kicker">HISTORICAL VALIDATION</span>
      <h2>Pregame scoring-form benchmark</h2>
      <p>A chronological evaluation using completed 2025–26 NBA games. The model was evaluated only on future games relative to each prediction, with no later results included in earlier predictions.</p>
      <div className="about-metrics">
        <div><small>HOLDOUT GAMES</small><strong>346</strong></div>
        <div><small>BRIER SCORE</small><strong>0.184</strong></div>
        <div><small>WINNER ACCURACY</small><strong>72.8%</strong></div>
      </div>
      <p className="about-caption">Comparison: an uninformed 50/50 forecast has a Brier score of 0.250. Lower is better. The 2025–26 historical assessment covered 1,231 regular-season games and generated 1,152 walk-forward scoring-form predictions, with 806 in training and 346 in the final holdout.</p>
      <h3>Calibration by probability range</h3>
      <div className="about-table-wrap"><table className="about-table">
        <thead><tr><th>Predicted range</th><th>Games</th><th>Average forecast</th><th>Observed home wins</th></tr></thead>
        <tbody>{validation.map(row=><tr key={row.range}><td>{row.range}</td><td>{row.games}</td><td>{row.predicted}</td><td>{row.observed}</td></tr>)}</tbody>
      </table></div>
      <p className="about-caption">This tests the historical <strong>scoring-form baseline</strong>, not the exact production prediction with current injury adjustments. Its calibration varies by probability bucket. Full end-to-end production calibration is still being developed.</p>
    </section>
    <section className="about-section">
      <span className="intel-kicker">HOW TO READ THE DATA</span>
      <h2>Sources &amp; statistical definitions</h2>
      <div className="about-explainer-grid">
        <div><h3>Player statistics</h3><p>Season averages, recent-five and recent-ten form are separate windows. Game logs and prop hit rates come from recorded regular-season boxscores. An exact match on a whole-number prop line counts as a push.</p></div>
        <div><h3>Live win probability</h3><p>Uses ESPN's published in-game percentage when it matches the current game score, period and clock. When temporarily unavailable, Pick &amp; Roll can show a separate score-based estimate.</p></div>
        <div><h3>Pregame estimate</h3><p>Combines recent team scoring, home court and relevant availability. The full production injury-adjusted model still requires historical validation.</p></div>
        <div><h3>Lineups &amp; rotations</h3><p>Historical game starters and play-by-play-derived lineups are labelled according to their source. Substitution simulations are exploratory scenarios, not recorded on-court changes.</p></div>
      </div>
    </section>
    <section className="about-section about-bottom">
      <h2>About Pick &amp; Roll</h2>
      <p>An independent basketball intelligence project. NBA data is sourced from ESPN public feeds; Pick &amp; Roll is not affiliated with ESPN or the NBA. The site is for information and entertainment, not betting advice.</p>
      <Link className="about-return" href="/">Return to Pick &amp; Roll →</Link>
    </section>
  </main>;
}

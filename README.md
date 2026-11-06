# Pick & Roll

*Understand the game. Anticipate what happens next.*

Live NBA intelligence that connects player performance, matchups, rotations and statistical projections in one place.

**A dynamic Next.js NBA intelligence website** backed by a server-side sports data adapter. The code is hosted on GitHub and designed to run on Vercel (or another Next.js-compatible server runtime). The previous hard-coded HTML prototype has been retired.

## What the MVP does

- **Live Games:** NBA schedules, current game scores, live/final statuses, quarter scores and detailed boxscores.
- **Player Boxscores:** Current game player stat lines and team game stats where published.
- **Matchup Lab:** Select any two NBA teams and compare recent completed regular-season results, last-five records, points scored/allowed and scoring differentials. These are observed statistics, **not** predicted outcomes.
- **Player Explorer:** Browse active team rosters and request the selected player's season statistics. Data availability depends on the source.
- **Updates automatically:** The scoreboard and selected live game are requested approximately every **5 seconds** while the page is open and visible. Less time-sensitive feeds refresh every five minutes. Server-side caching reduces load.

The interface **does not use fabricated stats**, subscriptions, or a simulated betting model. If the sports data provider fails, the UI displays a retryable error.

## Tech stack

- Next.js App Router and React
- Server-side Next.js route handler at `app/api/nba/route.js`
- Source data: **ESPN's publicly accessible, unofficial JSON endpoints**
- GitHub for source, GitHub Actions for CI, Vercel for optional hosting

**Important:** ESPN's feeds are **undocumented and unofficial**. They can change, throttle requests or go offline. They are not guaranteed to be licensed for commercial redistribution or reuse. Before any public commercial launch, obtain permission or migrate to a licensed data supplier (such as BALLDONTLIE, Sportradar, or SportsDataIO). The site does not claim instantaneous provider updates; the scoreboard is polled around every 5 seconds during live games, although actual updates depend on ESPN publication.

## Deploy the dynamic website

**GitHub Pages cannot execute Next.js server API routes**, so it cannot serve this project by itself.

1. Visit [Vercel](https://vercel.com/new).
2. Sign in with your GitHub account.
3. **Import `rporga/BasketballReflexSystem`**.
4. Select the **Next.js** framework preset, root directory `./`, and deploy.
5. Vercel will provide a real `.vercel.app` URL. Future pushes to `main` can deploy automatically through that project connection.
6. Once deployed, verify that your website loads and try `https://YOUR-SITE.vercel.app/api/nba?view=scoreboard`.

No API key is required for this first public-data MVP. If you later use a paid API, keep its token in the deployment's server-side environment variables; never place it in browser code.

**If GitHub Pages is still enabled:** disable it at repository **Settings → Pages**. GitHub Pages is for static files and may display stale copies or a 404 once the legacy HTML file has been removed. The Vercel URL is the dynamic website URL.

## Run locally

Requires Node.js 22 or newer:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, then select Live Games, Matchup Lab or Player Explorer.

## Read-only API

- `GET /api/nba?view=scoreboard&date=20261105` — games for an NBA Eastern Time date (YYYYMMDD).
- `GET /api/nba?view=teams` — teams and ESPN IDs.
- `GET /api/nba?view=game&id=ESPN_EVENT_ID` — game/player boxscore.
- `GET /api/nba?view=roster&team=ESPN_TEAM_ID` — roster.
- `GET /api/nba?view=form&team=ESPN_TEAM_ID` — recent team results.
- `GET /api/nba?view=player&id=ESPN_PLAYER_ID` — season stats.

Responses carry `fetchedAt` and `provider` metadata. The service validates route parameters and doesn't permit arbitrary URLs.

## Next milestones

1. Verify the deployed source against actual games and records; handle any provider schema changes.
2. Add injury availability with timestamps and a robust roster mapping.
3. Store multiple years of games and quarter scores in a database.
4. Train, calibrate and backtest a proper probabilistic model; only then enable real predictions.

This project is independent of ESPN and the NBA. It is not a betting recommendation service.

## Automatic deployments

The production website runs at [basketballreflexsystem.vercel.app](https://basketballreflexsystem.vercel.app). This repository is linked to the existing Vercel project `basketballreflexsystem`; pushes to its production branch `main` trigger a new deployment. GitHub Actions independently validates that the application builds and that the upstream NBA data endpoints respond.

## Install Pick & Roll as an app (PWA)

Pick & Roll now includes an installable web manifest, service worker, offline page, and matching orange-and-charcoal basketball icons. The browser tab icon, Apple touch icon, Android 192×192 / 512×512 icons and Android maskable icon are derived from the same artwork.

- **iPhone / iPad:** Open the site in Safari, tap **Share → Add to Home Screen** (or your browser's equivalent).
- **Android:** Open the site in Chrome, tap the menu → **Install app** or **Add to Home screen**.
- **Desktop Chrome / Edge:** Choose **Install Pick & Roll** from the browser's install prompt or menu.

The app launches in standalone mode on supported devices. Only static shell files are cached: **live game statistics and AI chats are always network-only**. If offline, the app displays a reconnect screen rather than stale scores.

### Generate app icons

The vector artwork lives in `public/app-icon.svg`. `scripts/generate-pwa-icons.mjs` regenerates all PNG sizes with Sharp. The `Generate PWA app icons` GitHub workflow runs when the vector or generator changes and commits the generated PNG files.

## Dime: OpenAI-powered basketball assistant

Dime is an embedded LLM assistant on every Pick & Roll tab. It reads the selected game, teams or player from the page and invokes **read-only NBA data tools** for live scores, game boxscores, roster details, quarter trends, injury reports and the existing experimental prediction model. The character artwork is the same mascot supplied by the owner, used in the floating button and chat.

Dime now talks **directly to the OpenAI API**, not Vercel AI Gateway. It uses the Vercel AI SDK v6 and `@ai-sdk/openai` provider for the `gpt-5.4-mini` model, with the OpenAI Responses API and `store: false`. Vercel remains the web host, but does not act as the LLM gateway.

### Activate the OpenAI API

1. Sign in to [OpenAI Platform](https://platform.openai.com/) with your account, set up API billing and create a **project-scoped secret API key** from [API keys](https://platform.openai.com/api-keys). This is separately billed from a ChatGPT Plus/Pro subscription.
2. In **Vercel → basketballreflexsystem → Settings → Environment Variables**, create **`OPENAI_API_KEY`** with the secret value. Select **Encrypted/Sensitive** and at least the **Production** environment (and Preview/Development if needed). **Never paste it into GitHub, the chat, frontend code, or browser local storage.**
3. Redeploy the project's latest `main` deployment so its server functions receive the new environment variable.
4. Test the floating **Ask Dime** button in Live Games and Matchup Lab. For a focused smoke test, use `node scripts/test-dime.mjs` in a secure environment with access to the public production site.

Without a key, the Dime API deliberately returns a clear **503: not activated** message. It does not hallucinate an LLM response or leak credentials. With invalid credentials or exhausted API balance, the error message points to OpenAI Platform rather than Vercel AI Gateway.

### Personal beta safeguards

Dime accepts short messages, restricts tool parameters, limits generated output, and applies an **in-memory per-IP hourly throttle** in the server. This protects against casual overuse **but is not a hard or distributed spending limit** on serverless hosts. For public testing, configure OpenAI project budgets/alerts, monitor usage, and consider adding a shared database-backed rate limiter and authentication if more visitors join. Only public NBA data and the user's basketball question/context are passed to the model; don't submit private information.

The existing matchup probabilities are historical, uncalibrated heuristics, **not** live in-game win probabilities, calibrated odds or betting advice. Injury estimates may be unavailable or stale. Dime is instructed to check its tools rather than invent statistics.

## Live lineups and full-roster rotation simulator

The **Live Matchup Engine** (under Live Games) and **Rotation Simulator** (under Matchup Lab) reconstruct game lineups from publicly accessible ESPN game summary data and expose a side-by-side five-man comparison, every available roster player, recent 5-game player production, injury-status flags, and recent substitution events.

To simulate:
1. Choose one of the two teams and select an on-court player under **Sub Out** and a roster player under **Sub In**. Apply and repeat for either team to build hypothetical combinations.
2. Optionally select an attacker and a hypothetical defender currently in the *opposing* five. This is **not verified positional/defensive tracking**.
3. Compare baseline vs simulated estimated outcomes. Reset restores the source five.

The public server endpoint `GET /api/rotations?home=<teamId>&away=<teamId>[&game=<ESPNGameId>]` reports roster, projected or reconstructed five, substitution evidence and per-player sample sizes. For a single hypothetical substitution it accepts `side`, `out` and `in`, and optionally `attacker`, `defender`, `prior`; invalid substitutions and IDs are rejected server-side. All NBA data tools are **read-only**.

The exploratory scenario engine is in `lib/rotation-analytics.js`, with tests in `scripts/test-rotation-engine.mjs`. Its player role estimates use modest, arbitrary weights on recent boxscore stats, then apply a logistic adjustment to the scouting prior. During live games, a score-and-clock heuristic is also applied. **It has not been trained, calibrated, or backtested; it is not a reliable win-probability model or suitable for wagering.** Missing player data returns "not enough data" rather than a zero contribution. A recent starting five is not a confirmed upcoming lineup, and substitutions reconstructed from play-by-play can be incomplete near quarter breaks.

The current ESPN feeds do **not** establish who defends whom on a possession. The defensive assignment control is strictly hypothetical and uses limited defensive proxies (steals, blocks, rebounds). Dime can call the same roster and single-scenario endpoints, but does not independently generate statistical estimates.

For future production accuracy: ingest a licensed NBA play-by-play/lineup/defensive tracking provider, correct for opponent strength, rotations, pace, lineup effects and injury availability without double-counting, and fit/backtest/calibrate a game-state win model on held-out seasons.

## Player Prop Intelligence & Parlay Explorer

**Player Explorer** now uses the current-season ESPN game-by-game log rather than the career aggregate player summary. `GET /api/props?player=<ESPN_ID>` returns regular-season results only (up to 52), basic scoring/assist/rebound/three-point combinations, shooting efficiency, recent minutes, up to 20 game-boxscore plus/minus entries, next scheduled opponent, opponent last-ten points allowed and current listed teammate injuries. It does not manufacture unavailable data.

The interactive dashboard supports PTS/REB/AST/3PM, PRA/PR/PA/RA, STL/BLK/STOCKS; last 5/10/20/season filters; over/under with user-editable line and push-aware historical hit rates; tappable game-log bars; descriptive form estimates and middle-50% ranges; and expandable player opportunity, matchup and defensive context.

The **Parlay Explorer** keeps up to eight manually selected legs in local browser storage. Decimal and American prices are supplied manually by the user; there is no connected sportsbook or execution. It can show the combined entered decimal price and its implied break-even, the product of historical individual hit rates as an *independence reference only*, and observed same-game co-hits when future legs share the same target game and at least five historical games overlap, and pairwise correlations from at least ten shared historical games.

These game-log hit rates and correlation summaries are **descriptive, not fitted or calibrated predictions**. A licensed provider would be necessary for real-time prop prices/line movement, possession tracking, official usage %, potential assists, rebound chances and properly adjusted player on/off data. Dime can read the same real game logs through the `getPlayerPropTrends` and `comparePropLegs` tools without inventing odds.

Regression checks: `scripts/test-prop-analytics.mjs` and `scripts/check-player-props-source.mjs`.

## Search discovery and brand metadata

The public name is **Pick & Roll**. Its preferred Google title is `Pick & Roll`, with the description: "Understand the game. Anticipate what happens next. Live NBA intelligence that connects player performance, matchups, rotations and statistical projections in one place."

Canonical homepage: `https://basketballreflexsystem.vercel.app/`. Public search discovery files: `/robots.txt` and `/sitemap.xml`. The homepage includes a visible heading and `WebSite` structured data, with matching Open Graph and Twitter previews. The public `/about` page contains model validation results and source definitions.

Google can rewrite search-result titles and snippets, and indexing is not immediate. Use Google Search Console to verify the site, submit `https://basketballreflexsystem.vercel.app/sitemap.xml`, and request indexing for the canonical homepage. An eventual custom domain can replace this URL when configured.

## Accuracy and quality

- Historical team scoring-form evaluation: 346 held-out 2025–26 games; Brier score 0.184 and winner accuracy 72.8%. **This is not a validation of the full injury-adjusted production model.**
- Current-season injuries and Player Explorer averages use the same regular-season game-log aggregation; starting-five snapshots explicitly identify their different recent-five window.
- Scouting **Observations** show sample sizes and small-sample labels, separate from the win-probability estimate. Close pregame outcomes are shown as too close to call.
- Feed checks display source timestamps. Live results have a stricter staleness threshold than completed-game/season data.
- Weekly historical validation workflow: `.github/workflows/model-validation.yml`. Core correctness tests run on each commit under `.github/workflows/build.yml`.


## Google Analytics 4

Pick & Roll uses GA4 Measurement ID `G-88Q3PDQJF7` on the live Next.js site. The implementation is in `lib/analytics.js` and `app/AnalyticsConsent.jsx`. It **does not load Google's analytics script or send events before opt-in consent**. A lightweight first-visit choice is stored in local storage; visitors can change their choice using **Analytics preferences** in the footer or on the About page. Revoking consent disables analytics and reloads to remove any active Google script, with local analytics cookies expired.

Recorded events (only after opt-in) include `section_view`, `game_selected`, `matchup_team_selected`, `player_selected`, `prop_category_selected`, `prop_window_selected`, `parlay_leg_added`, `parlay_leg_removed`, `parlay_cleared`, `rotation_substitution_tested`, `rotation_defender_selected`, `rotation_reset`, `dime_opened`, `dime_question_sent`, `dime_answer_received`, and `dime_answer_failed`. The tracker only accepts a restricted set of event names and predefined structured fields. It does not include prompts, message content, personal details, user-entered odds or query text.

In GA4: open **Reports → Realtime**, visit the live website in a browser where analytics is allowed, and confirm a session appears; custom product events can be viewed in Realtime or Engagement/Events as Google processes them. Tracking is subject to consent, browser ad blockers, and GA4 processing delays.

Regression test: `node scripts/test-analytics.mjs`.

## Shareable routes and product engagement

Pick & Roll uses real Next.js App Router paths and preserves its existing dashboard design:

| URL | Purpose |
| --- | --- |
| `/` or `/games` | Live Games |
| `/games/{gameId}` | Selected NBA game, including direct-game date restoration |
| `/matchups` | Matchup Lab |
| `/matchups/{home}-vs-{away}` | Specific team comparison, such as `bos-vs-lal` |
| `/players` | Player Explorer |
| `/players/{playerId}` | Specific player research |
| `/players/{playerId}?prop=AST&window=5` | Shared player prop category and recent-games sample |

Desktop and mobile navigation, game cards, and player roster rows use real accessible links. The app keeps native browser Back/Forward behaviour and loads game dates, roster teams, and prop filters from the URL. Dynamic game and player routes have individual canonical URLs and search metadata, while stable navigation hubs are included in the sitemap. Query-string prop filters are deliberately not separate canonical pages.

### GA4 tracking

Pick & Roll continues using `G-88Q3PDQJF7` with optional visitor consent. The global `AnalyticsPageviews` component sends one explicit `page_view` on each real pathname change. The GA4 configuration has `send_page_view:false` to prevent duplication from the initial automatic config call. Query changes to the prop filter are measured by custom `prop_category_selected` and `prop_window_selected` events instead of artificial pageviews. Other consented feature events (game selected, player selected, parlay actions, rotation scenarios, Dime interactions) remain unchanged.

In **GA4 → Admin → Data streams → Web → Enhanced measurement → Page views settings**, disable automatic pageviews on browser-history changes when explicit manual route tracking is in use, to avoid counting a route twice. Check **Reports → Realtime** after allowing analytics.

Test locally with `node scripts/test-deep-links.mjs` and `node scripts/test-analytics.mjs`; GitHub Actions runs both.

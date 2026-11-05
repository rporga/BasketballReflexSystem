# Basketball Reflex System

**A dynamic Next.js NBA intelligence website** backed by a server-side sports data adapter. The code is hosted on GitHub and designed to run on Vercel (or another Next.js-compatible server runtime). The previous hard-coded HTML prototype has been retired.

## What the MVP does

- **Live Games:** NBA schedules, current game scores, live/final statuses, quarter scores and detailed boxscores.
- **Player Boxscores:** Current game player stat lines and team game stats where published.
- **Matchup Lab:** Select any two NBA teams and compare recent completed regular-season results, last-five records, points scored/allowed and scoring differentials. These are observed statistics, **not** predicted outcomes.
- **Player Explorer:** Browse active team rosters and request the selected player's season statistics. Data availability depends on the source.
- **Updates automatically:** The scoreboard and selected game are requested every **30 seconds** while the page is open and visible. Less time-sensitive feeds refresh every five minutes. Server-side caching reduces load.

The interface **does not use fabricated stats**, subscriptions, or a simulated betting model. If the sports data provider fails, the UI displays a retryable error.

## Tech stack

- Next.js App Router and React
- Server-side Next.js route handler at `app/api/nba/route.js`
- Source data: **ESPN's publicly accessible, unofficial JSON endpoints**
- GitHub for source, GitHub Actions for CI, Vercel for optional hosting

**Important:** ESPN's feeds are **undocumented and unofficial**. They can change, throttle requests or go offline. They are not guaranteed to be licensed for commercial redistribution or reuse. Before any public commercial launch, obtain permission or migrate to a licensed data supplier (such as BALLDONTLIE, Sportradar, or SportsDataIO). The site does not claim instantaneous provider updates; 30 seconds is its polling interval.

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

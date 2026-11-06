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

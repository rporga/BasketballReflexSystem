# Changelog

## 2026-11-06 — Google Analytics 4 — G-88Q3PDQJF7

- Connected GA4 to Pick & Roll using consent-first script loading, with optional first-visit choice and permanent privacy preferences.
- Added privacy-filtered product events for site navigation, game/player selection, prop categories, parlays, rotation simulations, and Dime engagement. No chat text or entered prices are sent to GA4.
- Added a privacy explanation to the About page and opt-in tests to CI.
- The website's colours, logo, PWA icons, and basketball functionality are unchanged.

## 2026-11-06 — Pick & Roll SEO and credibility pass

### Search and brand
- **SEO:** Set the canonical `Pick & Roll` search title, your tagline and the complete homepage meta description.
- **SEO:** Added consistent Open Graph and Twitter descriptions, `WebSite` structured data, canonical URL, a crawlable visible homepage heading, and `/sitemap.xml` / `/robots.txt`.
- **SEO:** Published `/about` with sourced model-validation summaries, and linked it from the footer.
- **Branding:** Changed the README title to Pick & Roll while retaining the existing deployment URL.

### Statistical credibility
- **Task 1 — consistency:** Player Explorer and Dime now read the same current-season game-log statistics. Injury reports use those game logs for season PPG; starting-five and roster data explicitly say L5 PPG rather than presenting it as season PPG. Team-name resolution now uses the shared ESPN team registry.
- **Task 2 — observations:** Replaced speculative "Key Takeaways / Signals" with descriptive Observations, including per-team sample counts and small/limited-sample badges. Removed "matchup edge" language from the report.
- **Task 3 — win estimate:** Show "Too close to call" for 45–55% pregame estimates. Published the existing walk-forward scoring-form holdout metrics with a clear distinction from the not-yet-validated production injury model.
- **Task 4 — freshness:** Added compact, type-specific feed-checked timestamps to Live Games, Scouting, Player Explorer and Rotation Explorer, and specific injury-impact reasons where possible.
- **Task 6 — Dime:** Aligned the player stats tool with the canonical game-log endpoint and strengthened instructions for sources, sample windows and unknown/stale data.
- **Task 8 — quality:** Added source/SEO regression checks to GitHub Actions.

### Deliberately deferred
- No mandatory gambling pop-up, repeated disclaimer under every Dime answer, intrusive age gate, or arbitrary five-minute expiry of historical scores.
- Full production model calibration, licensed tracking, live sportsbook price feeds and new commercial data rights remain separate projects.
- Google chooses its own search titles/snippets after crawling. Search Console verification and indexing requests require account access.

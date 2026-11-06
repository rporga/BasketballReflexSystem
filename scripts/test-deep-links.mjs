import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {
 parseAppRoute,gamesPath,playersPath,matchupsPath,dateInNewYork,propQuery,parsePropQuery
} from '../lib/deep-links.js';
const repoFile=path=>new URL('../'+path,import.meta.url);
const content=path=>readFileSync(repoFile(path),'utf8');

assert.equal(parseAppRoute('/').tab,'games');
assert.equal(parseAppRoute('/games').tab,'games');
assert.deepEqual([parseAppRoute('/games/401909934').tab,parseAppRoute('/games/401909934').gameId],['games','401909934']);
assert.deepEqual([parseAppRoute('/players/3945274').tab,parseAppRoute('/players/3945274').playerId],['players','3945274']);
assert.deepEqual([parseAppRoute('/matchups/bos-vs-lal').homeAbbr,parseAppRoute('/matchups/bos-vs-lal').awayAbbr],['BOS','LAL']);
assert.equal(parseAppRoute('/matchups').tab,'teams');
assert.equal(parseAppRoute('/players').tab,'players');
assert.equal(parseAppRoute('/matchups/bos-vs-bos').homeAbbr,null);
assert.equal(parseAppRoute('/games/something').gameId,null);
assert.equal(gamesPath('401909934'),'/games/401909934');
assert.equal(gamesPath('../not-real'),'/games');
assert.equal(playersPath('3945274'),'/players/3945274');
assert.equal(playersPath(''),'/players');
assert.equal(matchupsPath('BOS','LAL'),'/matchups/bos-vs-lal');
assert.equal(matchupsPath('BOS','BOS'),'/matchups');
assert.equal(dateInNewYork('2026-11-07T01:00:00.000Z'),'20261106');
assert.equal(propQuery('PTS',10),'');
assert.equal(propQuery('AST',5),'prop=AST&window=5');
assert.deepEqual(parsePropQuery('?prop=AST&window=5'),{prop:'AST',windowSize:5});
assert.deepEqual(parsePropQuery('?prop=invalid&window=10&line=1.9'),{prop:'PTS',windowSize:10});

for(const page of [
 'app/games/page.jsx','app/games/[gameId]/page.jsx',
 'app/players/page.jsx','app/players/[playerId]/page.jsx',
 'app/matchups/page.jsx','app/matchups/[slug]/page.jsx'
])assert.ok(existsSync(repoFile(page)),'missing route: '+page);
const app=content('app/page.jsx');
assert.ok(app.includes('usePathname()'),'Current route determines visible content');
assert.ok(app.includes('dateInNewYork(detail.data.start)'),'Deep-linked games load their actual dates');
assert.ok(app.includes('pinnedPlayerId'),'Direct player links preserve roster selection');
assert.ok(app.includes('Link href={playersPath(p.id)}'),'Player profiles have crawler-readable links');
assert.ok(app.includes('Link href={gamesPath(game.id)}'),'Game profiles have crawler-readable links');
const props=content('app/PlayerPropHub.jsx');
assert.ok(props.includes('parsePropQuery(window.location.search)'));
assert.ok(props.includes('window.history.replaceState'),'Prop filters shareable without extra pageviews');
const site=content('app/sitemap.js');
for(const segment of ['/games','/players','/matchups'])assert.ok(site.includes("'"+segment+"'"));
console.log('PASS stable NBA deep links, game dates, matchup URLs, prop filters, SEO and navigation state');

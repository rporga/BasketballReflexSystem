const origin = 'https://basketballreflexsystem.vercel.app';
export default function sitemap() {
  return [
    { url: origin + '/', changeFrequency: 'daily', priority: 1 },
    { url: origin + '/games', changeFrequency: 'daily', priority: 0.7 },
    { url: origin + '/matchups', changeFrequency: 'daily', priority: 0.8 },
    { url: origin + '/players', changeFrequency: 'daily', priority: 0.8 },
    { url: origin + '/about', changeFrequency: 'monthly', priority: 0.5 }
  ];
}

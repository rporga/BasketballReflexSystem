const origin = 'https://basketballreflexsystem.vercel.app';
export default function sitemap() {
  return [
    { url: origin + '/', changeFrequency: 'daily', priority: 1 },
    { url: origin + '/about', changeFrequency: 'monthly', priority: 0.5 }
  ];
}

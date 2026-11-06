const origin = 'https://basketballreflexsystem.vercel.app';
export default function robots() {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: origin + '/sitemap.xml', host: origin };
}

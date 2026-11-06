import './globals.css';
import ServiceWorkerRegister from './ServiceWorkerRegister';
import AnalyticsConsent from './AnalyticsConsent';

const SITE_URL = 'https://basketballreflexsystem.vercel.app';
const TAGLINE = 'Understand the game. Anticipate what happens next.';
const DESCRIPTION = 'Understand the game. Anticipate what happens next. Live NBA intelligence that connects player performance, matchups, rotations and statistical projections in one place.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Pick & Roll', template: '%s | Pick & Roll' },
  description: DESCRIPTION,
  applicationName: 'Pick & Roll',
  keywords: ['Pick & Roll', 'NBA live scores', 'NBA player statistics', 'basketball matchups', 'NBA rotations', 'NBA statistical projections'],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/app-icon.svg?v=2', type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png?v=2', sizes: '32x32', type: 'image/png' }
    ],
    apple: [{ url: '/apple-icon.png?v=2', sizes: '180x180', type: 'image/png' }]
  },
  appleWebApp: { capable: true, title: 'Pick & Roll', statusBarStyle: 'default' },
  openGraph: { type: 'website', siteName: 'Pick & Roll', title: 'Pick & Roll',
    description: DESCRIPTION, url: SITE_URL, locale: 'en_GB' },
  twitter: { card: 'summary', title: 'Pick & Roll', description: DESCRIPTION },
  category: 'sports'
};
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Pick & Roll',
  alternateName: 'Pick and Roll',
  url: SITE_URL,
  description: DESCRIPTION,
  inLanguage: 'en'
};

export const viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default function RootLayout({children}) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{__html:`(function(){
        try {
          var saved=localStorage.getItem('pick-roll-theme');
          var dark=saved==='dark'||(saved!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
          document.documentElement.setAttribute('data-theme',dark?'dark':'light');
        } catch(e) {
          document.documentElement.setAttribute('data-theme','light');
        }
      })();`}}/>
    </head>
    <body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(websiteSchema).replace(/</g,'\\u003c')}}/>
      <ServiceWorkerRegister/>{children}<AnalyticsConsent/>
    </body>
  </html>;
}

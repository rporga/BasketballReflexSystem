import './globals.css';
import ServiceWorkerRegister from './ServiceWorkerRegister';

export const metadata = {
  title: { default: 'Pick & Roll', template: '%s | Pick & Roll' },
  description: 'Live NBA scores, quarter-by-quarter scouting and Dime, your AI basketball assistant.',
  applicationName: 'Pick & Roll',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  appleWebApp: { capable: true, title: 'Pick & Roll', statusBarStyle: 'default' },
  openGraph: { title: 'Pick & Roll', description: 'Live NBA intelligence and Dime AI.', type: 'website' }
};
export const viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default function RootLayout({children}) {
  return <html lang="en"><body><ServiceWorkerRegister/>{children}</body></html>;
}

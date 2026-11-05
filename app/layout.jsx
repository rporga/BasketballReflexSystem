import './globals.css';
export const metadata = {
  title: 'Pick & Roll | NBA Intelligence',
  description: 'Pick & Roll — live NBA scores, player stats and matchup intelligence in one clear view.',
  applicationName: 'Pick & Roll',
  icons: { icon: '/icon.svg' },
  openGraph: { title: 'Pick & Roll | NBA Intelligence', description: 'Every quarter. Every player. Every detail.', type: 'website' }
};
export default function RootLayout({children}) { return <html lang="en"><body>{children}</body></html>; }

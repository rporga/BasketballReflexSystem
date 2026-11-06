export default function manifest() {
  return {
    id: '/',
    name: 'Pick & Roll',
    short_name: 'Pick & Roll',
    description: 'Understand the game. Anticipate what happens next. Live NBA intelligence connecting player performance, matchups, rotations and statistical projections.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f7f7f6',
    theme_color: '#ffffff',
    categories: ['sports','productivity'],
    icons: [
      { src: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/app-icon.svg?v=2', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
    ],
  };
}

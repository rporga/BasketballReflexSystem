/* Pick & Roll service worker. Only static shell assets are cached; live NBA and Dime requests are always network-only. */
const VERSION='pick-roll-shell-v2';
const SHELL=['/offline.html','/manifest.webmanifest','/app-icon.svg','/pick-roll-logo.webp','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/favicon-32.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).catch(()=>caches.match('/offline.html')));
    return;
  }
  if(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/icons/')||url.pathname==='/app-icon.svg'||url.pathname==='/pick-roll-logo.webp'){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(req,copy));}
      return response;
    })));
  }
});

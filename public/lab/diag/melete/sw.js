// Storage diagnostic worker for Meletē (temporary). Scope /lab/diag/melete/ only; it answers no requests.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Storage diagnostic worker for Hydros (temporary). Scope /lab/diag/hydros/ only; it answers no requests.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Storage diagnostic worker for Soma (temporary). Scope /lab/diag/soma/ only; it answers no requests.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

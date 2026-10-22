/**
 * Where a notice's `open` leads: the app's page and the address to open. The same rules as `placeFor` in
 * `public/sw.js` (which cannot import this); a test keeps the two in step.
 */
export function placeFor(open: string): { app: string; url: string } {
  if (open === 'hydros') return { app: '/hydros/', url: '/hydros/' };
  if (open === 'praxis') return { app: '/praxis/', url: '/praxis/' };
  if (open === 'askesis') return { app: '/askesis/', url: '/askesis/' };
  if (open.startsWith('oikonomia:')) return { app: '/oikonomia/', url: '/oikonomia/?open=' + encodeURIComponent(open.slice(10)) };
  for (const app of ['diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia']) {
    if (open === app) return { app: '/' + app + '/', url: '/' + app + '/' };
    if (open.startsWith(app + ':')) return { app: '/' + app + '/', url: '/' + app + '/?open=' + encodeURIComponent(open.slice(app.length + 1)) };
  }
  return { app: '/', url: '/?open=' + encodeURIComponent(open) };
}

/** A stable whole number for a notice's key, as the phone's own notifications want (32-bit, positive). */
export function nativeId(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 1) || 1;
}

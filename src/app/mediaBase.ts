/**
 * Large optional media can live outside the native package. The website keeps
 * using its own same-origin files, while the Capacitor build points at the
 * production asset host and caches files after first use.
 */
const configured = (import.meta.env.VITE_MEDIA_BASE ?? '').replace(/\/$/, '');

export const mediaUrl = (path: string): string => `${configured}${path.startsWith('/') ? path : `/${path}`}`;

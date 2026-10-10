/**
 * Where the small server helpers live (calendar and recipe imports). On the web it is the same address as
 * the page, so this is empty. In the phone apps, which carry the built files, the build sets VITE_API_BASE
 * to the live site (see docs/NATIVE.md).
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';

export const apiUrl = (path: string): string => `${API_BASE}${path}`;

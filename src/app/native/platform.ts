/**
 * Whether these pages run inside the phone app (Capacitor on iOS or Android) rather than a browser. The native
 * shell puts `Capacitor` on the window before the page loads, so nothing native is imported to find out, and the
 * website never loads any of it.
 */
type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string };

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  if (!isNativeApp()) return 'web';
  const platform = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor?.getPlatform?.();
  return platform === 'ios' || platform === 'android' ? platform : 'web';
}

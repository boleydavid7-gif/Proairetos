import { loadAppearance } from '../data/storage/preferences';

/**
 * A soft buzz under the finger when something is ticked off. Only on
 * phones that can (most Android; iPhones ignore it), and only while
 * Settings > Appearance > Gentle taps is on.
 */
export function tap(ms = 8): void {
  try {
    if (loadAppearance().taps) navigator.vibrate?.(ms);
  } catch {
    // Some browsers refuse outside a gesture; the tap is a nicety.
  }
}

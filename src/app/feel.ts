import { loadAppearance } from '../data/storage/preferences';

/*
 * A soft buzz under the finger when something is ticked off or switched, while Settings > Appearance > Gentle taps
 * is on. Android buzzes through vibrate(). iPhones have no vibrate() for the web, but Safari (iOS 18 and later)
 * gives its own light tap when a native switch is flipped, so a hidden one is flipped instead.
 */

let hidden: HTMLLabelElement | undefined;

function iPhoneTap(): void {
  if (typeof document === 'undefined') return;
  if (!hidden) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-10px;top:-10px';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    hidden = label;
  }
  hidden.click();
}

export function tap(ms = 8): void {
  try {
    if (!loadAppearance().taps) return;
    if (typeof navigator.vibrate === 'function') navigator.vibrate(ms);
    else iPhoneTap();
  } catch {
    // Some browsers refuse outside a gesture; the tap is a nicety.
  }
}

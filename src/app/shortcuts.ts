import { useEffect } from 'react';
import { navigation } from './navigation';
import type { AppRoute } from './routes/routeTypes';

export type ShortcutAction = { go: AppRoute } | { search: true };

type KeyLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target'> & { defaultPrevented?: boolean };

const typing = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element || !element.tagName) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName) || element.isContentEditable === true;
};

/** What a key press means on a computer: 1-5 jump between the main pages, "/" opens search. Never while typing. */
export function shortcutFor(event: KeyLike, dialogOpen = false): ShortcutAction | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return undefined;
  if (typing(event.target) || dialogOpen) return undefined;
  if (event.key === '/') return { search: true };
  const index = Number(event.key) - 1;
  if (Number.isInteger(index) && index >= 0 && index < navigation.length) return { go: navigation[index].id };
  return undefined;
}

export function useShortcuts(go: (route: AppRoute) => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = shortcutFor(event, document.querySelector('dialog[open]') !== null);
      if (!action) return;
      event.preventDefault();
      if ('go' in action) go(action.go);
      else document.querySelector<HTMLButtonElement>('button[aria-label="Search"]')?.click();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);
}

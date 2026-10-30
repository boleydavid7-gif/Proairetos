/*
 * What may ask for the person's attention, as they choose it (Settings > The app > Attention): the bell's count on
 * Today, Today's updates card, and the light on the one thing that matters now in every app. Kept in the synced
 * setting `proairetos.attention`, so every app and device follows one choice. Absent means as it was: on.
 */
export type BellCount = 'number' | 'dot' | 'off';
export type Attention = { bell: BellCount; updates: boolean; light: boolean };

export const ATTENTION_KEY = 'proairetos.attention';
const CHANGED = 'proairetos-attention';
const DEFAULTS: Attention = { bell: 'number', updates: true, light: true };

export function attention(): Attention {
  try {
    const saved = JSON.parse(localStorage.getItem(ATTENTION_KEY) ?? '{}') as Partial<Attention>;
    return {
      bell: saved.bell === 'dot' || saved.bell === 'off' ? saved.bell : 'number',
      updates: saved.updates !== false,
      light: saved.light !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

export function setAttention(patch: Partial<Attention>): void {
  try {
    localStorage.setItem(ATTENTION_KEY, JSON.stringify({ ...attention(), ...patch }));
  } catch {
    // Storage closed: the choice holds for this visit only.
  }
  dispatchEvent(new Event(CHANGED));
}

/** Calls back when the choice changes here, in another tab, or arrives from another device. */
export function onAttention(listener: () => void): () => void {
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === ATTENTION_KEY) listener();
  };
  addEventListener(CHANGED, listener);
  addEventListener('storage', storage);
  return () => {
    removeEventListener(CHANGED, listener);
    removeEventListener('storage', storage);
  };
}

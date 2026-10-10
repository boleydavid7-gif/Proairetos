/**
 * Links between the family's apps carry `?open=` (a page in the other app:
 * `recipe:ID`, `workout:ID`, `day:today`…). Read once when an app opens,
 * then the address is tidied so a reload does not open it again.
 */
export function takeOpening(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    if (open) history.replaceState(history.state, '', window.location.pathname);
    return open;
  } catch {
    return null;
  }
}

/** A link into one of the family's apps at a given place. */
export const linkTo = (app: '' | 'askesis' | 'soma' | 'oikonomia', open?: string) => `/${app ? `${app}/` : ''}${open ? `?open=${encodeURIComponent(open)}` : ''}`;

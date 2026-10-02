/**
 * Text shared into Proairetos from another app (Android's Share menu, via
 * the manifest's share_target). Read once from the address, which is then
 * cleaned so a reload does not add it twice.
 */
export function composeShared(params: URLSearchParams): string | undefined {
  const title = params.get('share_title')?.trim();
  const text = params.get('share_text')?.trim();
  const url = params.get('share_url')?.trim();
  const parts = [title, text, url && !text?.includes(url) ? url : undefined].filter((part): part is string => Boolean(part));
  // Some apps send the title again at the start of the text.
  if (title && text?.startsWith(title)) parts.shift();
  return parts.length ? parts.join('\n') : undefined;
}

export function takeShared(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const shared = composeShared(params);
  if (shared) window.history.replaceState(null, '', window.location.pathname);
  return shared;
}

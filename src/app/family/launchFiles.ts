import { useEffect, useRef } from 'react';

/*
 * Opening a file with an installed app on a computer (File Handling: Chrome and Edge), or sharing one into it from
 * another app (Web Share Target: Android, computers; the service worker keeps it for the page). Each manifest names the files
 * an app takes and the page that takes them (`file_handlers`); the files arrive here through `launchQueue` and wait
 * until that page picks them up. Nothing happens on phones or other browsers.
 */

type LaunchParams = { files?: readonly { getFile: () => Promise<File> }[] };
type LaunchQueue = { setConsumer: (consumer: (params: LaunchParams) => void) => void };

let waiting: File[] = [];
const listeners = new Set<() => void>();

const INBOX = 'proairetos-share-inbox';

/** Files shared into this app (the service worker kept them on the way in), taken out once. */
async function takeShared(): Promise<File[]> {
  if (typeof caches === 'undefined') return [];
  const app = location.pathname.split('/')[1] || 'proairetos';
  try {
    const cache = await caches.open(INBOX);
    const files: File[] = [];
    for (const request of await cache.keys()) {
      if (!new URL(request.url).pathname.startsWith(`/share-inbox/${app}/`)) continue;
      const response = await cache.match(request);
      if (response) {
        const name = decodeURIComponent(response.headers.get('x-name') ?? 'shared');
        files.push(new File([await response.blob()], name, { type: response.headers.get('content-type') ?? '' }));
      }
      await cache.delete(request);
    }
    return files;
  } catch {
    return [];
  }
}

function arrive(files: File[]): void {
  if (!files.length) return;
  waiting = [...waiting, ...files];
  for (const listener of listeners) listener();
}

export function startLaunchFiles(): void {
  // Shared from another app (Android, computers).
  void takeShared().then(arrive);
  const queue = (window as { launchQueue?: LaunchQueue }).launchQueue;
  queue?.setConsumer(async (params) => {
    if (!params.files?.length) return;
    arrive(await Promise.all(params.files.map((handle) => handle.getFile())));
  });
}

/** Takes the first waiting file that fits. */
export function takeLaunchedFile(fits: (file: File) => boolean): File | undefined {
  const index = waiting.findIndex(fits);
  if (index < 0) return undefined;
  const [file] = waiting.splice(index, 1);
  return file;
}

/** On a page that takes files: hands it each opened file that fits, now and when more arrive. */
export function useLaunchedFile(fits: (file: File) => boolean, take: (file: File) => void): void {
  const latest = useRef({ fits, take });
  latest.current = { fits, take };
  useEffect(() => {
    const check = () => {
      for (let file = takeLaunchedFile(latest.current.fits); file; file = takeLaunchedFile(latest.current.fits)) latest.current.take(file);
    };
    check();
    listeners.add(check);
    return () => void listeners.delete(check);
  }, []);
}

export const endsWith = (...extensions: string[]) => (file: File) => extensions.some((extension) => file.name.toLowerCase().endsWith(extension));

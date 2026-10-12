import { useEffect, useRef } from 'react';

/*
 * Opening a file with an installed app on a computer (File Handling: Chrome and Edge). Each manifest names the files
 * an app takes and the page that takes them (`file_handlers`); the files arrive here through `launchQueue` and wait
 * until that page picks them up. Nothing happens on phones or other browsers.
 */

type LaunchParams = { files?: readonly { getFile: () => Promise<File> }[] };
type LaunchQueue = { setConsumer: (consumer: (params: LaunchParams) => void) => void };

let waiting: File[] = [];
const listeners = new Set<() => void>();

export function startLaunchFiles(): void {
  const queue = (window as { launchQueue?: LaunchQueue }).launchQueue;
  queue?.setConsumer(async (params) => {
    if (!params.files?.length) return;
    waiting = [...waiting, ...(await Promise.all(params.files.map((handle) => handle.getFile())))];
    for (const listener of listeners) listener();
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

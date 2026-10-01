import { useEffect, useState } from 'react';

type Subscribe = (listener: () => void) => () => void;

/**
 * Loads data from a service and reloads whenever the service changes.
 * Returns undefined until the first load finishes.
 */
export function useServiceData<T>(subscribe: Subscribe, load: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let active = true;
    const refresh = () => {
      load().then((result) => {
        if (active) setData(result);
      });
    };

    refresh();
    const unsubscribe = subscribe(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [subscribe, ...deps]);

  return data;
}

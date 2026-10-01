import type { DomainContext } from '../../core/context';

/** A clock that only moves when told to, and ids that count up. */
export function testContext(start = '2026-10-01T12:00:00.000Z') {
  let time = new Date(start).getTime();
  let counter = 0;

  const context: DomainContext = {
    now: () => new Date(time),
    newId: () => `id-${++counter}`,
  };

  return {
    context,
    advance(ms: number) {
      time += ms;
    },
  };
}

/**
 * What domain commands need from the outside world, injected so they stay
 * pure and testable: the current time and a way to mint ids.
 */
export interface DomainContext {
  now: () => Date;
  newId: () => string;
}

export function systemContext(): DomainContext {
  return {
    now: () => new Date(),
    newId: () => crypto.randomUUID(),
  };
}

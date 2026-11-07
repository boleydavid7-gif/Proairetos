/** Raised when something sealed is asked for while the vault is locked. */
export class LockedError extends Error {
  constructor() {
    super('This is locked. Unlock it to continue.');
    this.name = 'LockedError';
  }
}

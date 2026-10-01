/**
 * Field encryption is not implemented yet.
 *
 * Nothing here pretends otherwise: sensitive fields are tagged as plaintext,
 * and any attempt to encrypt throws so it cannot silently ship as a no-op.
 */
export type SensitiveField = {
  value: string;
  encrypted: false;
};

export function plaintextField(value: string): SensitiveField {
  return { value, encrypted: false };
}

export function encryptField(_value: string): never {
  throw new Error('Field encryption is not implemented. Do not store sensitive data remotely yet.');
}

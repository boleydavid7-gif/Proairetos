export type ProtectedField = {
  value: string;
  encrypted: boolean;
};

export function markForEncryption(value: string): ProtectedField {
  return {
    value,
    encrypted: true,
  };
}

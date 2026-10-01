export type DerivedPattern = {
  type: string;
  source: string;
  dismissed: boolean;
};

export function createPattern(source: string, type: string): DerivedPattern {
  return {
    source,
    type,
    dismissed: false,
  };
}

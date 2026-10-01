export type ReflectionContext = {
  itemId?: string;
  decisionId?: string;
  periodStart?: Date;
  periodEnd?: Date;
};

export function createReflectionContext(context: ReflectionContext): ReflectionContext {
  return context;
}

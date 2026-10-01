export type DecisionModel = {
  id: string;
  userId: string;
  lifeItemId?: string | null;
  options?: string[];
  choice?: string | null;
  decidedAt?: string | null;
  revisitAt?: string | null;
  laterNote?: string | null;
};

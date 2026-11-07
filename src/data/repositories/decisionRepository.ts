import type { DecisionModel } from "../models/decisionModel";

export interface DecisionRepository {
  list(userId: string): Promise<DecisionModel[]>;
  add(decision: DecisionModel): Promise<DecisionModel>;
  put(decision: DecisionModel): Promise<DecisionModel>;
  remove(id: string): Promise<void>;
}

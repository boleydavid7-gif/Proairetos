import type { DecisionModel } from "../models/decisionModel";

export interface DecisionRepository {
  create(decision: DecisionModel): Promise<DecisionModel>;
  getById(id: string): Promise<DecisionModel | null>;
}

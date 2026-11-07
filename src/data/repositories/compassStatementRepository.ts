import type { CompassStatementModel } from "../models/compassStatementModel";

export interface CompassStatementRepository {
  list(userId: string): Promise<CompassStatementModel[]>;
  add(statement: CompassStatementModel): Promise<CompassStatementModel>;
  remove(id: string): Promise<void>;
}

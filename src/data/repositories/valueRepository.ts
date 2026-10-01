import type { ValueModel } from "../models/valueModel";

export interface ValueRepository {
  create(value: ValueModel): Promise<ValueModel>;
  getAvailable(userId: string): Promise<ValueModel[]>;
  getSelected(userId: string): Promise<ValueModel[]>;
}

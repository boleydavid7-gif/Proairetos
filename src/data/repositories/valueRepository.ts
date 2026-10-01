import type { ChosenValueModel } from "../models/valueModel";

export interface ValueRepository {
  list(userId: string): Promise<ChosenValueModel[]>;
  add(value: ChosenValueModel): Promise<ChosenValueModel>;
  remove(id: string): Promise<void>;
}

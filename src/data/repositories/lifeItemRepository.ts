import type { LifeItemModel } from "../models/lifeItemModel";

export interface LifeItemRepository {
  create(item: LifeItemModel): Promise<LifeItemModel>;
  getById(id: string): Promise<LifeItemModel | null>;
  list(userId: string): Promise<LifeItemModel[]>;
  update(item: LifeItemModel): Promise<LifeItemModel>;
  remove(id: string): Promise<void>;
}

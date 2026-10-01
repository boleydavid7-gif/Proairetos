import type { ItemEventModel } from "../models/itemEventModel";

export interface ItemEventRepository {
  append(events: ItemEventModel[]): Promise<void>;
  listForItem(itemId: string): Promise<ItemEventModel[]>;
  listForItems(itemIds: string[]): Promise<ItemEventModel[]>;
}

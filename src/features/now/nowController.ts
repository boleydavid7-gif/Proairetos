import type { NowViewModel } from './types';
import { getNowItems } from './nowQueries';

export async function buildNowView(): Promise<NowViewModel> {
  const items = await getNowItems();

  return {
    items,
    hasAttentionItems: items.length > 0,
  };
}

export type NowQuerySource =
  | "scheduled"
  | "important"
  | "check_back"
  | "unsorted";

export type NowQueryOptions = {
  includeSources?: NowQuerySource[];
};

export type NowQueryResult = {
  scheduled: unknown[];
  important: unknown[];
  checkBack: unknown[];
  unsorted: unknown[];
};

export function createEmptyNowResult(): NowQueryResult {
  return {
    scheduled: [],
    important: [],
    checkBack: [],
    unsorted: [],
  };
}

import type { NowQueryResult } from "./nowQueries";
import { createEmptyNowResult } from "./nowQueries";

/**
 * Builds the Now view from already approved data sources.
 * This layer does not rank, recommend, or interpret.
 */
export function buildNowView(): NowQueryResult {
  return createEmptyNowResult();
}

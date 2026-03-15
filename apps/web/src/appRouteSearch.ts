import { type DiffRouteSearch, parseDiffRouteSearch } from "./diffRouteSearch";
import { type ProjectToolsSearch, parseProjectToolsSearch } from "./projectTools";

export type AppRouteSearch = DiffRouteSearch & ProjectToolsSearch;

export function parseAppRouteSearch(search: Record<string, unknown>): AppRouteSearch {
  return {
    ...parseDiffRouteSearch(search),
    ...parseProjectToolsSearch(search),
  };
}

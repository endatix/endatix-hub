import type { SurveyCreatorModel } from "survey-creator-core";
import {
  parseCreatorTabUrlSlug,
  type EndatixCreatorTabId,
} from "@/lib/survey-js";
import { resolveCreatorTab } from "./resolve-creator-tab";

/** Applies `?tab=` to the Creator and returns the tab that actually won. */
export function loadTabFromUrl(
  creator: SurveyCreatorModel,
  queryValue: string | null | undefined,
): EndatixCreatorTabId {
  const resolved = resolveCreatorTab(
    creator,
    parseCreatorTabUrlSlug(queryValue),
  );
  if (creator.activeTab !== resolved) {
    creator.activeTab = resolved;
  }
  return resolved;
}

import type {
  ActiveTabChangedEvent,
  SurveyCreatorModel,
} from "survey-creator-core";
import {
  parseCreatorTabUrlSlug,
  serializeCreatorTabUrlSlug,
  type EndatixCreatorTabId,
} from "@/lib/survey-js";
import { resolveCreatorTab } from "../use-cases/resolve-creator-tab";

const CREATOR_TAB_URL_BOUND_KEY = "__endatixCreatorTabUrlBound";

export function applyCreatorTabFromQuery(
  creator: SurveyCreatorModel,
  queryValue: string | null | undefined,
): EndatixCreatorTabId {
  const requested = parseCreatorTabUrlSlug(queryValue);
  const resolved = resolveCreatorTab(creator, requested);
  if (creator.activeTab !== resolved) {
    creator.activeTab = resolved;
  }
  return resolved;
}

export function bindCreatorTabQuerySync(
  creator: SurveyCreatorModel,
  onTabId: (tabId: EndatixCreatorTabId) => void,
): () => void {
  const creatorWithFlags = creator as SurveyCreatorModel &
    Record<string, unknown>;
  if (creatorWithFlags[CREATOR_TAB_URL_BOUND_KEY]) {
    return () => {};
  }
  creatorWithFlags[CREATOR_TAB_URL_BOUND_KEY] = true;

  const onTabChanged = (
    _: SurveyCreatorModel,
    options: ActiveTabChangedEvent,
  ) => {
    const resolved = resolveCreatorTab(creator, options.tabName);
    onTabId(resolved);
  };

  creator.onActiveTabChanged.add(onTabChanged);

  return () => {
    creator.onActiveTabChanged.remove(onTabChanged);
    creatorWithFlags[CREATOR_TAB_URL_BOUND_KEY] = false;
  };
}

export function serializeCreatorTabQueryValue(
  tabId: EndatixCreatorTabId,
): string | null {
  return serializeCreatorTabUrlSlug(tabId);
}

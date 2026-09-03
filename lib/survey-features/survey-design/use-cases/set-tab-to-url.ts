import type {
  ActiveTabChangedEvent,
  SurveyCreatorModel,
} from "survey-creator-core";
import {
  serializeCreatorTabUrlSlug,
  type EndatixCreatorTabId,
} from "@/lib/survey-js";
import { resolveCreatorTab } from "./resolve-creator-tab";

const boundCreators = new WeakSet<SurveyCreatorModel>();

export function setTabToUrlQueryValue(
  tabId: EndatixCreatorTabId,
): string | null {
  return serializeCreatorTabUrlSlug(tabId);
}

export function bindSetTabToUrl(
  creator: SurveyCreatorModel,
  onQueryValue: (queryValue: string | null) => void,
): () => void {
  if (boundCreators.has(creator)) {
    return () => {};
  }
  boundCreators.add(creator);

  const onTabChanged = (
    _: SurveyCreatorModel,
    options: ActiveTabChangedEvent,
  ) => {
    onQueryValue(
      setTabToUrlQueryValue(resolveCreatorTab(creator, options.tabName)),
    );
  };

  creator.onActiveTabChanged.add(onTabChanged);

  return () => {
    creator.onActiveTabChanged.remove(onTabChanged);
    boundCreators.delete(creator);
  };
}

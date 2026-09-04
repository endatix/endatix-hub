import type {
  ActiveTabChangedEvent,
  SurveyCreatorModel,
} from "survey-creator-core";
import { serializeCreatorTabUrlSlug } from "@/lib/survey-js";
import { resolveCreatorTab } from "./resolve-creator-tab";

/** Mirrors Creator tab changes into the `?tab=` query. Returns an unsubscribe. */
export function bindSetTabToUrl(
  creator: SurveyCreatorModel,
  onQueryValue: (queryValue: string | null) => void,
): () => void {
  const onTabChanged = (
    _: SurveyCreatorModel,
    options: ActiveTabChangedEvent,
  ) => {
    onQueryValue(
      serializeCreatorTabUrlSlug(resolveCreatorTab(creator, options.tabName)),
    );
  };

  creator.onActiveTabChanged.add(onTabChanged);

  return () => creator.onActiveTabChanged.remove(onTabChanged);
}

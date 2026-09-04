import {
  canonicalizeCreatorTabId,
  DEFAULT_CREATOR_TAB,
  type EndatixCreatorTabId,
} from "@/lib/survey-js";

/**
 * `creator.tabs` is the tab bar after `showThemeTab` & friends were applied.
 * Do not probe `creator.getPlugin` instead: it answers for hidden tabs and
 * instantiates the plugin as a side effect.
 */
export type CreatorTabListSource = {
  tabs?: Array<{ id?: string; name?: string }>;
};

/** The tab this Creator can actually show for `tabId`, else Design. */
export function resolveCreatorTab(
  creator: CreatorTabListSource,
  tabId: string,
): EndatixCreatorTabId {
  const canonical = canonicalizeCreatorTabId(tabId);
  const isOnCreator = creator.tabs?.some(
    (tab) => tab.id === canonical || tab.name === canonical,
  );

  return canonical && isOnCreator ? canonical : DEFAULT_CREATOR_TAB;
}

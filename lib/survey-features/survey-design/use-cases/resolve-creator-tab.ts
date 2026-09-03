import {
  canonicalizeCreatorTabId,
  DEFAULT_CREATOR_TAB,
  type EndatixCreatorTabId,
} from "@/lib/survey-js";

export type CreatorTabListSource = {
  tabs?: Array<{ id?: string; name?: string }>;
  getPlugin?: (name: string) => unknown;
};

export function listCreatorTabIds(creator: CreatorTabListSource): Set<string> {
  const ids = new Set<string>();
  for (const tab of creator.tabs ?? []) {
    if (tab.id) {
      ids.add(tab.id);
    }
    if (tab.name) {
      ids.add(tab.name);
    }
  }
  return ids;
}

function creatorHasTab(creator: CreatorTabListSource, tabId: string): boolean {
  if (creator.getPlugin?.(tabId)) {
    return true;
  }
  return listCreatorTabIds(creator).has(tabId);
}

export function resolveCreatorTab(
  creator: CreatorTabListSource,
  tabId: string,
): EndatixCreatorTabId {
  const canonical = canonicalizeCreatorTabId(tabId);
  if (!canonical) {
    return DEFAULT_CREATOR_TAB;
  }

  if (!creatorHasTab(creator, canonical) && !creatorHasTab(creator, tabId)) {
    return DEFAULT_CREATOR_TAB;
  }

  return canonical;
}

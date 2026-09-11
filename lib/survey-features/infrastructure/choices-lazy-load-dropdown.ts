/**
 * SurveyJS `DropdownListModel` internals that lazy-loaded choice editors have to
 * reach for. None of this is public API - keep the pokes here so a `survey-core`
 * upgrade has one file to re-check (see `scripts/upgrade-surveyjs.mjs`).
 */

const NOOP = () => {};

/** Distance from the list bottom that counts as "the loading row is in view". */
const LOADING_ROW_SCROLL_PX = 48;

export type ScrollContainer = {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

export type LazyChoiceQuestion = {
  choicesLazyLoadEnabled?: boolean;
  choicesLazyLoadPageSize?: number;
  searchEnabled?: boolean;
  choices?: unknown[];
  dropdownListModel?: {
    updateQuestionChoices?: () => void;
    itemsSettings?: { items?: unknown[]; totalCount?: number };
    popupModel?: {
      isVisible?: boolean;
      onVisibilityChanged?: {
        add: (
          handler: (sender: unknown, options: { isVisible: boolean }) => void,
        ) => void;
        remove: (
          handler: (sender: unknown, options: { isVisible: boolean }) => void,
        ) => void;
      };
    };
    listModel?: {
      isAllDataLoaded?: boolean;
      scrollableContainer?: ScrollContainer | null;
      setLoadingIndicatorVisibilityObserver?: (
        handler: (isVisible: boolean) => void,
      ) => void;
      loadingIndicator?: {
        intersectionVisibilityObserver?: { disconnect: () => void };
        initLoadingIndicatorVisibilityObserver?: (
          handler: (isVisible: boolean) => void,
        ) => void;
      };
    };
  };
};

/** Dedupe key for a choice. Empty when the item carries no usable value. */
export function choiceValue(item: unknown): string {
  if (typeof item === "string") {
    return item;
  }
  if (typeof item === "number") {
    return String(item);
  }
  if (item === null || typeof item !== "object") {
    return "";
  }

  const { value, id } = item as { value?: unknown; id?: unknown };
  const key = value ?? id;
  return typeof key === "string" || typeof key === "number" ? String(key) : "";
}

export function uniqueChoices(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = choiceValue(item);
    if (key === "" || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/** Keys already rendered, across both the lazy buffer and the live choices. */
export function existingChoiceKeys(question: LazyChoiceQuestion): Set<string> {
  const items = question.dropdownListModel?.itemsSettings?.items ?? [];
  const choices = question.choices ?? [];
  return new Set([...items, ...choices].map(choiceValue));
}

/** Collapses the lazy buffer and the live choices onto one deduped list. */
export function applyUniqueChoices(question: LazyChoiceQuestion): unknown[] {
  const settings = question.dropdownListModel?.itemsSettings;
  const unique = uniqueChoices([
    ...(settings?.items ?? []),
    ...(question.choices ?? []),
  ]);
  if (settings) {
    settings.items = unique;
  }
  question.choices = unique;
  return unique;
}

/** Drops every loaded choice so the next page starts from an empty list. */
export function resetLazyChoices(question: LazyChoiceQuestion): void {
  const settings = question.dropdownListModel?.itemsSettings;
  if (settings) {
    settings.items = [];
  }
  question.choices = [];
}

/**
 * `setItems` only clears the loading row when the buffered item count equals the
 * reported total, which dedupe breaks. Settle both once the last page is in.
 */
export function markAllChoicesLoaded(
  question: LazyChoiceQuestion,
  count: number,
): void {
  const dropdown = question.dropdownListModel;
  if (dropdown?.itemsSettings) {
    dropdown.itemsSettings.totalCount = count;
  }
  if (dropdown?.listModel) {
    dropdown.listModel.isAllDataLoaded = true;
  }
}

/**
 * `scrollableContainer` is a getter over `listContainerHtmlElement`, which the
 * vendor leaves undefined once the list unmounts - reading it then throws.
 */
function readScrollableContainer(
  listModel: NonNullable<
    NonNullable<LazyChoiceQuestion["dropdownListModel"]>["listModel"]
  >,
): ScrollContainer | null {
  try {
    return listModel.scrollableContainer ?? null;
  } catch {
    return null;
  }
}

function isScrolledToLoadingRow(
  container: ScrollContainer | null | undefined,
): boolean {
  if (!container) {
    return false;
  }
  return (
    container.scrollHeight - container.scrollTop - container.clientHeight <
    LOADING_ROW_SCROLL_PX
  );
}

/**
 * SurveyJS observes the loading row against the viewport, so it fires when the
 * row is clipped in the list or when the popup closes. Only fetch more when the
 * popup is open and the list is scrolled to that row. The handler must still be
 * a function - otherwise IntersectionObserver throws `handler is not a function`.
 */
export function bindLoadingIndicatorObserver(
  question: LazyChoiceQuestion,
): () => void {
  const dropdown = question.dropdownListModel;
  const listModel = dropdown?.listModel;
  if (!dropdown || !listModel?.setLoadingIndicatorVisibilityObserver) {
    return NOOP;
  }
  const list = listModel;

  // The element the scroll listener is on. Never re-read the getter to detach:
  // it can throw, and after a re-render it can answer with a different node.
  let scrollTarget: ScrollContainer | null = null;

  const detachScrollListener = () => {
    scrollTarget?.removeEventListener?.("scroll", requestNextPageIfNeeded);
    scrollTarget = null;
  };

  function requestNextPageIfNeeded() {
    if (!dropdown?.popupModel?.isVisible) {
      return;
    }
    if (!isScrolledToLoadingRow(readScrollableContainer(list))) {
      return;
    }
    dropdown.updateQuestionChoices?.();
  }

  const onVisible = (isVisible: boolean) => {
    if (isVisible) {
      requestNextPageIfNeeded();
    }
  };

  list.setLoadingIndicatorVisibilityObserver?.(onVisible);
  const indicator = list.loadingIndicator;
  indicator?.intersectionVisibilityObserver?.disconnect();
  indicator?.initLoadingIndicatorVisibilityObserver?.(onVisible);

  const onPopupVisibility = (_: unknown, options: { isVisible: boolean }) => {
    detachScrollListener();
    if (!options.isVisible) {
      return;
    }

    const container = readScrollableContainer(list);
    if (!container?.addEventListener) {
      return;
    }
    container.addEventListener("scroll", requestNextPageIfNeeded);
    scrollTarget = container;
  };
  dropdown.popupModel?.onVisibilityChanged?.add(onPopupVisibility);

  return () => {
    detachScrollListener();
    dropdown.popupModel?.onVisibilityChanged?.remove(onPopupVisibility);
  };
}

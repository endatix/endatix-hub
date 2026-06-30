import type {
  ChoicesSearchEvent,
  ItemValue,
  Model,
  PopupVisibleChangedEvent,
  Question,
  ValueChangedEvent,
} from "survey-core";
import { BLIND_SEARCH_HANDLERS_ATTACHED_KEY } from "../constants";
import type { BlindSearchRuntimeState, BlindSearchTagboxQuestion } from "../types";
import {
  filterChoicesBySearch,
  isBlindSearchEnabled,
  isBlindSearchTagboxQuestion,
  isOtherInQuestionValue,
  shouldEnableOtherFallback,
  shouldSuppressChoices,
  usesLazyLoadedChoices,
} from "../use-cases/blind-search-state";

const runtimeStateByQuestion = new WeakMap<Question, BlindSearchRuntimeState>();
const trackedQuestionsByModel = new WeakMap<Model, Set<Question>>();
const boundModelsForTests = new Set<Model>();

function trackQuestionForModel(model: Model, question: Question): void {
  let tracked = trackedQuestionsByModel.get(model);
  if (!tracked) {
    tracked = new Set();
    trackedQuestionsByModel.set(model, tracked);
  }

  tracked.add(question);
}

function getRuntimeState(question: Question): BlindSearchRuntimeState {
  let state = runtimeStateByQuestion.get(question);
  if (!state) {
    state = {
      originalShowOtherItem: false,
      isOtherForced: false,
    };
    runtimeStateByQuestion.set(question, state);

    const model = question.survey as Model | null;
    if (model) {
      trackQuestionForModel(model, question);
    }
  }

  return state;
}

function captureOriginalShowOtherItem(
  question: BlindSearchTagboxQuestion,
  state: BlindSearchRuntimeState,
): void {
  if (!state.isOtherForced) {
    state.originalShowOtherItem = question.showOtherItem;
  }
}

function enableOtherFallback(question: BlindSearchTagboxQuestion): void {
  const state = getRuntimeState(question);
  captureOriginalShowOtherItem(question, state);

  if (!question.showOtherItem) {
    question.showOtherItem = true;
    state.isOtherForced = true;
  }
}

function restoreOtherIfForced(question: BlindSearchTagboxQuestion): void {
  const state = runtimeStateByQuestion.get(question);
  if (!state?.isOtherForced) {
    return;
  }

  question.showOtherItem = state.originalShowOtherItem;
  state.isOtherForced = false;
}

function restoreOtherStatesForModel(model: Model): void {
  const tracked = trackedQuestionsByModel.get(model);
  if (!tracked) {
    return;
  }

  for (const question of tracked) {
    const state = runtimeStateByQuestion.get(question);
    if (!isBlindSearchTagboxQuestion(question) || !state?.isOtherForced) {
      continue;
    }

    question.showOtherItem = state.originalShowOtherItem;
    state.isOtherForced = false;
  }

  trackedQuestionsByModel.delete(model);
}

type DropdownListModelInternals = {
  filterString?: string;
  filteredItems?: ItemValue[];
  listModel: {
    actions: ItemValue[];
    setItems: (items: ItemValue[]) => void;
  };
  updateItems: () => void;
  choicesLazyLoadEnabled?: boolean;
  popupModel?: {
    isVisible?: boolean;
    hide?: () => void;
  };
};

function getTagboxDropdownListModel(
  question: Question,
): DropdownListModelInternals | undefined {
  if (!isBlindSearchTagboxQuestion(question)) {
    return undefined;
  }

  const dropdown = question.dropdownListModel;
  if (!dropdown) {
    return undefined;
  }

  return dropdown as unknown as DropdownListModelInternals;
}

function closeTagboxDropdownPopup(question: BlindSearchTagboxQuestion): void {
  const dropdown = getTagboxDropdownListModel(question);
  if (dropdown?.popupModel?.isVisible) {
    dropdown.popupModel.hide?.();
  }
}

function clearDropdownChoiceList(question: Question): void {
  const dropdown = getTagboxDropdownListModel(question);
  if (!dropdown || dropdown.choicesLazyLoadEnabled) {
    return;
  }

  dropdown.filteredItems = [];
  dropdown.listModel.setItems([]);
}

function restoreDropdownChoiceList(question: Question): void {
  const dropdown = getTagboxDropdownListModel(question);
  if (!dropdown || dropdown.choicesLazyLoadEnabled) {
    return;
  }

  if (dropdown.listModel.actions.length === 0) {
    dropdown.updateItems();
  }
}

function syncDropdownFilteredItems(
  question: Question,
  filteredChoices: ItemValue[],
): void {
  const dropdown = getTagboxDropdownListModel(question);
  if (!dropdown) {
    return;
  }

  dropdown.filteredItems = filteredChoices;
  dropdown.listModel.setItems(filteredChoices);
}

function syncOtherOnlyInDropdown(question: BlindSearchTagboxQuestion): void {
  const otherItem = question.otherItem;
  if (!otherItem) {
    return;
  }

  syncDropdownFilteredItems(question, [otherItem]);
}

function applyInlineOtherFallback(
  tagboxQuestion: BlindSearchTagboxQuestion,
  options: ChoicesSearchEvent,
): void {
  const otherItem = tagboxQuestion.otherItem;
  options.filteredChoices = otherItem ? [otherItem] : [];
  syncOtherOnlyInDropdown(tagboxQuestion);
}

export function applyBlindSearchOtherFallbackAfterLazyLoad(
  question: Question,
  filter: string,
  itemCount: number,
): void {
  if (!question.survey || !isBlindSearchEnabled(question)) {
    return;
  }

  const tagboxQuestion = question as BlindSearchTagboxQuestion;
  if (shouldEnableOtherFallback(question, filter, itemCount)) {
    syncOtherOnlyInDropdown(tagboxQuestion);
    return;
  }

  restoreOtherIfForced(tagboxQuestion);
}

function handleChoicesSearch(_: Model, options: ChoicesSearchEvent): void {
  const question = options.question;
  if (!isBlindSearchEnabled(question)) {
    return;
  }

  const filter = options.filter ?? "";
  const tagboxQuestion = question as BlindSearchTagboxQuestion;

  if (shouldSuppressChoices(question, filter)) {
    options.filteredChoices = [];
    clearDropdownChoiceList(question);
    if (filter.trim().length > 0) {
      restoreOtherIfForced(tagboxQuestion);
    }
    return;
  }

  if (usesLazyLoadedChoices(question)) {
    return;
  }

  restoreDropdownChoiceList(question);
  options.filteredChoices = filterChoicesBySearch(
    tagboxQuestion,
    options.choices,
    filter,
  );

  const matchCount = options.filteredChoices.length;
  if (shouldEnableOtherFallback(question, filter, matchCount)) {
    applyInlineOtherFallback(tagboxQuestion, options);
    return;
  }

  syncDropdownFilteredItems(tagboxQuestion, options.filteredChoices);
  restoreOtherIfForced(tagboxQuestion);
}

function handlePopupVisibleChanged(
  _: Model,
  options: PopupVisibleChangedEvent,
): void {
  if (!isBlindSearchEnabled(options.question)) {
    return;
  }

  const tagboxQuestion = options.question as BlindSearchTagboxQuestion;

  if (!options.visible) {
    clearDropdownChoiceList(options.question);
    if (!isOtherInQuestionValue(tagboxQuestion)) {
      restoreOtherIfForced(tagboxQuestion);
    }
    return;
  }

  queueMicrotask(() => {
    if (isOtherInQuestionValue(tagboxQuestion)) {
      closeTagboxDropdownPopup(tagboxQuestion);
      return;
    }

    const dropdown = getTagboxDropdownListModel(options.question);
    const filter = dropdown?.filterString ?? "";

    if (shouldSuppressChoices(options.question, filter)) {
      clearDropdownChoiceList(options.question);
    }
  });
}

function handleValueChanged(_: Model, options: ValueChangedEvent): void {
  const question = options.question;
  if (!isBlindSearchEnabled(question)) {
    return;
  }

  const tagboxQuestion = question as BlindSearchTagboxQuestion;
  if (isOtherInQuestionValue(tagboxQuestion)) {
    enableOtherFallback(tagboxQuestion);
    closeTagboxDropdownPopup(tagboxQuestion);
    return;
  }

  restoreOtherIfForced(tagboxQuestion);
}

export function bindBlindSearchToSurvey(model: Model): () => void {
  const modelWithFlags = model as Model & Record<string, unknown>;
  if (modelWithFlags[BLIND_SEARCH_HANDLERS_ATTACHED_KEY]) {
    return () => {};
  }
  modelWithFlags[BLIND_SEARCH_HANDLERS_ATTACHED_KEY] = true;
  boundModelsForTests.add(model);

  model.onChoicesSearch.add(handleChoicesSearch);
  model.onPopupVisibleChanged.add(handlePopupVisibleChanged);
  model.onValueChanged.add(handleValueChanged);

  return () => {
    model.onChoicesSearch.remove(handleChoicesSearch);
    model.onPopupVisibleChanged.remove(handlePopupVisibleChanged);
    model.onValueChanged.remove(handleValueChanged);
    restoreOtherStatesForModel(model);
    boundModelsForTests.delete(model);
    modelWithFlags[BLIND_SEARCH_HANDLERS_ATTACHED_KEY] = false;
  };
}

export function clearBlindSearchRuntimeStateForTests(): void {
  for (const model of boundModelsForTests) {
    restoreOtherStatesForModel(model);
  }

  boundModelsForTests.clear();
}

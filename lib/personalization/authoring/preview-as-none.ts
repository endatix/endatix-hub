import { Action, ComputedUpdater, type ListModel } from "survey-core";
import { getLocString, type TabTestPlugin } from "survey-creator-core";

// Survey Creator 3.2.2's selector lists only the presets, so after picking one there is no way back
// to None, and it hides itself below two presets. This is the only file that reaches into the
// Preview view model for it, and for the Find participant action it puts in the page toolbar:
// re-check it on every SurveyJS upgrade (the tests fail if it breaks).

/** The Preview view model members this file relies on; the two methods are private. */
type PreviewView = {
  selectVariablePresetAction: Action;
  pages: { actions: Action[] };
  isSurveyRunning(): boolean;
  updateVariablePresetActions(): void;
};

/** Find participant, for participants past the ones the selector lists. */
export type FindParticipantOption = {
  /** True while the form has more participants than the variables read sent. */
  hasMore(): boolean;
  find(): void;
};

const NONE_ID = "";
const FIND_ID = "endatix-find-participant";
/** Each extended view's undo, so a second call for the same view hands back the same one. */
const undos = new WeakMap<PreviewView, () => void>();

/**
 * Adds None as the selector's first item to the Preview built for the current activation, and,
 * when given, a Find participant action after the selector. Returns how to take both out again.
 */
export function extendPreviewAs(
  plugin: TabTestPlugin,
  findParticipant?: FindParticipantOption,
): () => void {
  const view = plugin.model as unknown as PreviewView | undefined;
  if (!view) return () => undefined;
  const known = undos.get(view);
  if (known) return known;

  const find = findParticipant && addFindAction(view, findParticipant);
  const refresh = () => {
    const shown = prependNone(view, plugin.variablePresets.active);
    find?.show(shown);
  };
  const original = runAfterUpdates(view, refresh);
  refresh();
  const undo = () => restore(view, original, find);
  undos.set(view, undo);
  return undo;
}

/** Runs `after` each time Creator rebuilds the selector; returns Creator's own method. */
function runAfterUpdates(view: PreviewView, after: () => void): () => void {
  const original = view.updateVariablePresetActions;
  view.updateVariablePresetActions = () => {
    original.call(view);
    after();
  };
  return original;
}

/** Puts Creator's own selector back, without None, and takes Find participant out. */
function restore(
  view: PreviewView,
  original: () => void,
  find: FindAction | undefined,
): void {
  undos.delete(view);
  view.updateVariablePresetActions = original;
  find?.remove();
  original.call(view);
}

/** Returns whether the selector has participants to show. */
function prependNone(view: PreviewView, activeName: string): boolean {
  const action = view.selectVariablePresetAction;
  const list = action.popupModel.contentComponentData.model as ListModel;
  const presets = list.actions
    .filter((item) => item.id !== NONE_ID)
    .map((item) => ({ id: item.id, title: item.title }));
  const none = { id: NONE_ID, title: getLocString("vp.noPreset") };

  list.setItems([none, ...presets]);
  list.selectedItem =
    list.actions.find((item) => item.id === activeName) ?? list.actions[0];
  action.visible = new ComputedUpdater(
    () => presets.length > 0 && view.isSurveyRunning(),
  ) as unknown as boolean;
  return presets.length > 0;
}

type FindAction = { show(selectorShown: boolean): void; remove(): void };

/**
 * The action, put after the selector. It shows with the selector while participants are left out
 * of it, and goes back in when Preview rebuilds its toolbar (`buildActions` replaces the list).
 */
function addFindAction(
  view: PreviewView,
  { find, hasMore }: FindParticipantOption,
): FindAction {
  const action = new Action({
    id: FIND_ID,
    css: "svc-variable-presets-view",
    title: "Find participant",
    visible: false,
    action: () => find(),
  });
  return {
    show: (selectorShown) => showFind(view, action, selectorShown && hasMore()),
    remove: () => {
      view.pages.actions = view.pages.actions.filter((a) => a !== action);
    },
  };
}

function showFind(view: PreviewView, action: Action, visible: boolean): void {
  if (!view.pages.actions.includes(action)) insertAfterSelector(view, action);
  action.visible = new ComputedUpdater(
    () => visible && view.isSurveyRunning(),
  ) as unknown as boolean;
}

function insertAfterSelector(view: PreviewView, action: Action): void {
  const actions = view.pages.actions;
  const at = actions.indexOf(view.selectVariablePresetAction) + 1;
  view.pages.actions = [...actions.slice(0, at), action, ...actions.slice(at)];
}

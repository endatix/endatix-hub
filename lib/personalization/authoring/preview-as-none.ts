import { Action, ComputedUpdater, type ListModel } from "survey-core";
import { getLocString, type TabTestPlugin } from "survey-creator-core";

// Survey Creator 3.2.2's selector lists only the presets, so after picking one there is no way back
// to None, and it hides itself below two presets. This is the only file that reaches into the
// Preview view model for it: re-check it on every SurveyJS upgrade (the tests fail if it breaks).

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
const extended = new WeakSet<PreviewView>();

/**
 * Adds None as the selector's first item to the Preview built for the current activation, and,
 * when given, a Find participant action after the selector.
 */
export function extendPreviewAs(
  plugin: TabTestPlugin,
  findParticipant?: FindParticipantOption,
): void {
  const view = plugin.model as unknown as PreviewView | undefined;
  if (!view || extended.has(view)) return;

  extended.add(view);
  const showFind = findParticipant
    ? addFindAction(view, findParticipant)
    : () => undefined;
  const refresh = () =>
    showFind(prependNone(view, plugin.variablePresets.active));
  const update = view.updateVariablePresetActions.bind(view);
  view.updateVariablePresetActions = () => {
    update();
    refresh();
  };
  refresh();
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

/** Returns how to show the action: with the selector, while participants are left out of it. */
function addFindAction(
  view: PreviewView,
  { find, hasMore }: FindParticipantOption,
): (selectorShown: boolean) => void {
  const action = new Action({
    id: FIND_ID,
    css: "svc-variable-presets-view",
    title: "Find participant",
    visible: false,
    action: () => find(),
  });
  insertAfterSelector(view, action);
  return (selectorShown) => {
    const visible = selectorShown && hasMore();
    action.visible = new ComputedUpdater(
      () => visible && view.isSurveyRunning(),
    ) as unknown as boolean;
  };
}

function insertAfterSelector(view: PreviewView, action: Action): void {
  const actions = view.pages.actions;
  const at = actions.indexOf(view.selectVariablePresetAction) + 1;
  view.pages.actions = [...actions.slice(0, at), action, ...actions.slice(at)];
}

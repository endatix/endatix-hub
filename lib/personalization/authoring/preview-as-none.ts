import { ComputedUpdater, type Action, type ListModel } from "survey-core";
import { getLocaleStrings, type TabTestPlugin } from "survey-creator-core";

// Survey Creator 3.2.2's selector lists only the presets, so after picking one there is no way back
// to None, and it hides itself below two presets. This is the only file that reaches into the
// Preview view model for it: re-check it on every SurveyJS upgrade (the tests fail if it breaks).

/** The Preview view model members this file relies on; the two methods are private. */
type PreviewView = {
  selectVariablePresetAction: Action;
  isSurveyRunning(): boolean;
  updateVariablePresetActions(): void;
};

const NONE_ID = "";
const withNone = new WeakSet<PreviewView>();

/** Adds None as the selector's first item to the Preview built for the current activation. */
export function addNoneToPreviewAs(plugin: TabTestPlugin): void {
  const view = plugin.model as unknown as PreviewView | undefined;
  if (!view || withNone.has(view)) return;

  withNone.add(view);
  const update = view.updateVariablePresetActions.bind(view);
  view.updateVariablePresetActions = () => {
    update();
    prependNone(view, plugin.variablePresets.active);
  };
  prependNone(view, plugin.variablePresets.active);
}

function prependNone(view: PreviewView, activeName: string): void {
  const action = view.selectVariablePresetAction;
  const list = action.popupModel.contentComponentData.model as ListModel;
  const presets = list.actions
    .filter((item) => item.id !== NONE_ID)
    .map((item) => ({ id: item.id, title: item.title }));
  const none = { id: NONE_ID, title: getLocaleStrings("en").vp.noPreset };

  list.setItems([none, ...presets]);
  list.selectedItem =
    list.actions.find((item) => item.id === activeName) ?? list.actions[0];
  action.visible = new ComputedUpdater(
    () => presets.length > 0 && view.isSurveyRunning(),
  ) as unknown as boolean;
}

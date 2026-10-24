import { ComputedUpdater, type Action, type ListModel } from "survey-core";
import { getLocString, type TabTestPlugin } from "survey-creator-core";

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
const MORE_ID = "endatix-more-participants";
const withNone = new WeakSet<PreviewView>();

/**
 * Adds None as the selector's first item to the Preview built for the current activation, and,
 * when the API sent only some participants, a last item that says how many are left out.
 */
export function addNoneToPreviewAs(
  plugin: TabTestPlugin,
  hiddenCount: () => number,
): void {
  const view = plugin.model as unknown as PreviewView | undefined;
  if (!view || withNone.has(view)) return;

  withNone.add(view);
  const update = view.updateVariablePresetActions.bind(view);
  view.updateVariablePresetActions = () => {
    update();
    prependNone(view, plugin.variablePresets.active, hiddenCount());
  };
  prependNone(view, plugin.variablePresets.active, hiddenCount());
}

function prependNone(
  view: PreviewView,
  activeName: string,
  hidden: number,
): void {
  const action = view.selectVariablePresetAction;
  const list = action.popupModel.contentComponentData.model as ListModel;
  const presets = list.actions
    .filter((item) => item.id !== NONE_ID && item.id !== MORE_ID)
    .map((item) => ({ id: item.id, title: item.title }));
  const none = { id: NONE_ID, title: getLocString("vp.noPreset") };
  const more =
    hidden > 0
      ? [
          {
            id: MORE_ID,
            title: `${hidden} more in the Audience tab`,
            enabled: false,
          },
        ]
      : [];

  list.setItems([none, ...presets, ...more]);
  list.selectedItem =
    list.actions.find((item) => item.id === activeName) ?? list.actions[0];
  action.visible = new ComputedUpdater(
    () => presets.length > 0 && view.isSurveyRunning(),
  ) as unknown as boolean;
}

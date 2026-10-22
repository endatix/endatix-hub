import type { ISurveyVariablePresets } from "survey-core";
import {
  getLocaleStrings,
  type SurveyCreatorModel,
  type TabTestPlugin,
} from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { canonicalizeCreatorTabId, ENDATIX_CREATOR_TAB } from "@/lib/survey-js";
import { addNoneToPreviewAs } from "./preview-as-none";
import { toSurveyPresets } from "./to-survey-presets";

export interface CreatorHooks {
  /** Reads the form's variables again (a property or participant edited in the Audience tab). */
  refresh(): Promise<Result<AudienceVariables>>;
}

export type CreatorBinding = {
  /** Unbinds: no further reads, and a read in flight is dropped. */
  (): void;
  refresh(): Promise<void>;
};

/** Audience words for every `vp.*` string the Creator shows: "preset" never reaches the screen. */
export function initGlobals(): void {
  Object.assign(getLocaleStrings("en").vp, {
    selectorTitle: "Preview as",
    noPreset: "None",
    view: "Test participant values",
    viewTitle: "Variable values",
    edit: "Edit test participant values",
    editorTitle: "Test participant values",
    presetName: "Test participant",
    addPreset: "Add test participant",
    newPresetName: "New test participant",
    deletePreset: "Remove test participant",
    presetNameIsNotUnique: "A test participant with this identifier exists",
    presetNameIsEmpty: "Enter the test participant's identifier",
    listNameColumn: "Test participant",
  });
}

/** The Preview plugin, only when Preview is a tab (`getPlugin` alone would create it). */
function previewPlugin(creator: SurveyCreatorModel): TabTestPlugin | null {
  const hasPreview = creator.tabs.some(
    (tab) => canonicalizeCreatorTabId(tab.id) === ENDATIX_CREATOR_TAB.preview,
  );
  if (!hasPreview) return null;
  return creator.getPlugin(ENDATIX_CREATOR_TAB.preview) as TabTestPlugin;
}

function applyVariables(
  creator: SurveyCreatorModel,
  variables: AudienceVariables,
): void {
  const presets = variables.variablePresets;
  // No properties any more: an empty container hides Preview as again. The setter's type has no
  // empty case, though the Creator handles one.
  creator.variablePresets = presets
    ? toSurveyPresets(presets)
    : (undefined as unknown as ISurveyVariablePresets);

  const manager = previewPlugin(creator)?.variablePresets;
  if (manager) {
    Object.assign(manager, variables.editing);
  }
}

/** Calls `onOpen` whenever the Preview tab opens, and once now when it is open already. */
function onPreviewOpened(
  creator: SurveyCreatorModel,
  onOpen: (plugin: TabTestPlugin, atBind: boolean) => void,
): () => void {
  const openPreview = (atBind: boolean) => {
    const isPreview =
      canonicalizeCreatorTabId(creator.activeTab) ===
      ENDATIX_CREATOR_TAB.preview;
    const plugin = isPreview ? previewPlugin(creator) : null;
    if (plugin) onOpen(plugin, atBind);
  };
  const onActiveTabChanged = () => openPreview(false);
  creator.onActiveTabChanged.add(onActiveTabChanged);
  openPreview(true);
  return () => creator.onActiveTabChanged.remove(onActiveTabChanged);
}

/**
 * Picking a participant writes nothing (Q5): the Creator applies the values to the Preview survey
 * itself, inside its construction callback, so `{variable}` defaults see them. Opening Preview reads
 * the variables again. Preview rebuilds its view model on every activation, so None goes into the
 * selector each time. The designer keeps the binding for the Creator's lifetime.
 */
export function bindToCreator(
  creator: SurveyCreatorModel,
  variables: AudienceVariables,
  hooks: CreatorHooks,
): CreatorBinding {
  initGlobals();
  applyVariables(creator, variables);
  const reads = { latest: 0, bound: true };
  const refresh = () => refreshVariables(creator, hooks, reads);
  const stopWatching = onPreviewOpened(creator, (plugin, atBind) => {
    addNoneToPreviewAs(plugin);
    if (!atBind) void refresh();
  });
  const unbind = () => {
    reads.bound = false;
    stopWatching();
  };
  return Object.assign(unbind, { refresh });
}

/** Only the latest read applies; one that lands after unbind is dropped. */
async function refreshVariables(
  creator: SurveyCreatorModel,
  hooks: CreatorHooks,
  reads: { latest: number; bound: boolean },
): Promise<void> {
  const read = ++reads.latest;
  const fresh = await hooks.refresh();
  if (reads.bound && read === reads.latest && Result.isSuccess(fresh)) {
    applyVariables(creator, fresh.value);
  }
}

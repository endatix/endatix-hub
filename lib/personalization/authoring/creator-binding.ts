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

/** Audience words for the Creator's preset UI; "preset" never reaches the screen. */
export function initGlobals(): void {
  const vp = getLocaleStrings("en").vp;
  vp.selectorTitle = "Preview as";
  vp.noPreset = "None";
  vp.editorTitle = "Test participant values";
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

  const manager = previewPresetManager(creator);
  if (manager) {
    Object.assign(manager, variables.editing);
  }
}

// The manager lives on the Preview plugin, so only look it up when Preview is a tab.
function previewPresetManager(creator: SurveyCreatorModel) {
  const hasPreview = creator.tabs.some(
    (tab) => canonicalizeCreatorTabId(tab.id) === ENDATIX_CREATOR_TAB.preview,
  );
  if (!hasPreview) return null;
  return (creator.getPlugin(ENDATIX_CREATOR_TAB.preview) as TabTestPlugin)
    .variablePresets;
}

/**
 * Calls `onOpen` whenever the Preview tab opens, and once now when it is already open (a `?tab=`
 * deep link activates it before this binds). Returns the unsubscribe.
 */
function onPreviewOpened(
  creator: SurveyCreatorModel,
  onOpen: (atBind: boolean) => void,
): () => void {
  const isPreview = () =>
    canonicalizeCreatorTabId(creator.activeTab) === ENDATIX_CREATOR_TAB.preview;
  const onActiveTabChanged = () => {
    if (isPreview()) onOpen(false);
  };
  creator.onActiveTabChanged.add(onActiveTabChanged);
  if (isPreview()) onOpen(true);
  return () => creator.onActiveTabChanged.remove(onActiveTabChanged);
}

/**
 * Picking a participant writes nothing (Q5): the Creator applies the values to the Preview survey
 * itself, inside its construction callback, so `{variable}` defaults see them. Opening Preview reads
 * the variables again; not at bind, since the page has just loaded them. Preview rebuilds its view
 * model on every activation, so None goes into the selector each time.
 */
export function bindToCreator(
  creator: SurveyCreatorModel,
  variables: AudienceVariables,
  hooks: CreatorHooks,
): CreatorBinding {
  initGlobals();
  applyVariables(creator, variables);
  const state = { bound: true };
  const refresh = () => refreshVariables(creator, hooks, state);
  const stopWatching = onPreviewOpened(creator, (atBind) => {
    addNoneToPreviewAs(creator);
    if (!atBind) void refresh();
  });
  const unbind = () => {
    state.bound = false;
    stopWatching();
  };
  return Object.assign(unbind, { refresh });
}

/** A read that lands after unbind is dropped. */
async function refreshVariables(
  creator: SurveyCreatorModel,
  hooks: CreatorHooks,
  state: { bound: boolean },
): Promise<void> {
  const fresh = await hooks.refresh();
  if (state.bound && Result.isSuccess(fresh)) {
    applyVariables(creator, fresh.value);
  }
}

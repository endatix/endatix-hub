import { Helpers, type ISurveyVariablePresets } from "survey-core";
import {
  editorLocalization,
  getLocaleStrings,
  type SurveyCreatorModel,
  type TabTestPlugin,
} from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { canonicalizeCreatorTabId, ENDATIX_CREATOR_TAB } from "@/lib/survey-js";
import { applyAudienceFix } from "./apply-fix";
import type { AudienceFinding, AudienceReview } from "./findings/types";
import { addNoneToPreviewAs } from "./preview-as-none";
import { reviewAudience } from "./review";
import { toSurveyPresets } from "./to-survey-presets";

export interface CreatorHooks {
  /** Reads the form's variables again (a property or participant edited in the Audience tab). */
  refresh(): Promise<Result<AudienceVariables>>;
}

/** What the designer binds: the variables read with the page, and how to read them again. */
export type DesignerAudience = CreatorHooks & { variables: AudienceVariables };

export type CreatorBinding = {
  /** Unbinds: no further reads, and a read in flight is dropped. */
  (): void;
  refresh(): Promise<void>;
  /** The canvas's Audience findings, against the variables read last. */
  review(): AudienceReview;
  /** Applies a finding's fix to the canvas; a finding without one is left alone. */
  applyFix(finding: AudienceFinding): void;
};

const AUDIENCE_VP_STRINGS = {
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
};

/**
 * Audience words for every `vp.*` string the Creator shows: "preset" never reaches the screen.
 * The Hub is English-only, so a Creator running in another locale gets the same words.
 */
export function initGlobals(): void {
  const locales = new Set(["en", editorLocalization.currentLocale || "en"]);
  for (const locale of locales) {
    const vp = getLocaleStrings(locale)?.vp;
    if (vp) Object.assign(vp, AUDIENCE_VP_STRINGS);
  }
}

/** The Preview plugin, only when Preview is a tab (`getPlugin` alone would create it). */
function previewPlugin(creator: SurveyCreatorModel): TabTestPlugin | null {
  const hasPreview = creator.tabs.some(
    (tab) => canonicalizeCreatorTabId(tab.id) === ENDATIX_CREATOR_TAB.preview,
  );
  if (!hasPreview) return null;
  return creator.getPlugin(ENDATIX_CREATOR_TAB.preview) as TabTestPlugin;
}

type BindingState = {
  variables: AudienceVariables;
  applied: AudienceVariables["variablePresets"] | undefined;
  latest: number;
  bound: boolean;
};

/** Installs a new container only when the presets changed: assigning one rebuilds the selector. */
function applyVariables(
  creator: SurveyCreatorModel,
  variables: AudienceVariables,
  state: BindingState,
): void {
  const presets = variables.variablePresets;
  if (
    state.applied !== undefined &&
    Helpers.isTwoValueEquals(state.applied, presets)
  ) {
    return;
  }
  state.applied = presets;
  // No properties any more: an empty container hides Preview as again. The setter's type has no
  // empty case, though the Creator handles one.
  creator.variablePresets = presets
    ? toSurveyPresets(presets)
    : (undefined as unknown as ISurveyVariablePresets);
  lockValuesEditor(creator);
}

/**
 * Read-only until edits save (endatix#1348): the values editor writes only to the local container,
 * and the next Preview open would replace it, so the API's `editing` gates are not applied yet.
 */
function lockValuesEditor(creator: SurveyCreatorModel): void {
  const manager = previewPlugin(creator)?.variablePresets;
  if (manager) {
    Object.assign(manager, {
      allowAdd: false,
      allowEdit: false,
      allowDelete: false,
    });
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

/** Test participants the API left out of `presets` (it sends the first 20). */
function hiddenParticipants(state: BindingState): number {
  const presets = state.applied;
  return presets
    ? Math.max(0, presets.totalPresets - presets.presets.length)
    : 0;
}

/**
 * Picking a participant writes nothing (Q5): the Creator applies the values to the Preview survey
 * itself, inside its construction callback, so `{variable}` defaults see them. Opening Preview reads
 * the variables again, so Properties added after the page loaded show up too. Preview rebuilds its
 * view model on every activation, so None goes into the selector each time. The designer keeps the
 * binding for the Creator's lifetime.
 */
export function bindToCreator(
  creator: SurveyCreatorModel,
  audience: DesignerAudience,
): CreatorBinding {
  initGlobals();
  const state = newState(audience.variables);
  applyVariables(creator, audience.variables, state);
  const refresh = () => refreshVariables(creator, audience, state);
  const stopWatching = onPreviewOpened(creator, (plugin, atBind) => {
    addNoneToPreviewAs(plugin, () => hiddenParticipants(state));
    if (!atBind) void refresh();
  });
  const unbind = () => {
    state.bound = false;
    stopWatching();
  };
  return Object.assign(unbind, { refresh, ...reviewing(creator, state) });
}

function newState(variables: AudienceVariables): BindingState {
  return { variables, applied: undefined, latest: 0, bound: true };
}

/** Findings against the variables read last, and their fixes on the canvas. */
function reviewing(creator: SurveyCreatorModel, state: BindingState) {
  return {
    review: () => reviewAudience(creator.JSON, state.variables),
    applyFix: (finding: AudienceFinding) => {
      if (finding.kind === "unknown-variable" && finding.fix) {
        applyAudienceFix(creator, finding.fix);
      }
    },
  };
}

/** Only the latest read applies; one that lands after unbind, fails, or throws is dropped. */
async function refreshVariables(
  creator: SurveyCreatorModel,
  hooks: CreatorHooks,
  state: BindingState,
): Promise<void> {
  const read = ++state.latest;
  let fresh: Result<AudienceVariables>;
  try {
    fresh = await hooks.refresh();
  } catch {
    // Offline, or a stale server action after a deploy: keep what Preview has.
    return;
  }
  if (state.bound && read === state.latest && Result.isSuccess(fresh)) {
    state.variables = fresh.value;
    applyVariables(creator, fresh.value, state);
  }
}

import { Helpers, type ISurveyVariablePresets } from "survey-core";
import {
  editorLocalization,
  getLocaleStrings,
  type SurveyCreatorModel,
  type TabTestPlugin,
} from "survey-creator-core";
import type {
  AudienceVariablePreset,
  AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { canonicalizeCreatorTabId, ENDATIX_CREATOR_TAB } from "@/lib/survey-js";
import { applyAudienceFix, canFixOnCanvas } from "./apply-fix";
import type { ParticipantFinder } from "./find-participant";
import type { AudienceFinding, AudienceReview } from "./findings/types";
import type { reviewAudience } from "./review";
import { extendPreviewAs, type FindParticipantOption } from "./preview-as-none";
import { toSurveyPresets } from "./to-survey-presets";

export interface CreatorHooks {
  /** Reads the form's variables again (a property or participant edited in the Audience tab). */
  refresh(): Promise<Result<AudienceVariables>>;
}

/** The variables read with the page, and how to read them again. */
export type BoundAudience = CreatorHooks & { variables: AudienceVariables };

/** What the designer binds, and the reads behind its Find participant. */
export type DesignerAudience = BoundAudience & {
  participants: ParticipantFinder;
};

/** Previews the form as a participant found past the selector, adding them to it. */
export type PreviewAs = (
  preset: AudienceVariablePreset,
  isTest: boolean,
) => void;

/** Opens the designer's Find participant; the pick goes to `previewAs`. */
export type FindParticipant = (previewAs: PreviewAs) => void;

export type CreatorBinding = {
  /** Unbinds: no further reads, and a read in flight is dropped. */
  (): void;
  refresh(): Promise<void>;
  /** The canvas's Audience findings, against the variables read last. */
  review(): Promise<AudienceReview>;
  /** Applies a finding's fix to the canvas; a finding without one is left alone. */
  applyFix(finding: AudienceFinding): void;
  /** Real participants, from the read and picked since: preview-only, never saved. */
  readOnlyPresets(): string[];
};

// The selector and the values editor list every participant, test and real; only Test participants
// can be added, removed or saved, so those strings say so.
const AUDIENCE_VP_STRINGS = {
  selectorTitle: "Preview as",
  noPreset: "None",
  view: "Participant values",
  viewTitle: "Variable values",
  edit: "Edit test participant values",
  editorTitle: "Participant values",
  presetName: "Participant",
  addPreset: "Add test participant",
  newPresetName: "New test participant",
  deletePreset: "Remove test participant",
  presetNameIsNotUnique: "A participant with this identifier exists",
  presetNameIsEmpty: "Enter the test participant's identifier",
  listNameColumn: "Participant",
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

type PickedParticipant = { preset: AudienceVariablePreset; isTest: boolean };

type BindingState = {
  variables: AudienceVariables;
  applied: AudienceVariables["variablePresets"] | undefined;
  /** Found with Find participant, by name: kept in the selector for the session. */
  picked: Map<string, PickedParticipant>;
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
  installPresets(creator, state);
}

/** The read's participants, then those picked since that the read does not list. */
function installPresets(
  creator: SurveyCreatorModel,
  state: BindingState,
): void {
  const presets = state.applied;
  // No properties any more: an empty container hides Preview as again. The setter's type has no
  // empty case, though the Creator handles one.
  creator.variablePresets = presets
    ? toSurveyPresets({
        ...presets,
        presets: [...presets.presets, ...pickedOutsideRead(state)],
      })
    : (undefined as unknown as ISurveyVariablePresets);
  lockValuesEditor(creator);
}

function pickedOutsideRead(state: BindingState): AudienceVariablePreset[] {
  const read = new Set(state.applied?.presets.map((preset) => preset.name));
  return [...state.picked.values()]
    .map(({ preset }) => preset)
    .filter((preset) => !read.has(preset.name));
}

/**
 * Previews as a participant: one the read listed is only selected; any other is added, or, picked
 * again, takes the values just read. A real one joins the read-only names, so the save leaves them
 * out.
 */
function previewAs(
  creator: SurveyCreatorModel,
  state: BindingState,
  picked: PickedParticipant,
): void {
  if (!state.bound || !state.applied) return;
  const { preset } = picked;
  const inRead = state.applied.presets.some((p) => p.name === preset.name);
  if (!inRead) {
    state.picked.set(preset.name, picked);
    installPresets(creator, state);
  }
  const manager = previewPlugin(creator)?.variablePresets;
  if (manager) manager.active = preset.name;
}

function readOnlyPresets(state: BindingState): string[] {
  const picked = [...state.picked.values()]
    .filter(({ isTest }) => !isTest)
    .map(({ preset }) => preset.name);
  return [...new Set([...state.variables.readOnlyPresets, ...picked])];
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

/**
 * Calls `onOpen` whenever the Preview tab opens, and once now when it is open already. Stopping
 * runs the undo the last call returned.
 */
function onPreviewOpened(
  creator: SurveyCreatorModel,
  onOpen: (plugin: TabTestPlugin, atBind: boolean) => () => void,
): () => void {
  let undo = () => {};
  const openPreview = (atBind: boolean) => {
    const isPreview =
      canonicalizeCreatorTabId(creator.activeTab) ===
      ENDATIX_CREATOR_TAB.preview;
    const plugin = isPreview ? previewPlugin(creator) : null;
    if (plugin) undo = onOpen(plugin, atBind);
  };
  const onActiveTabChanged = () => openPreview(false);
  creator.onActiveTabChanged.add(onActiveTabChanged);
  openPreview(true);
  return () => {
    creator.onActiveTabChanged.remove(onActiveTabChanged);
    undo();
  };
}

/** Participants the API left out of `presets` (it sends the first 20). */
function hasMoreParticipants(state: BindingState): boolean {
  const presets = state.applied;
  return !!presets && presets.totalPresets > presets.presets.length;
}

/**
 * Picking a participant writes nothing (Q5): the Creator applies the values to the Preview survey
 * itself, inside its construction callback, so `{variable}` defaults see them. Opening Preview reads
 * the variables again, so Properties added after the page loaded show up too. Preview rebuilds its
 * view model on every activation, so None (and Find participant, given `onFindParticipant`) goes
 * into it each time. The designer keeps the binding for the Creator's lifetime.
 */
export function bindToCreator(
  creator: SurveyCreatorModel,
  audience: BoundAudience,
  onFindParticipant?: FindParticipant,
): CreatorBinding {
  initGlobals();
  const state = newState(audience.variables);
  applyVariables(creator, audience.variables, state);
  const refresh = () => refreshVariables(creator, audience, state);
  const stopWatching = onPreviewOpened(creator, (plugin, atBind) => {
    if (!atBind) void refresh();
    return extendPreviewAs(plugin, finding(creator, state, onFindParticipant));
  });
  const unbind = () => {
    state.bound = false;
    stopWatching();
  };
  return Object.assign(unbind, { refresh, ...reading(creator, state) });
}

/** What the binding answers from the variables read last and the participants picked since. */
function reading(creator: SurveyCreatorModel, state: BindingState) {
  return {
    readOnlyPresets: () => readOnlyPresets(state),
    ...reviewing(creator, state),
  };
}

/** Find participant in the Preview toolbar: shown past the read's participants, the pick previewed. */
function finding(
  creator: SurveyCreatorModel,
  state: BindingState,
  onFindParticipant: FindParticipant | undefined,
): FindParticipantOption | undefined {
  if (!onFindParticipant) return undefined;
  const pick: PreviewAs = (preset, isTest) =>
    previewAs(creator, state, { preset, isTest });
  return {
    hasMore: () => hasMoreParticipants(state),
    find: () => onFindParticipant(pick),
  };
}

function newState(variables: AudienceVariables): BindingState {
  return {
    variables,
    applied: undefined,
    picked: new Map(),
    latest: 0,
    bound: true,
  };
}

/**
 * Findings against the variables read last; a fix the canvas cannot take is left out. The linter
 * loads on the first review, so a designer without Properties never downloads it.
 */
function reviewing(creator: SurveyCreatorModel, state: BindingState) {
  let reviewer: typeof reviewAudience | undefined;
  const review = (): AudienceReview => {
    if (!reviewer) return { findings: [] };
    const { findings } = reviewer(creator.JSON, state.variables);
    return { findings: findings.map((f) => withCanvasFix(creator, f)) };
  };
  return {
    review: async (): Promise<AudienceReview> => {
      if (!state.variables.variablePresets) return { findings: [] };
      reviewer ??= (await import("./review")).reviewAudience;
      return review();
    },
    /**
     * A fix carries the whole rewritten text, so it is computed again from the canvas as it is now:
     * one built at review time would undo an edit made since, or an earlier fix in the same text.
     */
    applyFix: (finding: AudienceFinding) => {
      const fix = currentFix(review().findings, finding);
      if (fix) applyAudienceFix(creator, fix);
    },
  };
}

/** The fix the same misspelling has now; none once it is gone. */
function currentFix(findings: AudienceFinding[], finding: AudienceFinding) {
  if (finding.kind !== "unknown-variable") return undefined;
  const same = findings.find(
    (f) =>
      f.kind === "unknown-variable" &&
      f.path === finding.path &&
      f.variable === finding.variable &&
      f.suggestion === finding.suggestion,
  );
  return same?.kind === "unknown-variable" ? same.fix : undefined;
}

function withCanvasFix(
  creator: SurveyCreatorModel,
  finding: AudienceFinding,
): AudienceFinding {
  if (finding.kind !== "unknown-variable" || !finding.fix) return finding;
  return canFixOnCanvas(creator, finding.fix)
    ? finding
    : { ...finding, fix: undefined };
}

/**
 * Only the latest read applies; one that lands after unbind, fails, or throws is dropped. Never
 * rejects: Preview and Diagnostics call it without waiting.
 */
async function refreshVariables(
  creator: SurveyCreatorModel,
  hooks: CreatorHooks,
  state: BindingState,
): Promise<void> {
  const read = ++state.latest;
  try {
    const fresh = await hooks.refresh();
    if (state.bound && read === state.latest && Result.isSuccess(fresh)) {
      applyVariables(creator, fresh.value, state);
      state.variables = fresh.value;
    }
  } catch {
    // Offline, a stale server action after a deploy, or variables the Creator rejects: keep what
    // Preview has.
  }
}

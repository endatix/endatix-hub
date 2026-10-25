import { Helpers } from "survey-core";
import type {
  SurveyCreatorModel,
  VariablePresetEditingEvent,
  VariablePresetsChangedEvent,
} from "survey-creator-core";
import type {
  AudienceIdentifierKind,
  AudiencePresetEditing,
  AudienceVariablePreset,
  AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import type { AudienceFinding } from "../coverage";

/** How the designer saves the Test participant values editor (endatix#1348). */
export type TestParticipantSave = {
  /** The tenant's match key, so the save leaves out real participants as the API matches them. */
  identifierKind: AudienceIdentifierKind;
  /** One PUT with the whole edited list; returns the variables read again. */
  save(presets: AudienceVariablePreset[]): Promise<Result<AudienceVariables>>;
};

/** Add as Audience property: a text Property named after the variable. */
export type AddAudienceProperty = (
  variable: string,
) => Promise<Result<unknown>>;

/** What the designer's writes need from the Creator binding. */
export type WriteTarget = {
  creator: SurveyCreatorModel;
  isBound(): boolean;
  /** A real participant's name, from the latest read or picked since, by the tenant's match key. */
  isReadOnly(name: string): boolean;
  /** The participants as the read and Find participant installed them, before any unsaved edit. */
  saved(): AudienceVariablePreset[];
  pending: {
    /** Test participants added or changed that the API has not taken yet; every read keeps them. */
    unsaved: AudienceVariablePreset[];
    /** Variables being added as Audience properties. */
    adding: Set<string>;
  };
  /** Starts a write: the check turns false once a newer read or write starts. */
  begin(): () => boolean;
  /** Shows a read: the variables after a save. */
  apply(variables: AudienceVariables): void;
  /** Reads the variables again. */
  refresh(): Promise<void>;
};

const READ_ONLY: AudiencePresetEditing = {
  allowAdd: false,
  allowEdit: false,
  allowDelete: false,
};

/**
 * The API's editing policy. Nothing saved is deleted from the designer (the API deletes nothing), so
 * delete is on only for a Test participant added here and never saved, a draft the author may
 * discard; the binding turns it off per saved row. Read-only when the designer cannot save, since
 * the edits would reach only the local container.
 */
export function valuesEditorPolicy(
  variables: AudienceVariables,
  canSave: boolean,
): AudiencePresetEditing {
  if (!canSave) return READ_ONLY;
  const { allowAdd, allowEdit } = variables.editing;
  return { allowAdd, allowEdit, allowDelete: allowAdd };
}

/** The Test participants added, or changed from what was saved: all a save sends. */
export function changedPresets(
  edited: readonly AudienceVariablePreset[],
  saved: readonly AudienceVariablePreset[],
): AudienceVariablePreset[] {
  const before = new Map(saved.map((preset) => [preset.name, preset]));
  return edited.filter((preset) => {
    const was = before.get(preset.name);
    return !was || !Helpers.isTwoValueEquals(was.variables, preset.variables);
  });
}

/**
 * The read's participants with the edits that did not save yet laid over them, by name, and the
 * new ones after: a read landing after a failed save must not throw the author's edit away.
 */
export function withUnsaved(
  presets: AudienceVariablePreset[],
  unsaved: readonly AudienceVariablePreset[],
): AudienceVariablePreset[] {
  const edits = new Map(unsaved.map((preset) => [preset.name, preset]));
  const read = presets.map((preset) => edits.get(preset.name) ?? preset);
  const listed = new Set(presets.map((preset) => preset.name));
  return [...read, ...unsaved.filter((preset) => !listed.has(preset.name))];
}

/**
 * A real participant opens in display mode, name included, so renaming one can never save their
 * values as a new Test participant. Only a draft (added here, never saved) can be removed. The
 * Creator asks per preset each time the editor lists it.
 */
export function lockRealParticipants({
  creator,
  isReadOnly,
  saved,
}: WriteTarget): () => void {
  const onEditing = (_: unknown, options: VariablePresetEditingEvent) => {
    const { name } = options.preset;
    if (isReadOnly(name)) options.allowEdit = false;
    if (isReadOnly(name) || saved().some((p) => p.name === name)) {
      options.allowDelete = false;
    }
  };
  creator.onVariablePresetEditing.add(onEditing);
  return () => creator.onVariablePresetEditing.remove(onEditing);
}

/** The editor's Apply saves; picking who to preview as does not. */
export function saveOnEdit(
  target: WriteTarget,
  save: TestParticipantSave | undefined,
): () => void {
  if (!save) return () => undefined;
  const { creator } = target;
  const onChanged = (_: unknown, options: VariablePresetsChangedEvent) => {
    if (options.reason === "edit") void saveEdits(target, save);
  };
  creator.onVariablePresetsChanged.add(onChanged);
  return () => creator.onVariablePresetsChanged.remove(onChanged);
}

/**
 * Sends the Test participants added or changed in one PUT; real ones are left out (#1203), and an
 * unchanged one is not sent, so a change made on the Audience tab meanwhile is not overwritten. The
 * edit counts as unsaved until the API answers, so a read landing meanwhile keeps it; a failure keeps
 * it and says so, a success shows what the API read back.
 */
async function saveEdits(
  target: WriteTarget,
  { save }: TestParticipantSave,
): Promise<void> {
  if (!target.isBound()) return;
  const { pending } = target;
  const edits = testParticipantEdits(target);
  pending.unsaved = edits;
  if (edits.length === 0) return;
  const isLatest = target.begin();
  await runWrite(target, () => save(edits), {
    failed: saveFailedMessage,
    succeeded: (saved) => {
      // A newer edit stays unsaved until its own save answers.
      if (pending.unsaved === edits) pending.unsaved = [];
      if (target.isBound() && isLatest()) target.apply(saved);
    },
  });
}

/**
 * The rows to save. A name typed into a Test row that is a real participant's by the match key (the
 * editor checks uniqueness exactly) is never saved, and the author is told.
 */
function testParticipantEdits(target: WriteTarget): AudienceVariablePreset[] {
  const { creator, isReadOnly, saved } = target;
  const rows = creator.variablePresets?.presets ?? [];
  const installed = saved();
  const savedNames = new Set(installed.map((preset) => preset.name));
  const clashing = rows
    .map(({ name }) => name)
    .filter((name) => isReadOnly(name) && !savedNames.has(name));
  const testRows = rows
    .filter(({ name }) => !isReadOnly(name))
    .map(({ name, variables }) => ({
      name,
      variables: structuredClone(variables ?? {}),
    }));
  if (clashing.length > 0) creator.notify(clashMessage(clashing), "error");
  return changedPresets(testRows, installed);
}

/** Adds the Property, then reads the variables again so the warning clears. */
export async function addAudienceProperty(
  target: WriteTarget,
  add: AddAudienceProperty | undefined,
  finding: AudienceFinding,
): Promise<void> {
  if (finding.kind !== "unknown-variable" || !finding.canAddProperty) return;
  const { variable } = finding;
  const { adding } = target.pending;
  if (!add || !target.isBound() || adding.has(variable)) return;
  adding.add(variable);
  try {
    await runWrite(target, () => add(variable), {
      failed: (detail) => addPropertyFailedMessage(variable, detail),
      succeeded: () => target.refresh(),
    });
  } finally {
    adding.delete(variable);
  }
}

type WriteOutcome<T> = {
  /** The error the author sees, given the API's reason when it sent one. */
  failed(detail: string | undefined): string;
  succeeded(value: T): unknown;
};

/** A write's failure, returned or thrown, shown in the designer while it is bound. Never rejects. */
async function runWrite<T>(
  target: WriteTarget,
  write: () => Promise<Result<T>>,
  { failed, succeeded }: WriteOutcome<T>,
): Promise<void> {
  let detail: string | undefined;
  try {
    const result = await write();
    if (Result.isSuccess(result)) {
      await succeeded(result.value);
      return;
    }
    detail = result.message;
  } catch {
    // Offline, or a stale server action after a deploy: say so without a reason.
  }
  if (target.isBound()) target.creator.notify(failed(detail), "error");
}

function saveFailedMessage(detail: string | undefined): string {
  const reason = detail ? ` ${detail}` : "";
  return `Test participant values were not saved.${reason} Your edit is kept: correct it and apply again.`;
}

function clashMessage(names: string[]): string {
  return `Real participants on this form can't be saved as test participants: ${names.join(", ")}. Use another identifier.`;
}

function addPropertyFailedMessage(
  variable: string,
  detail: string | undefined,
): string {
  const reason = detail ? ` ${detail}` : "";
  return `{${variable}} was not added as an Audience property.${reason}`;
}

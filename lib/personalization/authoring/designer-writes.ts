import type {
  SurveyCreatorModel,
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
import { testParticipantPresets } from "./test-participant-presets";

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
  /** Real participants, from the latest read and picked since. */
  readOnlyPresets(): string[];
  /** Test participant edits the API has not taken yet; every read keeps them. */
  pending: { unsaved: AudienceVariablePreset[] };
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
 * The API's editing policy, without delete: nothing is deleted from the designer, and a removed
 * row would only come back on the next read. Read-only when the designer cannot save, since the
 * edits would reach only the local container.
 */
export function valuesEditorPolicy(
  variables: AudienceVariables,
  canSave: boolean,
): AudiencePresetEditing {
  if (!canSave) return READ_ONLY;
  const { allowAdd, allowEdit } = variables.editing;
  return { allowAdd, allowEdit, allowDelete: false };
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
 * Sends the container's Test participants in one PUT (real ones left out, #1203). The edit counts as
 * unsaved until the API answers, so a read landing meanwhile keeps it; a failure keeps it and says
 * so, a success shows what the API read back.
 */
async function saveEdits(
  target: WriteTarget,
  { identifierKind, save }: TestParticipantSave,
): Promise<void> {
  if (!target.isBound()) return;
  const { pending } = target;
  const edits = testParticipantEdits(target, identifierKind);
  if (edits.length === 0) return;
  pending.unsaved = edits;
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

function testParticipantEdits(
  { creator, readOnlyPresets }: WriteTarget,
  identifierKind: AudienceIdentifierKind,
): AudienceVariablePreset[] {
  return testParticipantPresets(
    creator.variablePresets,
    readOnlyPresets(),
    identifierKind,
  );
}

/** Adds the Property, then reads the variables again so the warning clears. */
export async function addAudienceProperty(
  target: WriteTarget,
  add: AddAudienceProperty | undefined,
  finding: AudienceFinding,
): Promise<void> {
  if (finding.kind !== "unknown-variable" || !finding.canAddProperty) return;
  if (!add || !target.isBound()) return;
  const { variable } = finding;
  await runWrite(target, () => add(variable), {
    failed: (detail) => addPropertyFailedMessage(variable, detail),
    succeeded: () => target.refresh(),
  });
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
  return `Test participant values were not saved.${reason} Your edit is kept; apply it again to retry.`;
}

function addPropertyFailedMessage(
  variable: string,
  detail: string | undefined,
): string {
  const reason = detail ? ` ${detail}` : "";
  return `{${variable}} was not added as an Audience property.${reason}`;
}

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

/** Writes the binding has not finished. One save runs at a time. */
export type PendingWrites = {
  /** Test participants added or changed that the API has not taken yet; every read keeps them. */
  unsaved: AudienceVariablePreset[];
  /** The latest Apply's Test rows, waiting for the save in flight. */
  queued: AudienceVariablePreset[] | undefined;
  /** The names the save in flight carries. */
  sending: Set<string>;
  draining: boolean;
  /** Variables being added as Audience properties. */
  adding: Set<string>;
};

/** What the designer's writes need from the Creator binding. */
export type WriteTarget = {
  creator: SurveyCreatorModel;
  isBound(): boolean;
  /** A real participant's name, from the latest read or picked since, by the tenant's match key. */
  isReadOnly(name: string): boolean;
  /** The participants as the read and Find participant installed them, before any unsaved edit. */
  saved(): AudienceVariablePreset[];
  pending: PendingWrites;
  /** Starts a write: the check turns false once a newer read or write starts. */
  begin(): () => boolean;
  /** Marks rows the API took as saved, a picked participant's included. */
  confirm(saved: AudienceVariablePreset[]): void;
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
 * values as a new Test participant. Only a draft (added here, never saved) can be removed, a draft
 * typed with a real participant's identifier included, so the author can drop the row the save
 * refuses. The Creator asks per preset each time the editor lists it.
 */
export function lockRealParticipants({
  creator,
  isReadOnly,
  saved,
}: WriteTarget): () => void {
  const onEditing = (_: unknown, options: VariablePresetEditingEvent) => {
    const { name } = options.preset;
    if (isReadOnly(name)) options.allowEdit = false;
    if (saved().some((p) => p.name === name)) options.allowDelete = false;
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
    if (options.reason === "edit") queueSave(target, save);
  };
  creator.onVariablePresetsChanged.add(onChanged);
  return () => creator.onVariablePresetsChanged.remove(onChanged);
}

/**
 * Takes the Apply's Test rows and starts saving unless a save is in flight; that one hands over to
 * the latest Apply once it answers. Rows the author changed, and rows the save in flight carries,
 * count as unsaved, so a read landing meanwhile (the save's own included) keeps what is on screen.
 */
function queueSave(target: WriteTarget, save: TestParticipantSave): void {
  if (!target.isBound()) return;
  const { pending } = target;
  const rows = testParticipantEdits(target);
  pending.queued = rows;
  const changed = new Set(
    changedPresets(rows, target.saved()).map(({ name }) => name),
  );
  pending.unsaved = rows.filter(
    ({ name }) => changed.has(name) || pending.sending.has(name),
  );
  if (!pending.draining) void drainSaves(target, save);
}

/**
 * Saves one Apply at a time, each compared with what the save before it stored, so an undo applied
 * while a save is in flight is sent rather than lost to the earlier value.
 */
async function drainSaves(
  target: WriteTarget,
  { save }: TestParticipantSave,
): Promise<void> {
  const { pending } = target;
  pending.draining = true;
  try {
    await flushQueued(target, save);
  } finally {
    pending.draining = false;
  }
}

/** One save, then the next Apply if one arrived while it ran. */
async function flushQueued(
  target: WriteTarget,
  save: TestParticipantSave["save"],
): Promise<void> {
  if (!target.pending.queued || !target.isBound()) return;
  await saveQueued(target, save);
  await flushQueued(target, save);
}

/** Saves the latest Apply's rows that differ from what is saved now; nothing to send clears it. */
async function saveQueued(
  target: WriteTarget,
  save: TestParticipantSave["save"],
): Promise<void> {
  const { pending } = target;
  const rows = pending.queued ?? [];
  pending.queued = undefined;
  const edits = changedPresets(rows, target.saved());
  if (edits.length > 0) await saveEdits(target, () => save(edits), edits);
  else if (!pending.queued) pending.unsaved = [];
}

/**
 * Sends the Test participants added or changed in one PUT; real ones are left out (#1203), and an
 * unchanged one is not sent, so a change made on the Audience tab meanwhile is not overwritten. A
 * failure keeps the edit and says so; a success shows what the API read back.
 */
async function saveEdits(
  target: WriteTarget,
  send: () => Promise<Result<AudienceVariables>>,
  edits: AudienceVariablePreset[],
): Promise<void> {
  const { pending } = target;
  pending.sending = new Set(edits.map(({ name }) => name));
  const isLatest = target.begin();
  try {
    await runWrite(target, send, {
      failed: saveFailedMessage,
      succeeded: (saved) => showSaved(target, { saved, edits, isLatest }),
    });
  } finally {
    pending.sending = new Set();
  }
}

type SaveAnswer = {
  saved: AudienceVariables;
  edits: AudienceVariablePreset[];
  isLatest: () => boolean;
};

/** The rows sent are saved; the API's read shows unless a newer read started meanwhile. */
async function showSaved(
  target: WriteTarget,
  { saved, edits, isLatest }: SaveAnswer,
): Promise<void> {
  // A newer Apply stays unsaved until its own save answers.
  if (!target.pending.queued) target.pending.unsaved = [];
  if (!target.isBound()) return;
  target.confirm(edits);
  // A read started meanwhile may predate this save: read again rather than keep a stale one.
  if (isLatest()) target.apply(saved);
  else await target.refresh();
}

/**
 * The Test participant rows in the editor, copied: every real participant is left out (#1203), by
 * the tenant's match key, so one sent back after it changed on People cannot fail the save and one
 * removed from the form is not added back. A name typed into a Test row that is a real participant's
 * by the match key (the editor checks uniqueness exactly) is never saved, and the author is told.
 */
export function testParticipantEdits(
  target: WriteTarget,
): AudienceVariablePreset[] {
  const { creator, isReadOnly, saved } = target;
  const rows = creator.variablePresets?.presets ?? [];
  const installed = saved();
  const savedNames = new Set(installed.map((preset) => preset.name));
  const clashing: string[] = [];
  const testRows: AudienceVariablePreset[] = [];
  for (const { name, variables } of rows) {
    if (!isReadOnly(name)) {
      testRows.push({ name, variables: structuredClone(variables ?? {}) });
    } else if (!savedNames.has(name)) {
      clashing.push(name);
    }
  }
  if (clashing.length > 0) creator.notify(clashMessage(clashing), "error");
  return testRows;
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

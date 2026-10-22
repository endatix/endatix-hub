import type { SurveyCreatorModel } from "survey-creator-core";
import { applyFix } from "survey-core/linter";
import type { AudienceFix } from "./findings/types";

const SEGMENT = /^([A-Za-z_$][\w$]*)(?:\[(\d+)\])?$/;

type Node = Record<string, unknown>;

/** `pages[0].elements[1].title` → the model object and the property to set, or null. */
function resolve(
  root: Node,
  path: string,
): { owner: Node; key: string } | null {
  const segments = path.split(".");
  const key = segments.pop();
  let node: unknown = root;
  for (const segment of segments) {
    const match = SEGMENT.exec(segment);
    if (!match || !node || typeof node !== "object") return null;
    const value: unknown = (node as Node)[match[1]];
    node =
      match[2] === undefined
        ? value
        : (value as unknown[] | undefined)?.[Number(match[2])];
  }
  if (!key || !SEGMENT.test(key) || !node || typeof node !== "object")
    return null;
  return { owner: node as Node, key };
}

/** Sets each value on the live survey, so the Creator records one undoable, saved-as-modified edit. */
function setOnModel(creator: SurveyCreatorModel, fix: AudienceFix): boolean {
  const targets = fix.edits.map((edit) =>
    edit.op === "set"
      ? resolve(creator.survey as unknown as Node, edit.path)
      : null,
  );
  if (targets.some((target) => target === null)) return false;
  creator.undoRedoManager.startTransaction(fix.reason);
  try {
    targets.forEach((target, i) => {
      target!.owner[target!.key] = fix.edits[i].value;
    });
  } finally {
    creator.undoRedoManager.stopTransaction();
  }
  return true;
}

/** Applies a linter fix to the designer's canvas. */
export function applyAudienceFix(
  creator: SurveyCreatorModel,
  fix: AudienceFix,
): void {
  if (setOnModel(creator, fix)) return;
  // A path the model does not mirror (a localized string, a rename): replace the definition, as the
  // Creator's own JSON tab applies a fix. That edit cannot be undone.
  creator.JSON = applyFix(creator.JSON, fix);
  creator.setModified({ type: "audience-fix" });
}

import { Serializer } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceFinding, AudienceFix } from "../coverage";

const SEGMENT = /^([A-Za-z_$][\w$]*)(?:\[(\d+)\])?$/;
const PROPERTY = /^[A-Za-z_$][\w$]*$/;

type Node = Record<string, unknown> & { getType?: () => string };
type Target = { owner: Node; key: string };

function step(node: unknown, segment: string): unknown {
  const match = SEGMENT.exec(segment);
  if (!match || !node || typeof node !== "object") return undefined;
  const value = (node as Node)[match[1]];
  return match[2] === undefined
    ? value
    : (value as unknown[] | undefined)?.[Number(match[2])];
}

/**
 * `pages[0].elements[1].title` → the model object and the serializable property to set. A
 * translated text is only set in the survey's default locale, where the fix was computed.
 */
function resolve(creator: SurveyCreatorModel, path: string): Target | null {
  const segments = path.split(".");
  const key = segments.pop() ?? "";
  const owner = segments.reduce<unknown>(
    (node, segment) => step(node, segment),
    creator.survey,
  ) as Node;
  const property =
    PROPERTY.test(key) && typeof owner?.getType === "function"
      ? Serializer.findProperty(owner.getType(), key)
      : null;
  if (!property) return null;
  if (property.isLocalizable && creator.survey.locale) return null;
  return { owner, key };
}

function targetsOf(creator: SurveyCreatorModel, fix: AudienceFix) {
  const targets = fix.edits.map((edit) =>
    edit.op === "set" ? resolve(creator, edit.path) : null,
  );
  return targets.every((target) => target !== null)
    ? (targets as Target[])
    : null;
}

/** Whether the canvas can take the fix as model edits; otherwise the designer offers none. */
export function canFixOnCanvas(
  creator: SurveyCreatorModel,
  fix: AudienceFix,
): boolean {
  return targetsOf(creator, fix) !== null;
}

/** Sets each value on the live survey: one edit the Creator can undo and saves as modified. */
export function applyAudienceFix(
  creator: SurveyCreatorModel,
  fix: AudienceFix,
): void {
  const targets = targetsOf(creator, fix);
  if (!targets) return;
  creator.startUndoRedoTransaction(fix.reason);
  try {
    targets.forEach(({ owner, key }, i) => {
      owner[key] = fix.edits[i].value;
    });
  } finally {
    creator.stopUndoRedoTransaction();
  }
}

function samePrefillMismatch(
  candidate: AudienceFinding,
  finding: AudienceFinding,
): boolean {
  return (
    candidate.kind === "prefill-type-mismatch" &&
    finding.kind === "prefill-type-mismatch" &&
    candidate.path === finding.path &&
    candidate.variable === finding.variable
  );
}

/** The fix the same finding has now; none once it is gone. */
export function currentFix(
  findings: AudienceFinding[],
  finding: AudienceFinding,
) {
  if (finding.kind === "prefill-type-mismatch") {
    const same = findings.find((candidate) =>
      samePrefillMismatch(candidate, finding),
    );
    return same?.kind === "prefill-type-mismatch" ? same.fix : undefined;
  }
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

/** A fix only when the canvas can take it; Add as Audience property only when the designer can. */
/** Whether this designer can add an Audience property. */
type DesignerActions = { canAddProperty: boolean };

function canvasFix(creator: SurveyCreatorModel, finding: AudienceFinding) {
  const fix = "fix" in finding ? finding.fix : undefined;
  if (!fix || canFixOnCanvas(creator, fix)) return fix;
  return undefined;
}

export const designerActions =
  (creator: SurveyCreatorModel, { canAddProperty }: DesignerActions) =>
  (finding: AudienceFinding): AudienceFinding => {
    if (finding.kind === "prefill-type-mismatch") {
      return { ...finding, fix: canvasFix(creator, finding) };
    }
    if (finding.kind !== "unknown-variable") return finding;
    return {
      ...finding,
      fix: canvasFix(creator, finding),
      canAddProperty: canAddProperty && finding.canAddProperty,
    };
  };

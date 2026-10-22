import type { Submission } from "@/lib/endatix-api";
import type { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
import { formRoutes } from "@/lib/routes/form-routes";

/** What the Test inspector may show; built on the server, only for a viewer with `forms.test`. */
export type TestInspectorView = {
  formId: string;
  /** Null until the first save creates the submission; links read the runtime id instead. */
  submissionId: string | null;
  submitter: InspectedSubmitter;
  /** The Snapshot: frozen values the survey was opened with. Null when none was captured. */
  snapshot: InspectedSnapshot | null;
  links: { submissionDetails: string | null; participant: ParticipantLink };
  canStartOver: boolean;
};

export type InspectedSubmitter = {
  /** The person's match-key value from the Snapshot, else the Submitter Label. */
  identifier: string | null;
  label: string | null;
  source: PersonalizationSource | null;
  /** Submitter fields, sorted by name. */
  fields: ReadonlyArray<readonly [name: string, value: string]>;
};

/**
 * The participant the Snapshot names, else Audience filtered to test participants. The label
 * follows the target, so a tester is never told "Participant" for a list of everyone.
 */
export type ParticipantLink = {
  label: "Participant" | "Audience";
  href: string;
};

export type InspectedSnapshot = {
  capturedAt: string;
  values: ReadonlyArray<{ name: string; value: unknown }>;
};

export type TestInspectorViewInput = {
  formId: string;
  submission: Submission | undefined;
  canStartOver: boolean;
  /** The tester may open the participant page (it needs `forms.edit`); else the row opens Audience. */
  canOpenParticipant: boolean;
};

const byName = (a: string, b: string) => a.localeCompare(b);

/** Submission Details for a saved submission; null before the first save. */
export function submissionDetailsHref(
  formId: string,
  submissionId: string | null | undefined,
): string | null {
  return submissionId ? formRoutes.submission(formId, submissionId) : null;
}

function participantLink(
  formId: string,
  submission: Submission | undefined,
  canOpenParticipant: boolean,
): ParticipantLink {
  const memberId = submission?.personalization?.memberId;
  return canOpenParticipant && memberId
    ? { label: "Participant", href: formRoutes.participant(formId, memberId) }
    : {
        label: "Audience",
        href: formRoutes.audience(formId, { test: "test" }),
      };
}

function inspectedSubmitter(
  submission: Submission | undefined,
): InspectedSubmitter {
  const label = submission?.submitterDisplayId || null;
  const fields = Object.entries(submission?.submitterProfile ?? {}).sort(
    ([a], [b]) => byName(a, b),
  );
  return {
    identifier: submission?.personalization?.identifier || label,
    label,
    source: submission?.personalization?.source ?? null,
    fields,
  };
}

function inspectedSnapshot(
  submission: Submission | undefined,
): InspectedSnapshot | null {
  const personalization = submission?.personalization;
  if (!personalization) return null;
  const values = Object.entries(personalization.variables ?? {})
    .sort(([a], [b]) => byName(a, b))
    .map(([name, value]) => ({ name, value }));
  return { capturedAt: personalization.capturedAt, values };
}

/**
 * The Test inspector's view of the submission the page already loaded. The only reader of the
 * wire `Submission` for the inspector, so nothing else from it crosses to the browser's menu.
 */
export function toTestInspectorView({
  formId,
  submission,
  canStartOver,
  canOpenParticipant,
}: TestInspectorViewInput): TestInspectorView {
  const submissionId = submission?.id ? String(submission.id) : null;
  return {
    formId,
    submissionId,
    submitter: inspectedSubmitter(submission),
    snapshot: inspectedSnapshot(submission),
    links: {
      submissionDetails: submissionDetailsHref(formId, submissionId),
      participant: participantLink(formId, submission, canOpenParticipant),
    },
    canStartOver,
  };
}

/** The test submission Start over replaces, or null when the viewer may not start it over. */
export function startOverTarget(
  view: TestInspectorView | null,
): { formId: string; submissionId: string } | null {
  return view?.canStartOver && view.submissionId
    ? { formId: view.formId, submissionId: view.submissionId }
    : null;
}

import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PersonalizationSource,
  type Submission,
} from "@/lib/endatix-api/submissions/types";
import { formRoutes } from "@/lib/routes/form-routes";
import { formatDetailsDate } from "./format-details";
import { SubmitterFact } from "./submitter-fact";

type Snapshot = NonNullable<Submission["personalization"]>;

const SOURCE_LABELS: Record<PersonalizationSource, string> = {
  [PersonalizationSource.Link]: "Personalised link",
  [PersonalizationSource.OnBehalf]: "On behalf",
  [PersonalizationSource.Test]: "Test as this participant",
};

/** A source this Hub does not know yet (a newer API) is shown as sent, never as missing. */
function snapshotSourceLabel(source: string | undefined): string {
  if (!source) return "Not recorded";
  return Object.hasOwn(SOURCE_LABELS, source)
    ? SOURCE_LABELS[source as PersonalizationSource]
    : source;
}

const HEADING_ID = "submitter-participant";

interface SubmitterParticipantProps {
  formId: string;
  personalization: Submission["personalization"];
  /** Forms.Edit and the personalization flag, checked on the server: the participant page is for editors only. */
  canOpenParticipant: boolean;
}

/**
 * The participant the submission's Snapshot was taken for. Nothing without a Snapshot; the
 * frozen values themselves stay on the Variables tab.
 */
export function SubmitterParticipant({
  formId,
  personalization,
  canOpenParticipant,
}: Readonly<SubmitterParticipantProps>) {
  if (!personalization) return null;
  const { memberId } = personalization;
  const href =
    canOpenParticipant && memberId
      ? formRoutes.participant(formId, memberId)
      : null;

  return (
    <section aria-labelledby={HEADING_ID} className="space-y-4">
      <ParticipantHeading href={href} />
      <SnapshotFacts snapshot={personalization} />
    </section>
  );
}

function ParticipantHeading({ href }: Readonly<{ href: Route | null }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3
        id={HEADING_ID}
        className="text-base font-bold text-slate-900 dark:text-slate-100"
      >
        Participant
      </h3>
      {href ? (
        <Button asChild size="sm" variant="outline">
          <Link href={href}>Open participant</Link>
        </Button>
      ) : null}
    </div>
  );
}

function SnapshotFacts({ snapshot }: Readonly<{ snapshot: Snapshot }>) {
  const { identifier, source, capturedAt } = snapshot;
  const sourceLabel = snapshotSourceLabel(source);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SubmitterFact copyable label="Identifier" value={identifier} />
      <SubmitterFact label="Snapshot source" value={sourceLabel} />
      <SubmitterFact
        label="Snapshot taken"
        value={formatDetailsDate(new Date(capturedAt))}
      />
    </div>
  );
}

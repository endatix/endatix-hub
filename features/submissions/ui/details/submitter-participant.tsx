import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PersonalizationSource,
  type Submission,
} from "@/lib/endatix-api/submissions/types";
import { formRoutes } from "@/lib/routes/form-routes";
import { DASH_NO_DATA, formatDetailsDate } from "./format-details-date";
import { SubmitterFact } from "./submitter-fact";

const SOURCE_LABELS: Record<PersonalizationSource, string> = {
  [PersonalizationSource.Link]: "Personalised link",
  [PersonalizationSource.OnBehalf]: "On behalf",
  [PersonalizationSource.Test]: "Test as this participant",
};

interface SubmitterParticipantProps {
  formId: string;
  personalization: Submission["personalization"];
  /** Forms.Edit, checked on the server: the participant page is for editors only. */
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
  const { identifier, source, capturedAt, memberId } = personalization;
  const participantHref =
    canOpenParticipant && memberId
      ? formRoutes.participant(formId, memberId)
      : null;

  return (
    <section aria-labelledby="submitter-participant" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3
          id="submitter-participant"
          className="text-base font-bold text-slate-900 dark:text-slate-100"
        >
          Participant
        </h3>
        {participantHref ? (
          <Button asChild size="sm" variant="outline">
            <Link href={participantHref}>Open participant</Link>
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SubmitterFact
          label="Identifier"
          value={identifier || DASH_NO_DATA}
          copyValue={identifier || undefined}
        />
        <SubmitterFact
          label="Snapshot source"
          value={source ? SOURCE_LABELS[source] : "Not recorded"}
        />
        <SubmitterFact
          label="Snapshot taken"
          value={formatDetailsDate(new Date(capturedAt))}
        />
      </div>
    </section>
  );
}

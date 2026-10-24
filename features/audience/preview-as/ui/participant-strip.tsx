"use client";

import { useId } from "react";
import { FlaskConical, Pencil } from "lucide-react";
import { SummaryRow } from "@/components/common/summary-row";
import { Button } from "@/components/ui/button";
import type {
  AudienceIdentifierKind,
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { NotSet } from "../../ui/not-set";
import { TEST_BADGE } from "../../ui/test-badge";
import { useTestAsPerson } from "../../test-as-person/use-test-as-person.hook";
import { EditPersonPanel } from "../../update-person/ui/edit-person-panel";
import { useRowOverlay } from "../../use-panel-state.hook";
import { formatPropertyValue } from "../../utils";

type ParticipantStripProps = {
  formId: string;
  person: AudiencePerson;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  canTest: boolean;
};

function notFilledIn({ person, properties }: ParticipantStripProps) {
  const missing = properties.filter((p) => !person.values[p.id]);
  if (missing.length === 0) return "Every value is filled in.";
  return `Not filled in: ${missing.map((p) => p.name).join(", ")}`;
}

function StripActions(
  props: Readonly<ParticipantStripProps & { onEdit: () => void }>,
) {
  const testAs = useTestAsPerson(props.formId);
  return (
    <div className="flex flex-wrap gap-2">
      {props.canTest ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => testAs(props.person)}
        >
          <FlaskConical aria-hidden="true" />
          Test as this participant
        </Button>
      ) : null}
      {props.properties.length > 0 ? (
        <Button variant="outline" size="sm" onClick={props.onEdit}>
          <Pencil aria-hidden="true" />
          Edit values
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Who the form is previewed as: their values, what they have not filled in, and Test as or Edit
 * values. Saving values reads the page again, so the preview shows them.
 */
export function ParticipantStrip(props: Readonly<ParticipantStripProps>) {
  const { formId, person, identifierKind, properties } = props;
  const overlay = useRowOverlay<AudiencePerson>();
  const heading = useId();
  return (
    <section
      aria-labelledby={heading}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold break-all">
          <span id={heading}>{person.identifier}</span>
          {person.isTest ? TEST_BADGE : null}
        </h2>
        <StripActions {...props} onEdit={() => overlay.edit(person)} />
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {properties.map((p) => (
          <SummaryRow
            key={p.id}
            label={p.name}
            value={formatPropertyValue(p, person.values[p.id]) ?? <NotSet />}
          />
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">{notFilledIn(props)}</p>
      <EditPersonPanel
        key={overlay.session}
        formId={formId}
        person={overlay.target}
        open={overlay.isEditing}
        identifierKind={identifierKind}
        properties={properties}
        onClose={overlay.close}
      />
    </section>
  );
}

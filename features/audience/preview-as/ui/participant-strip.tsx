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
import {
  usageVerdicts,
  type AudienceUsage,
} from "@/lib/personalization/audience-usage";
import { formatPropertyValue } from "../../utils";

type Overlay = ReturnType<typeof useRowOverlay<AudiencePerson>>;

type ParticipantStripProps = {
  formId: string;
  person: AudiencePerson;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  /** What the saved form reads, the same verdict as the People list. */
  usage: AudienceUsage | null;
  canTest: boolean;
};

function filledNames(person: AudiencePerson, properties: AudienceProperty[]) {
  return properties
    .filter((p) => (person.values[p.id] ?? "") !== "")
    .map((p) => p.variableName);
}

function notFilledIn({ person, properties, usage }: ParticipantStripProps) {
  if (!usage) return "Every value is filled in.";
  const missing = usageVerdicts(usage).notFilledIn(
    filledNames(person, properties),
  );
  if (missing.length === 0) return "Every value is filled in.";
  const labels = missing.map(
    (name) => properties.find((p) => p.variableName === name)?.name ?? name,
  );
  return `Not filled in: ${labels.join(", ")}`;
}

type ActionProps = ParticipantStripProps & { onEdit: () => void };

function useStripActions({ onEdit, ...props }: ActionProps) {
  const testAs = useTestAsPerson(props.formId);
  const actions = [
    {
      show: props.canTest,
      label: "Test as this participant",
      icon: FlaskConical,
      run: () => testAs(props.person),
    },
    {
      show: props.properties.length > 0,
      label: "Edit values",
      icon: Pencil,
      run: onEdit,
    },
  ];
  return actions.filter((action) => action.show);
}

function StripActions(props: Readonly<ActionProps>) {
  return (
    <div className="flex flex-wrap gap-2">
      {useStripActions(props).map(({ label, icon: Icon, run }) => (
        <Button key={label} variant="outline" size="sm" onClick={run}>
          <Icon aria-hidden="true" />
          {label}
        </Button>
      ))}
    </div>
  );
}

function StripValues({ person, properties }: Readonly<ParticipantStripProps>) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {properties.map((p) => (
        <SummaryRow
          key={p.id}
          label={p.name}
          value={formatPropertyValue(p, person.values[p.id]) ?? <NotSet />}
        />
      ))}
    </dl>
  );
}

type EditProps = ParticipantStripProps & { overlay: Overlay };

function EditValues({
  overlay,
  formId,
  identifierKind,
  properties,
}: Readonly<EditProps>) {
  return (
    <EditPersonPanel
      key={overlay.session}
      {...{ formId, identifierKind, properties }}
      person={overlay.target}
      open={overlay.isEditing}
      onClose={overlay.close}
    />
  );
}

function StripHeading({
  person,
  id,
}: Readonly<{ person: AudiencePerson; id: string }>) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold break-all">
      <span id={id}>{person.identifier}</span>
      {person.isTest ? TEST_BADGE : null}
    </h2>
  );
}

const STRIP = "flex flex-col gap-3 rounded-xl border bg-card p-4";

/**
 * Who the form is previewed as: their values, what they have not filled in, and Test as or Edit
 * values. Saving values reads the page again, so the preview shows them.
 */
export function ParticipantStrip(props: Readonly<ParticipantStripProps>) {
  const overlay = useRowOverlay<AudiencePerson>();
  const heading = useId();
  return (
    <section aria-labelledby={heading} className={STRIP}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StripHeading person={props.person} id={heading} />
        <StripActions {...props} onEdit={() => overlay.edit(props.person)} />
      </div>
      <StripValues {...props} />
      <p className="text-sm text-muted-foreground">{notFilledIn(props)}</p>
      <EditValues {...props} overlay={overlay} />
    </section>
  );
}

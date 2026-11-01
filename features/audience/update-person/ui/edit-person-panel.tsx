"use client";

import { Info, UserRound } from "lucide-react";
import {
  AudienceLinkStatusKind,
  type AudienceIdentifierKind,
  type AudiencePerson,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { TextLink } from "@/components/common/text-link";
import { formRoutes } from "@/lib/routes/form-routes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LockedValue } from "@/components/common/locked-value";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { PersonValueFields } from "../../ui/person-value-fields";
import { identifierKindLabel } from "../../utils";
import { closeWhenIdle } from "../../use-panel-state.hook";
import { useEditPerson } from "../use-edit-person.hook";

type EditPersonPanelProps = {
  formId: string;
  person: AudiencePerson | null;
  open: boolean;
  identifierKind: AudienceIdentifierKind;
  /** Value properties only: the People section leaves out one named like the match key. */
  properties: AudienceProperty[];
  onClose: () => void;
};

type IdentityProps = { kind: AudienceIdentifierKind; identifier: string };

function CopyableIdentifier({ kind, identifier }: Readonly<IdentityProps>) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="break-all">{identifier}</span>
      <CopyToClipboard
        layout="inline"
        copyValue={identifier}
        label={`Copy ${identifierKindLabel(kind)} ${identifier}`}
      />
    </span>
  );
}

function IdentifierRow(props: Readonly<IdentityProps>) {
  return (
    <dl>
      <SummaryRow
        label={identifierKindLabel(props.kind)}
        value={
          <LockedValue>
            <CopyableIdentifier {...props} />
          </LockedValue>
        }
      />
    </dl>
  );
}

type PersonIdentityProps = {
  kind: AudienceIdentifierKind;
  person: AudiencePerson | null;
};

/** Who is being edited: the match key as a locked row, in the section Add person fills in. */
function PersonIdentity({ kind, person }: Readonly<PersonIdentityProps>) {
  if (!person) return null;
  return (
    <PanelSection icon={UserRound} title="Participant">
      <div className="grid gap-3">
        <IdentifierRow kind={kind} identifier={person.identifier} />
        <p className="text-xs text-muted-foreground">
          It matches this participant across forms, so it never changes.
        </p>
      </div>
    </PanelSection>
  );
}

type OpenedLinkNoteProps = { formId: string; person: AudiencePerson | null };

type ViewResponseProps = { formId: string; submissionId: string };

function ViewResponse({ formId, submissionId }: Readonly<ViewResponseProps>) {
  const href = formRoutes.submission(formId, submissionId);
  return <TextLink href={href}>View response</TextLink>;
}

/** An opened link froze its response's values; saving still reaches links not yet opened. */
function OpenedLinkNote({ formId, person }: Readonly<OpenedLinkNoteProps>) {
  const link = person?.link;
  if (link?.status !== AudienceLinkStatusKind.Opened) return null;
  const { submissionId } = link;
  return (
    <Alert variant="info" role="status">
      <Info />
      <AlertTitle>Their link is already opened</AlertTitle>
      <AlertDescription>
        <p>{OPENED_NOTE}</p>
        {submissionId && (
          <ViewResponse formId={formId} submissionId={submissionId} />
        )}
      </AlertDescription>
    </Alert>
  );
}

const OPENED_NOTE =
  "Their response keeps the values from when the link was opened. Changes here apply to links not yet opened.";

/** The title names the task; the person is the first section. A Sheet once there are 3+ properties. */
type PanelState = EditPersonPanelProps & { pending: boolean };

function panelProps({
  person,
  open,
  properties,
  onClose,
  pending,
}: PanelState) {
  return {
    open: open && person !== null,
    onOpenChange: closeWhenIdle(pending, onClose),
    title: "Edit participant",
    description:
      "Values for this participant on this form. Emptying a field clears it.",
    errorTitle: "Changes not saved",
    submitLabel: "Save changes",
    pendingLabel: "Saving…",
    desktopType:
      properties.length >= 3 ? ("complex" as const) : ("simple" as const),
  };
}

/** Render it with a `key` that changes on every open so each opening starts fresh. */
export function EditPersonPanel(props: Readonly<EditPersonPanelProps>) {
  const { formId, person, onClose: onDone } = props;
  const form = useEditPerson({ formId, person, onDone });
  const panel = panelProps({ ...props, pending: form.pending });
  return (
    <PanelForm {...form} {...panel} onSubmit={form.submit}>
      <PersonIdentity kind={props.identifierKind} person={person} />
      <OpenedLinkNote formId={formId} person={person} />
      <PersonValueFields
        idPrefix="edit-person"
        description="Only the fields you change are saved."
        properties={props.properties}
        editor={form}
      />
    </PanelForm>
  );
}

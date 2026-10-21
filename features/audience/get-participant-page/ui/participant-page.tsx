"use client";

import { ArrowLeft, FlaskConical, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { TextLink } from "@/components/common/text-link";
import { Button } from "@/components/ui/button";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import type { AudienceParticipant } from "@/lib/endatix-api/audience/types";
import { formRoutes } from "@/lib/routes/form-routes";
import { RemovePersonDialog } from "../../delete-person/ui/remove-person-dialog";
import { useTestAsPerson } from "../../test-as-person/use-test-as-person.hook";
import { EditPersonPanel } from "../../update-person/ui/edit-person-panel";
import { useRowOverlay } from "../../use-panel-state.hook";
import type { ParticipantPageData } from "../load-participant-page.server";
import { LinkCard, ValuesCard } from "./participant-cards";
import { ParticipantSubmissions } from "./participant-submissions";

type ParticipantPageProps = ParticipantPageData & { formId: string };

type Overlays = ReturnType<typeof useRowOverlay<AudienceParticipant>>;

type ActionsProps = ParticipantPageProps & { overlay: Overlays };

/** Test as (with `forms.test`), Edit values (when there is a value to edit), Remove. */
function ParticipantActions({ overlay, ...props }: Readonly<ActionsProps>) {
  const testAs = useTestAsPerson(props.formId);
  const { participant } = props;
  return (
    <>
      {props.canTest ? (
        <Button variant="outline" onClick={() => testAs(participant)}>
          <FlaskConical aria-hidden="true" />
          Test as this participant
        </Button>
      ) : null}
      {props.properties.length > 0 ? (
        <Button variant="outline" onClick={() => overlay.edit(participant)}>
          <Pencil aria-hidden="true" />
          Edit values
        </Button>
      ) : null}
      <Button variant="outline" onClick={() => overlay.remove(participant)}>
        <Trash2 aria-hidden="true" />
        Remove
      </Button>
    </>
  );
}

/** The edit panel refreshes this page; Remove goes back to Audience, where they no longer are. */
function ParticipantOverlays({ overlay, ...props }: Readonly<ActionsProps>) {
  const { formId } = props;
  return (
    <>
      <EditPersonPanel
        key={overlay.session}
        {...props}
        person={overlay.target}
        open={overlay.isEditing}
        onClose={overlay.close}
      />
      <RemovePersonDialog
        formId={formId}
        person={overlay.target}
        open={overlay.isDeleting}
        onClose={overlay.close}
        afterRemove={formRoutes.audience(formId)}
      />
    </>
  );
}

const TEST_BADGE = <StatusBadge tone="attention" label="Test" />;

/**
 * One participant on a form (DESIGN.md §6 Page masthead): who they are, their values, their
 * link once issued, and their newest submissions. Only readers with `forms.edit` reach it.
 */
export function ParticipantPage(props: Readonly<ParticipantPageProps>) {
  const overlay = useRowOverlay<AudienceParticipant>();
  const { formId, participant } = props;
  return (
    <div className="flex flex-col gap-6">
      <TextLink href={formRoutes.audience(formId)} className="self-start">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Audience
      </TextLink>
      <FormWorkspaceHeader
        title={participant.identifier}
        titleBadge={participant.isTest ? TEST_BADGE : null}
        description="Participant on this form"
        actions={<ParticipantActions {...props} overlay={overlay} />}
      />
      <div className="grid-card-list">
        <ValuesCard {...props} />
        <LinkCard {...props} />
      </div>
      <ParticipantSubmissions
        formId={formId}
        submissions={participant.submissions}
        total={participant.submissionTotal}
      />
      <ParticipantOverlays {...props} overlay={overlay} />
    </div>
  );
}

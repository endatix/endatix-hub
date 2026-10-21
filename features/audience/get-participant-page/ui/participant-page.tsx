"use client";

import {
  ArrowLeft,
  FlaskConical,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
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

type ActionSpec = {
  show: boolean;
  label: string;
  icon: LucideIcon;
  run: (participant: AudienceParticipant) => void;
};

/** Test as (with `forms.test`), Edit values (when there is a value to edit), Remove. */
function useActionSpecs({ overlay, ...props }: ActionsProps): ActionSpec[] {
  const testAs = useTestAsPerson(props.formId);
  return [
    {
      show: props.canTest,
      label: "Test as this participant",
      icon: FlaskConical,
      run: testAs,
    },
    {
      show: props.properties.length > 0,
      label: "Edit values",
      icon: Pencil,
      run: overlay.edit,
    },
    { show: true, label: "Remove", icon: Trash2, run: overlay.remove },
  ];
}

function ParticipantActions(props: Readonly<ActionsProps>) {
  const specs = useActionSpecs(props);
  return specs
    .filter((spec) => spec.show)
    .map(({ label, icon: Icon, run }) => (
      <Button
        key={label}
        variant="outline"
        onClick={() => run(props.participant)}
      >
        <Icon aria-hidden="true" />
        {label}
      </Button>
    ));
}

/** The edit panel refreshes this page; Remove goes back to Audience, where they no longer are. */
function ParticipantOverlays(props: Readonly<ActionsProps>) {
  const { formId, overlay, identifierKind, properties } = props;
  const target = { formId, person: overlay.target, onClose: overlay.close };
  const afterRemove = formRoutes.audience(formId);
  return (
    <>
      <EditPersonPanel
        key={overlay.session}
        {...{ ...target, identifierKind, properties }}
        open={overlay.isEditing}
      />
      <RemovePersonDialog
        {...target}
        open={overlay.isDeleting}
        afterRemove={afterRemove}
      />
    </>
  );
}

const TEST_BADGE = <StatusBadge tone="attention" label="Test" />;

/** Back to Audience, then who they are (DESIGN.md §6 Page masthead) with their actions. */
function ParticipantMasthead(props: Readonly<ActionsProps>) {
  const { participant } = props;
  return (
    <>
      <TextLink href={formRoutes.audience(props.formId)} className="self-start">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Audience
      </TextLink>
      <FormWorkspaceHeader
        title={participant.identifier}
        titleBadge={participant.isTest ? TEST_BADGE : null}
        description="Participant on this form"
        actions={<ParticipantActions {...props} />}
      />
    </>
  );
}

/**
 * One participant on a form: who they are, their values, their link once issued, and their
 * newest submissions. Only readers with `forms.edit` reach it.
 */
export function ParticipantPage(props: Readonly<ParticipantPageProps>) {
  const overlay = useRowOverlay<AudienceParticipant>();
  const { formId, participant } = props;
  return (
    <div className="flex flex-col gap-6">
      <ParticipantMasthead {...props} overlay={overlay} />
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

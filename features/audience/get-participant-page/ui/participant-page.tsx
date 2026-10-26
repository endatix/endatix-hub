"use client";

import {
  ArrowLeft,
  FlaskConical,
  Link2,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { TextLink } from "@/components/common/text-link";
import { Button } from "@/components/ui/button";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { AudienceParticipant } from "@/lib/endatix-api/audience/types";
import { useAudienceReturnHref } from "../../get-audience-page/ui/use-audience-return-href";
import { CopyTestLinkDialog } from "../../copy-test-link/ui/copy-test-link-dialog";
import { useCopyTestLinkDialog } from "../../copy-test-link/ui/use-copy-test-link-dialog.hook";
import { RemovePersonDialog } from "../../delete-person/ui/remove-person-dialog";
import { TEST_BADGE } from "../../ui/test-badge";
import { useTestAsPerson } from "../../test-as-person/use-test-as-person.hook";
import { EditPersonPanel } from "../../update-person/ui/edit-person-panel";
import { useRowOverlay } from "../../use-panel-state.hook";
import type { ParticipantPageData } from "../load-participant-page.server";
import { LinkCard, ValuesCard } from "./participant-cards";
import { ParticipantSubmissions } from "./participant-submissions";

type ParticipantPageProps = ParticipantPageData & { formId: string };

type Overlays = ReturnType<typeof useRowOverlay<AudienceParticipant>>;

type ActionsProps = ParticipantPageProps & {
  overlay: Overlays;
  testLink: ReturnType<typeof useCopyTestLinkDialog>;
  audienceHref: Route;
};

type ActionSpec = {
  show: boolean;
  label: string;
  icon: LucideIcon;
  run: (participant: AudienceParticipant) => void;
};

/**
 * Test as (with `forms.test`), Copy test link (a test participant, with `canCopyTestLink`), Edit
 * values (when there is a value to edit), Remove. A test submission reads the page again, so
 * their submissions show the new one.
 */
function useActionSpecs({
  overlay,
  testLink,
  ...props
}: ActionsProps): ActionSpec[] {
  const router = useRouter();
  const testAs = useTestAsPerson(props.formId, router.refresh);
  return [
    {
      show: props.canTest,
      label: "Test as this participant",
      icon: FlaskConical,
      run: testAs,
    },
    {
      show: props.canCopyTestLink && props.participant.isTest,
      label: "Copy test link",
      icon: Link2,
      run: testLink.open,
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

/**
 * The edit panel and each test link refresh this page; Remove goes back to Audience, where they
 * no longer are.
 */
function ParticipantOverlays(props: Readonly<ActionsProps>) {
  const { formId, overlay, testLink, identifierKind, properties } = props;
  const router = useRouter();
  const target = { formId, person: overlay.target, onClose: overlay.close };
  const afterRemove = props.audienceHref;
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
      <CopyTestLinkDialog
        formId={formId}
        {...testLink.dialog}
        onCreated={router.refresh}
      />
    </>
  );
}

/** Back to Audience, then who they are (DESIGN.md §6 Page masthead) with their actions. */
function ParticipantMasthead(props: Readonly<ActionsProps>) {
  const { participant, audienceHref } = props;
  return (
    <>
      <TextLink href={audienceHref} className="self-start">
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

function ParticipantBody(props: Readonly<ParticipantPageProps>) {
  const { formId, participant } = props;
  return (
    <>
      <div className="grid-card-list">
        <ValuesCard {...props} />
        <LinkCard {...props} />
      </div>
      <ParticipantSubmissions
        formId={formId}
        submissions={participant.submissions}
        total={participant.submissionTotal}
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
  const testLink = useCopyTestLinkDialog();
  const audienceHref = useAudienceReturnHref(props.formId);
  const shared = { ...props, overlay, testLink, audienceHref };
  return (
    <div className="flex flex-col gap-6">
      <ParticipantMasthead {...shared} />
      <ParticipantBody {...props} />
      <ParticipantOverlays {...shared} />
    </div>
  );
}

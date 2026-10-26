"use client";

import { Link2 } from "lucide-react";
import type { MouseEvent } from "react";
import { PanelFormError } from "@/components/common/panel-form";
import { ShareLinkRow } from "@/components/common/share-link-row";
import { Spinner } from "@/components/loaders/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { useReissueLink } from "../use-reissue-link.hook";

export type LinkHolder = Pick<
  AudiencePerson,
  "membershipId" | "audienceMemberId" | "identifier"
>;

type ReissueLinkDialogProps = {
  formId: string;
  person: LinkHolder | null;
  open: boolean;
  onClose: () => void;
};

const WARNING =
  "Their current link stops working at once, and a page they already have open stops within a minute. The new link opens the same response, so nothing they entered is lost.";

const ERROR_TITLE = "The link was not reissued";

function NewLink({ url }: Readonly<{ url: string }>) {
  return (
    <ShareLinkRow
      icon={Link2}
      title="New link"
      description="Send it to them. It is shown only now."
      value={url}
      copyLabel="Copy the new link"
      className="gap-2 p-3"
    />
  );
}

type ReissueState = ReturnType<typeof useReissueLink>;

function ConfirmFooter({ pending, reissue }: Readonly<ReissueState>) {
  const confirm = (event: MouseEvent) => {
    event.preventDefault();
    void reissue();
  };
  return (
    <AlertDialogFooter>
      <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
      <AlertDialogAction disabled={pending} onClick={confirm}>
        {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
        {pending ? "Reissuing…" : "Reissue link"}
      </AlertDialogAction>
    </AlertDialogFooter>
  );
}

function DoneFooter() {
  return (
    <AlertDialogFooter>
      <AlertDialogCancel>Done</AlertDialogCancel>
    </AlertDialogFooter>
  );
}

function ReissueLinkContent({
  identifier,
  state,
}: Readonly<{ identifier: string; state: ReissueState }>) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="break-all">
          Reissue the link for {identifier}?
        </AlertDialogTitle>
        <AlertDialogDescription>{WARNING}</AlertDialogDescription>
      </AlertDialogHeader>
      <PanelFormError title={ERROR_TITLE} message={state.error} />
      {state.url ? <NewLink url={state.url} /> : null}
      {state.url ? <DoneFooter /> : <ConfirmFooter {...state} />}
    </AlertDialogContent>
  );
}

type OpenDialogProps = Omit<ReissueLinkDialogProps, "person"> & {
  person: LinkHolder;
};

function OpenReissueLinkDialog({ formId, person, ...props }: OpenDialogProps) {
  const state = useReissueLink({ formId, membershipId: person.membershipId });
  const openChange = (open: boolean) => {
    if (!open) state.close(props.onClose);
  };
  return (
    <AlertDialog open={props.open} onOpenChange={openChange}>
      <ReissueLinkContent identifier={person.identifier} state={state} />
    </AlertDialog>
  );
}

/**
 * Reissue link: a new link for a participant who lost theirs, after a warning that the old one
 * stops working. The new link is shown with a copy button, so a refused clipboard still leaves
 * it on screen. Mounted per participant, so each one starts at the warning.
 */
export function ReissueLinkDialog({
  person,
  ...props
}: Readonly<ReissueLinkDialogProps>) {
  if (!person) return null;
  return (
    <OpenReissueLinkDialog
      key={person.membershipId}
      {...props}
      person={person}
    />
  );
}

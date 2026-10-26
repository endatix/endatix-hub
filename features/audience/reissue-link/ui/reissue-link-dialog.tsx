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
  "Their current link stops working at once, and a page they already have open stops within a minute. If they started the form, the new link resumes their response.";

const REISSUED =
  "Their old link no longer opens. Send them this one: it is shown only now.";

const ERROR_TITLE = "The link was not reissued";

function NewLink({ url }: Readonly<{ url: string }>) {
  return (
    <ShareLinkRow
      icon={Link2}
      title="New link"
      description="Opens their form without a login. Anyone with it can fill it in."
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

/** The warning before the reissue; once it is done, what happened to the old link. */
function ReissueLinkHeader({
  identifier,
  reissued,
}: Readonly<{ identifier: string; reissued: boolean }>) {
  return (
    <AlertDialogHeader>
      <AlertDialogTitle className="break-all">
        {reissued
          ? `New link for ${identifier}`
          : `Reissue the link for ${identifier}?`}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {reissued ? REISSUED : WARNING}
      </AlertDialogDescription>
    </AlertDialogHeader>
  );
}

function ReissueLinkContent({
  identifier,
  state,
}: Readonly<{ identifier: string; state: ReissueState }>) {
  return (
    <AlertDialogContent>
      <ReissueLinkHeader
        identifier={identifier}
        reissued={state.url !== null}
      />
      <PanelFormError title={ERROR_TITLE} message={state.error} />
      {state.url ? <NewLink url={state.url} /> : null}
      {state.url ? <DoneFooter /> : <ConfirmFooter {...state} />}
    </AlertDialogContent>
  );
}

/**
 * Reissue link: a new link for a participant who lost theirs, after a warning that the old one
 * stops working. The new link is shown with a copy button, so a refused clipboard still leaves
 * it on screen. Key it by the overlay's session, so each open starts at the warning.
 */
export function ReissueLinkDialog({
  formId,
  person,
  open,
  onClose,
}: Readonly<ReissueLinkDialogProps>) {
  const membershipId = person?.membershipId ?? "";
  const state = useReissueLink({ formId, membershipId }, onClose);
  const openChange = (next: boolean) => {
    if (!next) state.close();
  };
  return (
    <AlertDialog open={open && person !== null} onOpenChange={openChange}>
      <ReissueLinkContent identifier={person?.identifier ?? ""} state={state} />
    </AlertDialog>
  );
}

type RowOverlay = {
  target: LinkHolder | null;
  session: number;
  isReissuing: boolean;
  close: () => void;
};

/** Reissue link as a list's row overlay (`useRowOverlay`): a fresh dialog on every open. */
export function ReissueLinkOverlay({
  formId,
  overlay,
}: Readonly<{ formId: string; overlay: RowOverlay }>) {
  return (
    <ReissueLinkDialog
      key={overlay.session}
      formId={formId}
      person={overlay.target}
      open={overlay.isReissuing}
      onClose={overlay.close}
    />
  );
}

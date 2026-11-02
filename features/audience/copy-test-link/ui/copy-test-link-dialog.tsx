"use client";

import { Link2 } from "lucide-react";
import { ShareLinkRow } from "@/components/common/share-link-row";
import { Button } from "@/components/ui/button";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { formatExpiresIn } from "@/lib/share-links/share-link-expiry";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import type { TestLink } from "../create-test-link.action";
import { useCopyTestLink } from "../use-copy-test-link.hook";
import { TestLinkExpirySelect } from "../../ui/test-link-expiry-select";

export type TestPerson = Pick<
  AudiencePerson,
  "audienceMemberId" | "membershipId" | "identifier"
>;

type CopyTestLinkDialogProps = {
  formId: string;
  person: TestPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs after each copy, for a page that lists their submissions. */
  onCreated?: () => void;
};

const EXPIRY_ID = "test-link-expiry";

function CopiedLink({ link }: Readonly<{ link: TestLink }>) {
  return (
    <ShareLinkRow
      icon={Link2}
      title="Test link"
      description="Opens one test submission. Anyone with it can fill it in."
      value={link.url}
      copyLabel="Copy this link"
      className="gap-2 p-3"
      footer={formatExpiresIn(link.expiresAt)}
    />
  );
}

const copyLabel = (pending: boolean, copied: boolean) => {
  if (pending) return "Creating...";
  return copied ? "Create and copy another" : "Create and copy link";
};

type PanelProps = Omit<CopyTestLinkDialogProps, "person"> & {
  person: TestPerson;
};

function CopyTestLinkHeader({ identifier }: Readonly<{ identifier: string }>) {
  return (
    <ResponsivePanelHeader>
      <ResponsivePanelTitle>Copy test link</ResponsivePanelTitle>
      <ResponsivePanelDescription>
        A link to a new test submission as{" "}
        <span className="font-medium break-all text-foreground">
          {identifier}
        </span>
        . It opens without a login, also on a private form, and each copy makes
        a new test submission.
      </ResponsivePanelDescription>
    </ResponsivePanelHeader>
  );
}

type TestLinkState = ReturnType<typeof useCopyTestLink>;

type ContentProps = Readonly<{ testLink: TestLinkState }>;

function CreateButton({ testLink: { pending, link, copy } }: ContentProps) {
  return (
    <ResponsivePanelFooter>
      <Button disabled={pending} onClick={copy}>
        {copyLabel(pending, link !== null)}
      </Button>
    </ResponsivePanelFooter>
  );
}

function CopyTestLinkContent({ testLink }: ContentProps) {
  return (
    <>
      <ResponsivePanelBody className="flex flex-col gap-3">
        <TestLinkExpirySelect
          id={EXPIRY_ID}
          value={testLink.expiryMinutes}
          onChange={testLink.setExpiryMinutes}
        />
        {testLink.link ? <CopiedLink link={testLink.link} /> : null}
      </ResponsivePanelBody>
      <CreateButton testLink={testLink} />
    </>
  );
}

/** Locked while a link is being created (DESIGN.md Overlays rule 8). */
function CopyTestLinkPanel({ person, ...props }: Readonly<PanelProps>) {
  const { formId, open, onOpenChange, onCreated } = props;
  const testLink = useCopyTestLink(formId, person, onCreated);
  return (
    <ResponsivePanel
      {...{ open, onOpenChange }}
      desktopType="simple"
      dismissible={!testLink.pending}
      drawerContentClassName="h-auto"
    >
      <CopyTestLinkHeader identifier={person.identifier} />
      <CopyTestLinkContent testLink={testLink} />
    </ResponsivePanel>
  );
}

/**
 * Copy test link: a link to a new test submission as this test person, for a colleague
 * without an Endatix login. Mounted per person, so a new person starts with no link and the
 * 7-day lifetime.
 */
export function CopyTestLinkDialog({
  person,
  ...props
}: Readonly<CopyTestLinkDialogProps>) {
  if (!person) return null;
  return (
    <CopyTestLinkPanel
      key={person.audienceMemberId}
      {...props}
      person={person}
    />
  );
}

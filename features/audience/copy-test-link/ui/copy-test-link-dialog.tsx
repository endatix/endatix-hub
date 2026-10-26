"use client";

import { Link2 } from "lucide-react";
import { ShareLinkRow } from "@/components/common/share-link-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXPIRY_OPTIONS,
  formatExpiresIn,
} from "@/lib/share-links/share-link-expiry";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import type { TestLink } from "../create-test-link.action";
import { useCopyTestLink } from "../use-copy-test-link.hook";

export type TestPerson = Pick<
  AudiencePerson,
  "audienceMemberId" | "identifier"
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

const EXPIRY_ITEMS = EXPIRY_OPTIONS.map((option) => (
  <SelectItem key={option.value} value={String(option.value)}>
    {option.label}
  </SelectItem>
));

type ExpiryProps = { value: number; onChange: (minutes: number) => void };

/** The Share Submission presets, 1 hour to 60 days. */
function ExpirySelect({ value, onChange }: Readonly<ExpiryProps>) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
      <Label htmlFor={EXPIRY_ID} className="text-sm font-medium">
        Link lifetime
      </Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger id={EXPIRY_ID} className="h-9 w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{EXPIRY_ITEMS}</SelectContent>
      </Select>
    </div>
  );
}

function CopiedLink({ link }: Readonly<{ link: TestLink }>) {
  return (
    <ShareLinkRow
      icon={Link2}
      title="Test link"
      description="Opens one test submission. Anyone with it can fill it in."
      value={link.url}
      copyLabel="Copy test link again"
      className="gap-2 p-3"
      footer={formatExpiresIn(link.expiresAt)}
    />
  );
}

const copyLabel = (pending: boolean, copied: boolean) => {
  if (pending) return "Copying...";
  return copied ? "Copy a new link" : "Copy link";
};

type BodyProps = Omit<CopyTestLinkDialogProps, "open" | "onOpenChange"> & {
  person: TestPerson;
};

/** Mounted per person, so a new person starts with no link and the 7-day lifetime. */
function CopyTestLinkBody({ formId, person, onCreated }: Readonly<BodyProps>) {
  const testLink = useCopyTestLink(formId, person.audienceMemberId, onCreated);
  const { link, pending } = testLink;
  return (
    <div className="flex flex-col gap-3">
      <ExpirySelect
        value={testLink.expiryMinutes}
        onChange={testLink.setExpiryMinutes}
      />
      {link ? <CopiedLink link={link} /> : null}
      <Button className="self-end" disabled={pending} onClick={testLink.copy}>
        {copyLabel(pending, link !== null)}
      </Button>
    </div>
  );
}

function CopyTestLinkHeader({ identifier }: Readonly<{ identifier?: string }>) {
  return (
    <DialogHeader className="space-y-1">
      <DialogTitle>Copy test link</DialogTitle>
      <DialogDescription>
        A link to a new test submission as{" "}
        <span className="font-medium break-all text-foreground">
          {identifier}
        </span>
        . It opens without a login, also on a private form, and each copy makes
        a new test submission.
      </DialogDescription>
    </DialogHeader>
  );
}

/**
 * Copy test link: a link to a new test submission as this test person, for a colleague
 * without an Endatix login. Each copy makes a new test submission.
 */
export function CopyTestLinkDialog(props: Readonly<CopyTestLinkDialogProps>) {
  const { open, onOpenChange, person, ...body } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-lg">
        <CopyTestLinkHeader identifier={person?.identifier} />
        {person ? (
          <CopyTestLinkBody
            key={person.audienceMemberId}
            {...body}
            person={person}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

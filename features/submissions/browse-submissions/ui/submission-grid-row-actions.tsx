"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isSubmissionEditable } from "@/features/submissions/domain";
import { SubmissionShareLinksDialog } from "@/features/submissions/share-links/submission-share-links-dialog";
import { DownloadFilesDropdownItem } from "@/features/submissions/ui/download-files-dropdown-item";
import { DeleteSubmissionDialog } from "@/features/submissions/use-cases/delete-submission";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import { cn } from "@/lib/utils";
import {
  FilePenLine,
  Files,
  FlaskConical,
  LinkIcon,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import {
  useSubmissionTestMark,
  type SubmissionTestMarkItem,
} from "./use-submission-test-mark.hook";

type RowProps = { row: SubmissionGridRow };

type RowDialog = "shareLinks" | "delete";

type RowOpenProps = RowProps & { onOpen: (dialog: RowDialog) => void };

type RowMenuProps = RowOpenProps & {
  testMark: SubmissionTestMarkItem | null;
};

/** The row's menu and the dialogs it opens. */
export function SubmissionGridRowActions({ row }: Readonly<RowProps>) {
  const [dialog, setDialog] = useState<RowDialog | null>(null);
  const testMark = useSubmissionTestMark(row);
  return (
    <>
      <RowActionsMenu row={row} onOpen={setDialog} testMark={testMark} />
      <RowDialogs row={row} dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

type RowDialogsProps = RowProps & {
  dialog: RowDialog | null;
  onClose: () => void;
};

function RowDialogs({ row, dialog, onClose }: Readonly<RowDialogsProps>) {
  const onOpenChange = (open: boolean) => !open && onClose();
  return (
    <>
      <SubmissionShareLinksDialog
        formId={row.formId}
        submissionId={row.id}
        open={dialog === "shareLinks"}
        onOpenChange={onOpenChange}
      />
      <DeleteRowDialog
        row={row}
        open={dialog === "delete"}
        onOpenChange={onOpenChange}
      />
    </>
  );
}

type DeleteRowDialogProps = RowProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DeleteRowDialog({ row, ...dialog }: Readonly<DeleteRowDialogProps>) {
  const { data: session } = useSession();
  return (
    <DeleteSubmissionDialog
      {...dialog}
      formId={row.formId}
      submissionId={row.id}
      isTestSubmission={row.isTestSubmission}
      submitterId={row.submitterId}
      submitterDisplayId={row.submitterDisplayId}
      currentUserId={session?.user?.id}
    />
  );
}

function RowActionsMenu(props: Readonly<RowMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="hover:bg-primary/20"
          onClick={(event) => event.stopPropagation()}
          aria-label="Submission actions"
          size="icon"
          variant="ghost"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <RowActionsContent {...props} />
    </DropdownMenu>
  );
}

function RowActionsContent({ row, onOpen, testMark }: Readonly<RowMenuProps>) {
  return (
    <DropdownMenuContent
      onClick={(event) => event.stopPropagation()}
      className="text-muted-foreground"
      align="start"
    >
      <RowOpenItems row={row} onOpen={onOpen} />
      {testMark && <TestMarkItem testMark={testMark} />}
      <DropdownMenuSeparator />
      <MenuAction
        icon={Trash2}
        label="Delete"
        onSelect={() => onOpen("delete")}
        className="text-destructive focus:text-destructive"
      />
    </DropdownMenuContent>
  );
}

function RowOpenItems({ row, onOpen }: Readonly<RowOpenProps>) {
  return (
    <>
      {isSubmissionEditable(row.collectionStatus) && (
        <MenuLink
          href={`/forms/${row.formId}/submissions/${row.id}/edit`}
          icon={FilePenLine}
          label="Edit"
        />
      )}
      <MenuAction
        icon={LinkIcon}
        label="Share Links"
        onSelect={() => onOpen("shareLinks")}
      />
      <MenuLink
        href={`/forms/${row.formId}/submissions/${row.id}/files`}
        icon={Files}
        label="View Files"
      />
      <DownloadFilesDropdownItem formId={row.formId} submissionId={row.id} />
    </>
  );
}

function TestMarkItem({
  testMark,
}: Readonly<{ testMark: SubmissionTestMarkItem }>) {
  return (
    <MenuAction
      icon={FlaskConical}
      label={testMark.label}
      onSelect={testMark.mark}
      disabled={testMark.isPending}
    />
  );
}

type MenuItemProps = { icon: LucideIcon; label: string };

function MenuLink<T extends string>({
  href,
  icon: Icon,
  label,
}: Readonly<MenuItemProps & { href: Route<T> }>) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href={href}>
        <Icon className="mr-2 h-4 w-4" />
        <span>{label}</span>
      </Link>
    </DropdownMenuItem>
  );
}

type MenuActionProps = MenuItemProps & {
  onSelect: () => void;
  className?: string;
  disabled?: boolean;
};

function MenuAction({
  icon: Icon,
  label,
  onSelect,
  className,
  disabled,
}: Readonly<MenuActionProps>) {
  return (
    <DropdownMenuItem
      className={cn("cursor-pointer", className)}
      onSelect={onSelect}
      disabled={disabled}
    >
      <Icon className="mr-2 h-4 w-4" />
      <span>{label}</span>
    </DropdownMenuItem>
  );
}

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
  LinkIcon,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

type RowProps = { row: SubmissionGridRow };

type RowDialog = "shareLinks" | "delete";

type RowMenuProps = RowProps & { onOpen: (dialog: RowDialog) => void };

/** The row's menu and the dialogs it opens. */
export function SubmissionGridRowActions({ row }: Readonly<RowProps>) {
  const [dialog, setDialog] = useState<RowDialog | null>(null);
  return (
    <>
      <RowActionsMenu row={row} onOpen={setDialog} />
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

function RowActionsContent({ row, onOpen }: Readonly<RowMenuProps>) {
  return (
    <DropdownMenuContent
      onClick={(event) => event.stopPropagation()}
      className="text-muted-foreground"
      align="start"
    >
      <RowOpenItems row={row} onOpen={onOpen} />
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

function RowOpenItems({ row, onOpen }: Readonly<RowMenuProps>) {
  return (
    <>
      <EditItem row={row} />
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

function EditItem({ row }: Readonly<RowProps>) {
  if (!isSubmissionEditable(row.collectionStatus)) {
    return null;
  }

  return (
    <MenuLink
      href={`/forms/${row.formId}/submissions/${row.id}/edit`}
      icon={FilePenLine}
      label="Edit"
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
};

function MenuAction({
  icon: Icon,
  label,
  onSelect,
  className,
}: Readonly<MenuActionProps>) {
  return (
    <DropdownMenuItem
      className={cn("cursor-pointer", className)}
      onSelect={onSelect}
    >
      <Icon className="mr-2 h-4 w-4" />
      <span>{label}</span>
    </DropdownMenuItem>
  );
}

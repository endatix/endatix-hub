"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { DeleteSubmissionDialog } from "@/features/submissions/use-cases/delete-submission";
import { Submission } from "@/lib/endatix-api";
import { Row } from "@tanstack/react-table";
import {
  FileDown,
  FilePenLine,
  Files,
  LinkIcon,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { DownloadFilesDropdownItem } from "../download-files-dropdown-item";
import { SubmissionShareLinksDialog } from "../../share-links/submission-share-links-dialog";

interface RowActionsProps<TData> {
  row: Row<TData>;
}

export function RowActions<TData>({ row }: RowActionsProps<TData>) {
  const [open, setOpen] = useState(false);
  const [isShareLinksOpen, setIsShareLinksOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { data: session } = useSession();
  const item = row.original as Submission;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className="hover:bg-primary/20"
            onClick={(event) => event.stopPropagation()}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Submission actions"
            size="icon"
            variant="ghost"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open Submission Actions Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          onClick={(event) => event.stopPropagation()}
          className="text-muted-foreground"
          align="start"
        >
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={`/forms/${item.formId}/submissions/${item.id}/edit`}>
              <FilePenLine className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-not-allowed">
            <FileDown className="mr-2 h-4 w-4" />
            <span>Export PDF</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => setIsShareLinksOpen(true)}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            <span>Share Links</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={`/forms/${item.formId}/submissions/${item.id}/files`}>
              <Files className="mr-2 h-4 w-4" />
              <span>View Files</span>
            </Link>
          </DropdownMenuItem>
          <DownloadFilesDropdownItem
            formId={item.formId}
            submissionId={item.id}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onSelect={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SubmissionShareLinksDialog
        formId={item.formId}
        submissionId={item.id}
        open={isShareLinksOpen}
        onOpenChange={setIsShareLinksOpen}
      />
      <DeleteSubmissionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        formId={item.formId}
        submissionId={item.id}
        isTestSubmission={item.isTestSubmission}
        submitterId={item.submitterId}
        submitterDisplayId={item.submitterDisplayId}
        currentUserId={session?.user?.id}
      />
    </>
  );
}

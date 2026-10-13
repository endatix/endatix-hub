"use client";

import { cn } from "@/lib/utils";
import { CardOpenSurface } from "@/components/card-open-surface";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Form } from "@/types";
import { Badge } from "@/components/ui/badge";
import { FormFolderChip, type FormFolderChipProps } from "./form-folder-chip";
import Link from "next/link";
import {
  FilePen,
  FolderInput,
  Globe,
  Link2,
  List,
  Lock,
  MoreVertical,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoveToFolderDialog,
  useMoveToFolder,
} from "@/features/folders/move-to-folder";
import { DeleteFormConfirm } from "@/features/forms/ui/delete-form-confirm";

type FormCardProps = Omit<React.ComponentProps<typeof Card>, "onClick"> & {
  /** Opens the form: a click on the card body, or its button from the keyboard. */
  onOpen?: () => void;
  form: Form;
  folderContext?: FormFolderChipProps;
  isSelected: boolean;
  /** The Audience item in the card's menu; only when the tenant has audiences. */
  showAudienceLink?: boolean;
  onSaveAsTemplate: () => void;
};

interface SubmissionsLabelProps {
  formId: string;
  submissionsCount?: number;
}

const SubmissionsLabel: React.FC<SubmissionsLabelProps> = ({
  submissionsCount = 0,
}) => {
  const submissionWord = submissionsCount === 1 ? "submission" : "submissions";
  const getFormattedSubmissionsCount = () => {
    const dividedByThousand = submissionsCount / 1000;
    if (dividedByThousand > 1) {
      return `${dividedByThousand.toFixed(1)}k`;
    }

    return submissionsCount.toString();
  };

  if (submissionsCount == 0) {
    return (
      <span className="block min-w-0 truncate text-sm text-muted-foreground">
        No submissions yet
      </span>
    );
  }

  return (
    <div className="min-w-0 truncate">
      <span className="text-2xl font-medium text-muted-foreground">
        {getFormattedSubmissionsCount()}
      </span>
      <span className="pl-2 text-sm text-muted-foreground">
        {submissionWord}
      </span>
    </div>
  );
};

/** In the card's menu, not its footer: a fourth footer link does not fit a card at the grid minimum. */
function AudienceMenuItem({ formId }: Readonly<{ formId: string }>) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href={`/forms/${formId}/audience`}>
        <Users className="mr-2 size-4" />
        Audience
      </Link>
    </DropdownMenuItem>
  );
}

const FormCard = ({
  form,
  folderContext,
  isSelected,
  showAudienceLink = false,
  onSaveAsTemplate,
  className,
  onOpen,
  ...props
}: FormCardProps) => {
  const getFormLabel = () => (form.isEnabled ? "Enabled" : "Disabled");
  const getVisibilityLabel = () => (form.isPublic ? "Public" : "Private");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { openMoveDialog, dialogProps } = useMoveToFolder({
    ...form,
    kind: "form",
  });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleOpenSaveAsTemplate = () => {
    setIsDropdownOpen(false);
    onSaveAsTemplate();
  };

  const handleOpenMoveDialog = () => {
    setIsDropdownOpen(false);
    return openMoveDialog();
  };

  return (
    <Card
      className={cn(
        "group flex h-[230px] w-full max-w-full flex-col gap-0 py-0",
        isSelected ? "border-primary bg-accent" : "",
        className,
      )}
      {...props}
    >
      <CardOpenSurface
        label={form.name}
        onOpen={onOpen}
        className="flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col rounded-t-md transition-colors group-hover:bg-muted/45"
      >
        <div className="flex shrink-0 flex-col gap-2 p-4 pt-4 pb-2">
          {folderContext ? (
            <FormFolderChip {...folderContext} className="mb-0" />
          ) : null}
          <CardTitle
            title={form.name}
            className="tracking-tigher line-clamp-2 min-h-[4.125rem] min-w-0 font-sans text-2xl leading-snug font-normal break-words"
          >
            {form.name}
          </CardTitle>
        </div>
        <CardContent className="mt-auto shrink-0 p-4 pt-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <SubmissionsLabel
                formId={form.id}
                submissionsCount={form?.submissionsCount}
              />
            </div>
            <div className="flex shrink-0 flex-nowrap items-center gap-1">
              <Badge
                className="pointer-events-none text-xs font-normal"
                variant={form.isEnabled ? "default" : "secondary"}
              >
                {getFormLabel()}
              </Badge>
              <Badge
                className="pointer-events-none flex items-center gap-1 text-xs font-normal"
                variant={form.isPublic ? "default" : "outline"}
              >
                {form.isPublic ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {getVisibilityLabel()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </CardOpenSurface>
      <CardFooter className="mt-auto flex h-16 min-w-0 cursor-default items-center overflow-hidden rounded-b-[6px] border-t bg-muted px-4 py-0 [.border-t]:pt-0">
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-x-3 overflow-x-auto overflow-y-hidden opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              href={{ pathname: `/forms/${form.id}/design` }}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm leading-none whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <FilePen className="size-4 shrink-0" />
              Design
            </Link>
            <Link
              href={`/share/${form.id}`}
              target="_blank"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm leading-none whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <Link2 className="size-4 shrink-0" />
              Share Link
            </Link>
            <Link
              href={{
                pathname: form?.submissionsCount
                  ? `/forms/${form.id}/submissions`
                  : "/",
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 text-sm leading-none whitespace-nowrap text-muted-foreground",
                form?.submissionsCount
                  ? "cursor-pointer hover:text-foreground"
                  : "pointer-events-none cursor-default opacity-50",
              )}
            >
              <List className="size-4 shrink-0" />
              Submissions
            </Link>
          </div>
          <div className="relative flex h-full shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                  <span className="sr-only">More options</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" forceMount>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {showAudienceLink && <AudienceMenuItem formId={form.id} />}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleOpenSaveAsTemplate}
                >
                  <Save className="mr-2 size-4" />
                  Save as Template
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void handleOpenMoveDialog();
                  }}
                >
                  <FolderInput className="mr-2 size-4" />
                  Move to folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>
      <DeleteFormConfirm
        form={form}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
      <MoveToFolderDialog {...dialogProps} />
    </Card>
  );
};

export default FormCard;

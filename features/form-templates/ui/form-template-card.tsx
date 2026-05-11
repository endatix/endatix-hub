"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormTemplate } from "@/types";
import Link from "next/link";
import {
  Eye,
  FilePen,
  FilePlus2,
  FolderInput,
  FolderOpen,
  Loader2,
  MoreVertical,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { runCreateFormFromTemplate } from "../application/run-create-form-from-template.client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoveToFolderDialog,
  NO_FOLDER_VALUE,
} from "@/features/folders/ui/move-to-folder-dialog";
import { listFoldersAction } from "@/features/folders/server";
import { moveTemplateToFolderAction } from "@/features/folders/move-template-to-folder";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import type { Route } from "next";

type FormTemplateCardProps = React.ComponentProps<typeof Card> & {
  template: FormTemplate;
  isSelected: boolean;
  onPreviewClick?: (templateId: string) => void;
  requireFolderAssignment?: boolean;
};

const FormTemplateCard = ({
  template,
  isSelected,
  onPreviewClick,
  requireFolderAssignment = false,
  className,
  ...props
}: FormTemplateCardProps) => {
  const [isPending, startTransition] = useTransition();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<
    { id: string; name: string; slug?: string }[]
  >([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>(
    template.folderId ?? NO_FOLDER_VALUE,
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    template.folderId ?? NO_FOLDER_VALUE,
  );
  useEffect(() => {
    setCurrentFolderId(template.folderId ?? NO_FOLDER_VALUE);
  }, [template.folderId]);

  const [isMovePending, setIsMovePending] = useState(false);
  const router = useRouter();

  const handleUseTemplate = () => {
    if (requireFolderAssignment) {
      toast.info({
        title: "Folder selection is required",
        description: "Use Create a Form flow to select a folder first.",
      });
      return;
    }

    startTransition(async () => {
      await runCreateFormFromTemplate(template.id, router);
    });
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onPreviewClick) {
      onPreviewClick(template.id);
    }
  };

  const handleOpenMoveDialog = async () => {
    setIsDropdownOpen(false);
    const listResult = await listFoldersAction();
    if (Result.isError(listResult)) {
      toast.error(listResult.message);
      return;
    }

    const activeFolders = listResult.value
      .filter((folder) => folder.isActive)
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
      }));

    setAvailableFolders(activeFolders);
    setSelectedFolderId(currentFolderId);
    setMoveDialogOpen(true);
  };

  const handleMoveToFolder = async () => {
    if (selectedFolderId === currentFolderId) {
      return;
    }

    setIsMovePending(true);
    const moveResult = await moveTemplateToFolderAction(
      template.id,
      selectedFolderId === NO_FOLDER_VALUE ? null : selectedFolderId,
    );
    setIsMovePending(false);

    if (Result.isError(moveResult)) {
      toast.error({
        title: "Cannot move template to folder",
        description: moveResult.message,
      });
      return;
    }

    const targetFolder =
      selectedFolderId === NO_FOLDER_VALUE
        ? null
        : availableFolders.find((folder) => folder.id === selectedFolderId);
    const targetFolderSlug = targetFolder?.slug;

    toast.success({
      title: "Template moved successfully",
      description: (
        <>
          <strong>{template.name}</strong>
          {targetFolder ? (
            <>
              {" "}
              was moved to <strong>{targetFolder.name}</strong>.
            </>
          ) : (
            <> was removed from its folder.</>
          )}
        </>
      ),
      SvgIcon: FolderOpen,
      action:
        targetFolderSlug && selectedFolderId !== NO_FOLDER_VALUE
          ? {
              label: "Open folder",
              onClick: () => {
                router.push(
                  `/forms/templates/folders/${encodeURIComponent(targetFolderSlug)}` as Route,
                );
              },
            }
          : undefined,
    });
    setCurrentFolderId(selectedFolderId);
    setMoveDialogOpen(false);
  };

  return (
    <Card
      className={cn(
        "group flex h-[230px] w-full max-w-full min-w-[420px] flex-col gap-0 py-0",
        isSelected ? "border-primary bg-accent" : "",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col rounded-t-md transition-colors group-hover:bg-muted/45">
        <CardHeader className="shrink-0 p-4 pt-4 pb-2">
          <CardTitle
            title={template.name}
            className="tracking-tigher line-clamp-2 min-w-0 font-sans text-2xl leading-snug font-normal break-words"
          >
            {template.name}
          </CardTitle>
        </CardHeader>
        <div className="min-h-0 flex-1 shrink" aria-hidden />
        <CardContent className="shrink-0 p-4 pt-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {template.description}
          </p>
        </CardContent>
      </div>
      <CardFooter
        className="mt-auto flex h-16 min-w-0 cursor-default items-center overflow-hidden rounded-b-[6px] border-t bg-muted px-4 py-0 [.border-t]:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-nowrap items-center gap-x-3 overflow-x-auto overflow-y-hidden opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              href={`/forms/templates/${template.id}`}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm leading-none whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <FilePen className="size-4 shrink-0" />
              Design
            </Link>
            <button
              type="button"
              onClick={handlePreviewClick}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm leading-none whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <Eye className="size-4 shrink-0" />
              Preview
            </button>
            <button
              type="button"
              onClick={handleUseTemplate}
              disabled={isPending || requireFolderAssignment}
              title={
                requireFolderAssignment
                  ? "Folder selection is required. Use Create a Form."
                  : undefined
              }
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm leading-none whitespace-nowrap text-muted-foreground hover:text-foreground",
                (isPending || requireFolderAssignment) &&
                  "cursor-not-allowed opacity-50",
              )}
            >
              {isPending ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <FilePlus2 className="size-4 shrink-0" />
              )}
              <span className="whitespace-nowrap">
                {isPending ? "Creating..." : "Use Template"}
              </span>
            </button>
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>
      <MoveToFolderDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        title="Move template to folder"
        fieldId={`move-template-folder-${template.id}`}
        selectedFolderId={selectedFolderId}
        onFolderChange={setSelectedFolderId}
        folderOptions={availableFolders}
        isMovePending={isMovePending}
        canMove={selectedFolderId !== currentFolderId}
        onMove={() => void handleMoveToFolder()}
      />
    </Card>
  );
};

export default FormTemplateCard;

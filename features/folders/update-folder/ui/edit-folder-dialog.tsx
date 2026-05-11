"use client";

import { JsonEditor } from "@/features/data-lists/ui/json-editor";
import { FolderSlugField } from "@/features/folders/ui/folder-slug-field";
import { resolveFolderSlug } from "@/features/folders/folder-slug-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { Result } from "@/lib/result";
import { FolderPen, Lock, Shield } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateFolderAction } from "@/features/folders/server";

type FolderEditDialogProps = {
  folder: Folder;
  redirectToFolderSlugBase?: string | null;
};

export function FolderEditDialog({
  folder,
  redirectToFolderSlugBase = "/forms/folders",
}: Readonly<FolderEditDialogProps>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(folder.name);
  const [slug, setSlug] = useState(folder.slug);
  const [slugEditable, setSlugEditable] = useState(false);
  const [description, setDescription] = useState(folder.description ?? "");
  const [metadata, setMetadata] = useState(folder.metadata ?? "");
  const [isActive, setIsActive] = useState(folder.isActive);
  const [pending, startTransition] = useTransition();
  const isLocked = folder.immutable;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setName(folder.name);
      setSlug(folder.slug);
      setSlugEditable(false);
      setDescription(folder.description ?? "");
      setMetadata(folder.metadata ?? "");
      setIsActive(folder.isActive);
    }
  };

  const onSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const resolvedSlug = resolveFolderSlug({
      name: trimmedName,
      slugInput: slug,
      allowEmpty: false,
    });
    if (resolvedSlug.error) {
      toast.error(resolvedSlug.error);
      return;
    }

    const metadataPayload = metadata.trim();
    if (metadataPayload.length > 0) {
      try {
        JSON.parse(metadataPayload);
      } catch {
        toast.error("Metadata must be valid JSON.");
        return;
      }
    }

    startTransition(async () => {
      const result = await updateFolderAction(folder.id, {
        name: trimmedName,
        slug: resolvedSlug.value,
        description: description.trim() || null,
        metadata: metadataPayload.length > 0 ? metadataPayload : null,
        isActive,
      });

      if (!Result.isSuccess(result)) {
        const message = result.message.trim();
        const details = result.details?.trim() ?? "";
        const messageLower = message.toLowerCase();
        const detailsLower = details.toLowerCase();

        const isDuplicateDetails =
          details.length > 0 &&
          (detailsLower === messageLower ||
            detailsLower.includes(messageLower) ||
            messageLower.includes(detailsLower));

        const lockHint = "You need to unlock first and then try again.";
        const shouldShowLockHint =
          messageLower.includes("cannot be modified") ||
          detailsLower.includes("cannot be modified");

        const errorMessage = shouldShowLockHint
          ? `${message} ${lockHint}`
          : details && message === "Unexpected error"
            ? details
            : details && !isDuplicateDetails
              ? `${message}\n${details}`
              : message;
        toast.error(errorMessage);
        return;
      }

      toast.success("Folder updated");
      setOpen(false);

      if (redirectToFolderSlugBase && result.value.slug !== folder.slug) {
        router.push(
          `${redirectToFolderSlugBase}/${encodeURIComponent(result.value.slug)}` as Route,
        );
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={`Edit folder ${folder.name}`}
        >
          <FolderPen data-icon="inline-start" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit folder</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2 pr-1">
          <div className="flex flex-col gap-4">
            {isLocked ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <p className="inline-flex items-center gap-2 font-medium text-destructive">
                  <Lock className="size-4" />
                  This folder is locked.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Unlock it from folder details first, then return here to edit.
                </p>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor={`folder-edit-name-${folder.id}`}>Name</Label>
              <Input
                id={`folder-edit-name-${folder.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                disabled={isLocked}
              />
            </div>
            <FolderSlugField
              labelId={`folder-edit-slug-label-${folder.id}`}
              inputId={`folder-edit-slug-${folder.id}`}
              previewId={`folder-edit-slug-view-${folder.id}`}
              slug={slug}
              name={name}
              slugEditable={slugEditable}
              onSlugChange={setSlug}
              onSlugEditableChange={setSlugEditable}
              disabled={isLocked}
              hint="Changing the slug updates the folder URL under /forms/folders/."
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`folder-edit-desc-${folder.id}`}>
                Description
              </Label>
              <Textarea
                id={`folder-edit-desc-${folder.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                disabled={isLocked}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`folder-edit-metadata-${folder.id}`}>
                Metadata (JSON)
              </Label>
              <div id={`folder-edit-metadata-${folder.id}`}>
                <JsonEditor
                  value={metadata}
                  onChange={setMetadata}
                  readOnly={isLocked}
                  height="180px"
                  minLines={6}
                  maxLines={12}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Raw JSON metadata sent with form created webhooks.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Security & permissions
              </p>
              <div className="rounded-lg border border-border/50 bg-muted/40 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-primary" />
                      <Label htmlFor={`folder-edit-active-${folder.id}`}>
                        Active
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Inactive folders are hidden from navigation and listing
                      views.
                    </p>
                  </div>
                  <Switch
                    id={`folder-edit-active-${folder.id}`}
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={isLocked}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={pending || !name.trim() || isLocked}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

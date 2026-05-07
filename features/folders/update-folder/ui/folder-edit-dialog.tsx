"use client";

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
import { toast } from "@/components/ui/toast";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { FolderSlugField } from "@/features/folders/ui/folder-slug-field";
import { resolveFolderSlug } from "@/features/folders/folder-slug-utils";
import { Result } from "@/lib/result";
import { FolderPen, Lock, LockOpen, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateFolderAction } from "@/features/folders/server";
import { JsonEditor } from "@/features/data-lists/ui/json-editor";

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
  const [immutable, setImmutable] = useState(folder.immutable);
  const [locked, setLocked] = useState(folder.locked ?? folder.immutable);
  const [pending, startTransition] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setName(folder.name);
      setSlug(folder.slug);
      setSlugEditable(false);
      setDescription(folder.description ?? "");
      setMetadata(folder.metadata ?? "");
      setIsActive(folder.isActive);
      setImmutable(folder.immutable);
      setLocked(folder.locked ?? folder.immutable);
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
        metadata: metadataPayload.length > 0 ? metadataPayload : "",
        isActive,
        immutable,
        locked,
      });

      if (!Result.isSuccess(result)) {
        toast.error(result.message);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit folder</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`folder-edit-name-${folder.id}`}>Name</Label>
            <Input
              id={`folder-edit-name-${folder.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              disabled={locked}
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
            disabled={locked}
            hint="Changing the slug updates the folder URL under /forms/folders/."
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`folder-edit-desc-${folder.id}`}>Description</Label>
            <Textarea
              id={`folder-edit-desc-${folder.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={locked}
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
                readOnly={locked}
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
                />
              </div>
            </div>
            <div
              className={
                locked
                  ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3"
                  : "rounded-lg border border-border/50 bg-muted/30 p-3"
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {locked ? (
                      <Lock className="size-4 text-destructive" />
                    ) : (
                      <LockOpen className="size-4 text-muted-foreground" />
                    )}
                    <Label
                      htmlFor={`folder-edit-lock-${folder.id}`}
                      className={locked ? "text-destructive" : ""}
                    >
                      {locked ? "Locked" : "Unlocked"}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {locked
                      ? "Prevents edits to folder properties while allowing assignment changes."
                      : "Folder properties can be edited and assignments can still change."}
                  </p>
                </div>
                <Switch
                  id={`folder-edit-lock-${folder.id}`}
                  checked={locked}
                  onCheckedChange={setLocked}
                />
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
            disabled={pending || !name.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

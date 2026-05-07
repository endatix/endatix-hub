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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createFolderAction } from "@/features/folders/server";
import { FolderSlugField } from "@/features/folders/ui/folder-slug-field";
import { resolveFolderSlug } from "@/features/folders/folder-slug-utils";
import { Result } from "@/lib/result";
import { FolderPlus, LockOpen, Shield } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export type CreateFolderDialogProps = {
  triggerLabel?: string;
  showFolderPlusIcon?: boolean;
  showTrigger?: boolean;
  openOnLoad?: boolean;
  replacePathOnClose?: Route;
};

export function CreateFolderDialog({
  triggerLabel = "New folder",
  showFolderPlusIcon = false,
  showTrigger = true,
  openOnLoad = false,
  replacePathOnClose,
}: Readonly<CreateFolderDialogProps>) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnLoad);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditable, setSlugEditable] = useState(false);
  const [description, setDescription] = useState("");
  const [immutable, setImmutable] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOpen(openOnLoad);
  }, [openOnLoad]);

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSlugEditable(false);
    }
    if (!nextOpen && replacePathOnClose) {
      router.replace(replacePathOnClose);
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
      allowEmpty: true,
    });
    if (resolvedSlug.error) {
      toast.error(resolvedSlug.error);
      return;
    }

    startTransition(async () => {
      const result = await createFolderAction({
        name: trimmedName,
        slug: resolvedSlug.value || null,
        description: description.trim() || null,
        immutable: immutable || undefined,
      });
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }
      toast.success("Folder created");
      setOpen(false);
      setName("");
      setSlug("");
      setSlugEditable(false);
      setDescription("");
      setImmutable(false);
      if (replacePathOnClose) {
        router.replace(replacePathOnClose);
      }
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button type="button">
            {showFolderPlusIcon ? (
              <FolderPlus data-icon="inline-start" />
            ) : null}
            {triggerLabel}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create folder</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>
          <FolderSlugField
            labelId="folder-create-slug-label"
            inputId="folder-slug"
            previewId="folder-slug-view"
            slug={slug}
            name={name}
            slugEditable={slugEditable}
            onSlugChange={setSlug}
            onSlugEditableChange={setSlugEditable}
            placeholder="Leave empty to derive from name"
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="folder-description">Description (optional)</Label>
            <Textarea
              id="folder-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
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
                    <Label htmlFor="folder-immutable-create">Immutable</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Protect folder assignments. Items cannot be moved unless
                    this is toggled off.
                  </p>
                </div>
                <Switch
                  id="folder-immutable-create"
                  checked={immutable}
                  onCheckedChange={setImmutable}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <LockOpen className="size-4 text-muted-foreground" />
                    <Label htmlFor="folder-locked-create">Locked</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can lock the folder after creation.
                  </p>
                </div>
                <Switch
                  id="folder-locked-create"
                  checked={false}
                  disabled
                  aria-readonly
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
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

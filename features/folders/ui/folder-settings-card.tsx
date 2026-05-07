"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { Folder } from "@/lib/endatix-api/folders/types";
import {
  urlSlugFromDisplayName,
  isReservedUrlSlug,
  isValidUrlSlugFormat,
  normalizeUrlSlug,
} from "@/lib/url/url-slug";
import { Result } from "@/lib/result";
import type { Form, FormTemplate } from "@/types";
import {
  moveFormToFolderAction,
  moveTemplateToFolderAction,
  updateFolderAction,
} from "@/features/folders/server";
import {
  ClipboardList,
  ChevronDown,
  ExternalLink,
  Folder as FolderIcon,
  LayoutTemplate,
  FolderInput,
  FolderLock,
  FolderMinus,
  FolderPen,
  Link2,
  Lock,
  LockOpen,
  MoreVertical,
  Pencil,
  Shield,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const NO_FOLDER_VALUE = "__none__";

export type FolderSettingsCardProps = {
  folder: Folder;
  forms: Form[];
  templates: FormTemplate[];
  moveTargetFolders: Folder[];
};

export function FolderSettingsCard({
  folder,
  forms,
  templates,
  moveTargetFolders,
}: Readonly<FolderSettingsCardProps>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveKind, setMoveKind] = useState<"form" | "template" | null>(null);
  const [moveResourceId, setMoveResourceId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>(NO_FOLDER_VALUE);

  const [name, setName] = useState(folder.name);
  const [slug, setSlug] = useState(folder.slug);
  const [description, setDescription] = useState(folder.description ?? "");
  const [editActive, setEditActive] = useState(folder.isActive);
  const [editImmutable, setEditImmutable] = useState(folder.immutable);
  const [editLocked, setEditLocked] = useState(
    folder.locked ?? folder.immutable,
  );
  const [slugEditable, setSlugEditable] = useState(false);

  const openEdit = () => {
    setName(folder.name);
    setSlug(folder.slug);
    setDescription(folder.description ?? "");
    setEditActive(folder.isActive);
    setEditImmutable(folder.immutable);
    setEditLocked(folder.locked ?? folder.immutable);
    setSlugEditable(false);
    setEditOpen(true);
  };

  const openMoveForm = (formId: string) => {
    setMoveKind("form");
    setMoveResourceId(formId);
    setMoveTarget(NO_FOLDER_VALUE);
    setMoveOpen(true);
  };

  const openMoveTemplate = (templateId: string) => {
    setMoveKind("template");
    setMoveResourceId(templateId);
    setMoveTarget(NO_FOLDER_VALUE);
    setMoveOpen(true);
  };

  const confirmMove = () => {
    if (!moveKind || !moveResourceId) {
      return;
    }
    const targetId = moveTarget === NO_FOLDER_VALUE ? null : moveTarget;
    startTransition(async () => {
      const result =
        moveKind === "form"
          ? await moveFormToFolderAction(moveResourceId, targetId)
          : await moveTemplateToFolderAction(moveResourceId, targetId);
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }
      toast.success("Moved");
      setMoveOpen(false);
      router.refresh();
    });
  };

  const saveEdit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    const trimmedSlug = slug.trim();
    const slugToSubmit =
      trimmedSlug.length > 0
        ? trimmedSlug
        : urlSlugFromDisplayName(trimmedName);
    if (!isValidUrlSlugFormat(slugToSubmit)) {
      toast.error(
        "Slug must use lowercase letters, numbers, and hyphens only; cannot start or end with a hyphen.",
      );
      return;
    }
    if (isReservedUrlSlug(slugToSubmit)) {
      toast.error("This slug is reserved. Choose another.");
      return;
    }

    startTransition(async () => {
      const result = await updateFolderAction(folder.id, {
        name: trimmedName,
        slug: slugToSubmit,
        description: description.trim() || null,
        isActive: editActive,
        immutable: editImmutable,
        locked: editLocked,
      });
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }
      toast.success("Folder saved");
      setEditOpen(false);
      router.refresh();
    });
  };

  const quickSetActive = (next: boolean) => {
    startTransition(async () => {
      const result = await updateFolderAction(folder.id, { isActive: next });
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }
      toast.success(next ? "Folder activated" : "Folder deactivated");
      router.refresh();
    });
  };

  const quickSetImmutable = (next: boolean) => {
    startTransition(async () => {
      const result = await updateFolderAction(folder.id, { immutable: next });
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }
      toast.success(next ? "Folder locked" : "Folder unlocked");
      router.refresh();
    });
  };

  const moveOptions = moveTargetFolders.filter((f) => f.id !== folder.id);

  return (
    <>
      <Card
        className={
          folder.isActive ? "" : "border-dashed bg-muted/30 opacity-90"
        }
      >
        <CardHeader>
          <div className="flex min-w-0 items-start gap-3">
            {folder.immutable ? (
              <FolderLock className="mt-0.5 shrink-0 text-muted-foreground" />
            ) : (
              <FolderIcon className="mt-0.5 shrink-0 text-muted-foreground" />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle className="truncate text-base">
                {folder.name}
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {folder.slug}
              </CardDescription>
              {folder.description ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {folder.description}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {!folder.isActive ? (
                  <Badge variant="secondary">Inactive</Badge>
                ) : null}
                {folder.immutable ? (
                  <Badge variant="outline">Locked</Badge>
                ) : null}
              </div>
            </div>
          </div>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label={`Folder actions for ${folder.name}`}
                  disabled={pending}
                >
                  <MoreVertical data-icon="inline-start" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={openEdit}>
                    <FolderPen />
                    Edit folder
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild disabled={!folder.isActive}>
                    <Link
                      href={
                        `/forms/folders/${encodeURIComponent(folder.slug)}` as Route
                      }
                      className="flex items-center gap-2"
                    >
                      <ExternalLink />
                      Open in Hub
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {folder.isActive ? (
                    <DropdownMenuItem
                      onClick={() => {
                        quickSetActive(false);
                      }}
                    >
                      <FolderMinus />
                      Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        quickSetActive(true);
                      }}
                    >
                      <FolderIcon />
                      Activate
                    </DropdownMenuItem>
                  )}
                  {folder.immutable ? (
                    <DropdownMenuItem
                      onClick={() => {
                        quickSetImmutable(false);
                      }}
                    >
                      <FolderLock />
                      Unlock folder
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        quickSetImmutable(true);
                      }}
                    >
                      <FolderLock />
                      Lock folder
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex w-full justify-between px-0 hover:bg-transparent"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  Contents ({forms.length + templates.length})
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ClipboardList className="size-3.5" />
                  Forms
                </p>
                {forms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No forms</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {forms.map((f) => (
                      <li key={f.id}>
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                          <Link
                            href={`/forms/${f.id}` as Route}
                            className="min-w-0 truncate text-sm font-medium hover:underline"
                          >
                            {f.name}
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${f.name}`}
                              >
                                <MoreVertical data-icon="inline-start" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  openMoveForm(f.id);
                                }}
                              >
                                <FolderInput />
                                Move to folder…
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <LayoutTemplate className="size-3.5" />
                  Templates
                </p>
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No templates</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {templates.map((t) => (
                      <li key={t.id}>
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                          <Link
                            href={`/forms/templates/${t.id}` as Route}
                            className="min-w-0 truncate text-sm font-medium hover:underline"
                          >
                            {t.name}
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${t.name}`}
                              >
                                <MoreVertical data-icon="inline-start" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  openMoveTemplate(t.id);
                                }}
                              >
                                <FolderInput />
                                Move to folder…
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit folder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`settings-folder-name-${folder.id}`}>Name</Label>
              <Input
                id={`settings-folder-name-${folder.id}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                autoComplete="off"
                disabled={editLocked}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`settings-folder-slug-view-${folder.id}`}>
                URL slug
              </Label>
              <div className="flex items-center gap-2">
                {slugEditable ? (
                  <Input
                    id={`settings-folder-slug-${folder.id}`}
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                    }}
                    autoComplete="off"
                    className="font-mono"
                    disabled={editLocked}
                  />
                ) : (
                  <div
                    id={`settings-folder-slug-view-${folder.id}`}
                    className="flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 text-sm"
                  >
                    <Link2 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-xs sm:text-sm">
                      {slug.trim()
                        ? normalizeUrlSlug(slug.trim())
                        : urlSlugFromDisplayName(name.trim()) ||
                          "(derived from name)"}
                    </span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSlugEditable((prev) => !prev)}
                  aria-label={slugEditable ? "Hide slug editor" : "Edit slug"}
                  disabled={editLocked}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`settings-folder-desc-${folder.id}`}>
                Description
              </Label>
              <Textarea
                id={`settings-folder-desc-${folder.id}`}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
                rows={3}
                disabled={editLocked}
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
                      <Label htmlFor={`settings-folder-active-${folder.id}`}>
                        Active
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Inactive folders are hidden from normal navigation.
                    </p>
                  </div>
                  <Switch
                    id={`settings-folder-active-${folder.id}`}
                    checked={editActive}
                    onCheckedChange={setEditActive}
                  />
                </div>
              </div>
              <div
                className={
                  editLocked
                    ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3"
                    : "rounded-lg border border-border/50 bg-muted/30 p-3"
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {editLocked ? (
                        <Lock className="size-4 text-destructive" />
                      ) : (
                        <LockOpen className="size-4 text-muted-foreground" />
                      )}
                      <Label
                        htmlFor={`settings-folder-lock-${folder.id}`}
                        className={editLocked ? "text-destructive" : ""}
                      >
                        {editLocked ? "Locked" : "Unlocked"}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {editLocked
                        ? "Prevents editing name, slug, and description."
                        : "Allows editing name, slug, and description."}
                    </p>
                  </div>
                  <Switch
                    id={`settings-folder-lock-${folder.id}`}
                    checked={editLocked}
                    onCheckedChange={setEditLocked}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveEdit}
              disabled={pending || !name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moveKind === "form" ? "Move form" : "Move template"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="move-target-folder">Destination folder</Label>
            <Select
              value={moveTarget}
              onValueChange={(v) => {
                setMoveTarget(v);
              }}
            >
              <SelectTrigger id="move-target-folder" className="w-full">
                <SelectValue placeholder="Choose folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NO_FOLDER_VALUE}>No folder</SelectItem>
                  {moveOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMoveOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmMove} disabled={pending}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

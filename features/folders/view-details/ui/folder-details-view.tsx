"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "@/components/ui/toast";
import { moveFormToFolderAction } from "@/features/folders/move-form-to-folder";
import { moveTemplateToFolderAction } from "@/features/folders/move-template-to-folder";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { Result } from "@/lib/result";
import { getFormattedDate } from "@/lib/utils";
import type { Form, FormTemplate } from "@/types";
import {
  ClipboardList,
  Folder as FolderIcon,
  FolderLock,
  LayoutTemplate,
  MoreVertical,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type FolderDetailsViewProps = {
  folder: Folder;
  forms: Form[];
  templates: FormTemplate[];
  moveTargetFolders: Folder[];
};

type ContainedItem = {
  id: string;
  resourceId: string;
  name: string;
  href: Route;
  type: "form" | "template";
  updatedAt?: Date;
};

export function FolderDetailsView({
  folder,
  forms,
  templates,
  moveTargetFolders,
}: Readonly<FolderDetailsViewProps>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveItemType, setMoveItemType] = useState<"form" | "template" | null>(
    null,
  );
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("");

  const items: ContainedItem[] = [
    ...forms.map((form) => ({
      id: `form-${form.id}`,
      resourceId: form.id,
      name: form.name,
      href: `/forms/${form.id}` as Route,
      type: "form" as const,
      updatedAt: form.modifiedAt ?? form.createdAt,
    })),
    ...templates.map((template) => ({
      id: `template-${template.id}`,
      resourceId: template.id,
      name: template.name,
      href: `/forms/templates/${template.id}` as Route,
      type: "template" as const,
      updatedAt: template.modifiedAt ?? template.createdAt,
    })),
  ];

  const openMoveDialog = (itemType: "form" | "template", itemId: string) => {
    setMoveItemType(itemType);
    setMoveItemId(itemId);
    setMoveTargetFolderId("");
    setMoveDialogOpen(true);
  };

  const onConfirmMove = () => {
    if (!moveItemType || !moveItemId || !moveTargetFolderId) {
      return;
    }

    startTransition(async () => {
      const result =
        moveItemType === "form"
          ? await moveFormToFolderAction(moveItemId, moveTargetFolderId)
          : await moveTemplateToFolderAction(moveItemId, moveTargetFolderId);

      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      toast.success("Item moved");
      setMoveDialogOpen(false);
      router.refresh();
    });
  };

  const moveOptions = moveTargetFolders.filter(
    (candidateFolder) =>
      candidateFolder.id !== folder.id && candidateFolder.isActive,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          {folder.immutable ? (
            <FolderLock className="size-4 text-destructive" />
          ) : folder.isActive ? (
            <FolderIcon className="size-4 text-primary" />
          ) : (
            <FolderIcon className="size-4 text-muted-foreground" />
          )}
          Folder details
        </div>
        <CardTitle className="text-5xl tracking-tight">{folder.name}</CardTitle>
      </div>

      <div className="grid items-start gap-8 md:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {folder.isActive
                  ? "Currently active across all regions."
                  : "Currently inactive and hidden from browsing routes."}
              </p>
              <Switch checked={folder.isActive} disabled />
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{folder.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slug</p>
                <Badge variant="secondary" className="mt-1">
                  /{folder.slug}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">
                  {folder.description?.trim() || "No description provided."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold">Contained Items</h3>
            <Badge variant="secondary">{items.length} items</Badge>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <div className="grid grid-cols-[minmax(0,1fr)_120px] items-center px-4 py-1 text-xs text-muted-foreground md:grid-cols-[minmax(0,1fr)_120px_220px_120px]">
              <span>Item</span>
              <span className="hidden md:block">Type</span>
              <span className="hidden md:block">Updated</span>
              <span className="text-right">Actions</span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-md border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                No items in this folder yet.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 rounded-md border bg-card px-4 py-3 transition-colors hover:bg-muted/20 md:grid-cols-[minmax(0,1fr)_120px_220px_120px]"
                >
                  <div className="min-w-0">
                    <Link
                      href={item.href}
                      className="block truncate font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground md:hidden">
                      {item.type === "form" ? (
                        <>
                          <ClipboardList className="size-3.5" />
                          Form
                        </>
                      ) : (
                        <>
                          <LayoutTemplate className="size-3.5" />
                          Template
                        </>
                      )}
                      {item.updatedAt
                        ? ` · ${getFormattedDate(item.updatedAt)}`
                        : ""}
                    </div>
                  </div>

                  <div className="hidden items-center gap-1.5 text-sm text-muted-foreground md:inline-flex">
                    {item.type === "form" ? (
                      <>
                        <ClipboardList className="size-3.5" />
                        Form
                      </>
                    ) : (
                      <>
                        <LayoutTemplate className="size-3.5" />
                        Template
                      </>
                    )}
                  </div>

                  <div className="hidden truncate text-sm text-muted-foreground md:block">
                    {item.updatedAt ? getFormattedDate(item.updatedAt) : "-"}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={item.href}>View</Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${item.name}`}
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={folder.immutable}
                          onClick={() =>
                            openMoveDialog(item.type, item.resourceId)
                          }
                        >
                          Move to folder
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={item.href}>View details</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="folder-move-target">Destination folder</Label>
            <Select
              value={moveTargetFolderId}
              onValueChange={setMoveTargetFolderId}
            >
              <SelectTrigger id="folder-move-target" className="w-full">
                <SelectValue placeholder="Select destination folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {moveOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
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
              onClick={() => setMoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirmMove}
              disabled={pending || !moveTargetFolderId}
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Folder } from "@/lib/endatix-api/folders/types";
import {
  ClipboardList,
  Folder as FolderIcon,
  FolderLock,
  Hash,
  LayoutTemplate,
  Lock,
  LockOpen,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { FolderDeleteButton } from "../../ui/folder-delete-button";
import { FolderEditButton } from "../../ui/folder-edit-button";

type FolderManagementListCardProps = {
  folder: Folder;
  formCount: number;
  templateCount: number;
  canManage: boolean;
};

export function FolderManagementListCard({
  folder,
  formCount,
  templateCount,
  canManage,
}: Readonly<FolderManagementListCardProps>) {
  const statusLabel = folder.isActive ? "Active" : "Inactive";

  return (
    <TooltipProvider delayDuration={100}>
      <Card
        className={
          folder.isActive
            ? "group relative overflow-hidden border-border/50 shadow-sm transition-shadow hover:shadow-md"
            : "group relative overflow-hidden border-dashed border-border/70 bg-muted/20"
        }
      >
        <CardHeader className="gap-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {folder.immutable ? (
                <FolderLock className="size-5 shrink-0 text-destructive" />
              ) : folder.isActive ? (
                <FolderIcon className="size-5 shrink-0 text-primary" />
              ) : (
                <FolderIcon className="size-5 shrink-0 text-muted-foreground" />
              )}
              <Badge
                variant="secondary"
                className={
                  folder.isActive
                    ? "border-primary/20 bg-primary/10 text-primary uppercase"
                    : "border-border bg-muted text-muted-foreground uppercase"
                }
              >
                {statusLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {canManage ? (
                <>
                  <FolderEditButton
                    folder={folder}
                    redirectToFolderSlugBase={null}
                  />
                  <FolderDeleteButton
                    folderId={folder.id}
                    folderName={folder.name}
                    immutable={folder.immutable}
                    skipNavigation
                    variant="outline"
                  />
                </>
              ) : (
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground"
                  aria-label={`Folder actions for ${folder.name}`}
                >
                  <MoreHorizontal className="size-4" />
                </button>
              )}
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-[1.25rem]">
              {folder.name}
            </CardTitle>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              <Hash className="size-3.5" />/{folder.slug}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <Link
              href={`/folders/${folder.id}` as Route}
              className="text-sm font-medium text-primary hover:underline"
            >
              View details
            </Link>
          </div>
          <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5">
                    <ClipboardList className="size-4" />
                    <span className="font-semibold">{formCount}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Forms in folder</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5">
                    <LayoutTemplate className="size-4" />
                    <span className="font-semibold">{templateCount}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Templates in folder</TooltipContent>
              </Tooltip>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                {folder.immutable ? (
                  <Lock className="size-4 text-destructive" />
                ) : (
                  <LockOpen className="size-4 text-muted-foreground" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {folder.immutable ? "Locked folder" : "Unlocked folder"}
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Folder } from "@/lib/endatix-api/folders/types";
import {
  Folder as FolderIcon,
  FolderLock,
  MoreVertical,
  Pencil,
  Search,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

type FolderNavigationCardsProps = {
  folders: Folder[];
  targetBasePath: "/forms/folders" | "/forms/templates/folders";
  canManage?: boolean;
};

export function FolderNavigationCards({
  folders,
  targetBasePath,
  canManage = false,
}: Readonly<FolderNavigationCardsProps>) {
  const router = useRouter();

  return (
    <div className="grid-card-list">
      {folders.map((folder) => (
        <Card
          key={folder.id}
          className={
            folder.isActive
              ? "cursor-pointer py-3 transition-colors hover:bg-muted/50"
              : "border-dashed bg-muted/30 py-3 opacity-80 transition-colors hover:bg-muted/50"
          }
          onClick={() =>
            router.push(
              `${targetBasePath}/${encodeURIComponent(folder.slug)}` as Route,
            )
          }
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(
                `${targetBasePath}/${encodeURIComponent(folder.slug)}` as Route,
              );
            }
          }}
        >
          <CardContent className="flex items-center justify-between gap-2 px-4 py-0">
            <div className="flex min-w-0 items-center gap-3">
              {folder.immutable ? (
                <FolderLock className="shrink-0 text-muted-foreground" />
              ) : (
                <FolderIcon className="shrink-0 text-muted-foreground" />
              )}
              <span className="truncate font-medium" title={folder.name}>
                {folder.name}
              </span>
            </div>
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Folder actions for ${folder.name}`}
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push("/folders" as Route);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

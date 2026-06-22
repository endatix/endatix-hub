"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormFolderChip, type FormFolderChipProps } from "./form-folder-chip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type FormFolderLinkProps = FormFolderChipProps & {
  folderSlug?: string;
};

export function FormFolderLink({
  folderSlug,
  unassigned,
  className,
  ...chipProps
}: Readonly<FormFolderLinkProps>) {
  if (unassigned || !folderSlug?.trim()) {
    return (
      <FormFolderChip
        {...chipProps}
        unassigned={unassigned}
        className={cn("mb-0", className)}
      />
    );
  }

  const href =
    `/forms/folders/${encodeURIComponent(folderSlug.trim())}` as Route;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full min-w-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <FormFolderChip
              {...chipProps}
              className={cn(
                "mb-0 max-w-full cursor-pointer transition-colors hover:bg-accent",
                className,
              )}
              trailing={
                <ArrowUpRight
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              }
            />
            <span className="sr-only">Open folder in new tab</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top">Open folder in new tab</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

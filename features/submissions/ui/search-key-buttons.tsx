"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw, X } from "lucide-react";
import type {
  SearchKeyChanges,
  SearchKeyTarget,
} from "./use-search-key-changes.hook";

type SearchKeyButtonProps = {
  target: SearchKeyTarget;
  changes: SearchKeyChanges;
  className?: string;
};

export function AddSearchKeyButton({
  target,
  changes,
}: Readonly<SearchKeyButtonProps>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 shrink-0 px-1.5 text-xs"
      disabled={changes.isPending}
      onClick={() => changes.change("add", target)}
    >
      Make filterable
    </Button>
  );
}

export function RemoveSearchKeyButton({
  target,
  changes,
  className,
}: Readonly<SearchKeyButtonProps>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-6 shrink-0", className)}
      aria-label={`Remove ${target.title} from filterable columns`}
      title="Remove from filterable columns"
      disabled={changes.isPending}
      onClick={() => changes.change("remove", target)}
    >
      <X className="size-3.5" />
    </Button>
  );
}

export function RefreshSearchKeysButton({
  changes,
  className,
}: Readonly<Omit<SearchKeyButtonProps, "target">>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      disabled={changes.isPending}
      onClick={changes.refresh}
    >
      <RefreshCw className="size-3.5" />
      Refresh
    </Button>
  );
}

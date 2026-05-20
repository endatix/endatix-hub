"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useNearViewport } from "./use-near-viewport";

export type LazyStorageMediaProps = {
  children: ReactNode;
  className?: string;
  /** Skip viewport gating (e.g. modal or single-file page). */
  disabled?: boolean;
  placeholderClassName?: string;
};

/**
 * Defers mounting heavy storage-backed media until the block is near the viewport.
 */
export function LazyStorageMedia({
  children,
  className,
  disabled = false,
  placeholderClassName,
}: Readonly<LazyStorageMediaProps>) {
  const { ref, isNearViewport } = useNearViewport({ disabled });

  return (
    <div ref={ref} className={className}>
      {disabled || isNearViewport ? (
        children
      ) : (
        <div
          className={cn(
            "min-h-[120px] animate-pulse rounded-md bg-muted",
            placeholderClassName,
          )}
          aria-hidden
        />
      )}
    </div>
  );
}

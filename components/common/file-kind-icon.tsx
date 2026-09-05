"use client";

import type { ReactNode } from "react";
import { File } from "lucide-react";
import { getFileKindIcon } from "@/lib/file-kinds/file-kind-icons";
import type { FileKindKey } from "@/lib/file-kinds";
import { cn } from "@/lib/utils";

interface FileKindIconProps {
  /**
   * Physical file kind this option delivers. `undefined` renders the generic
   * file glyph — a format Hub does not recognise must not borrow another
   * kind's icon, which would tell the reader they are downloading a CSV.
   */
  kind?: FileKindKey;
  className?: string;
}

/**
 * Marks the file type an export option delivers. Muted and icon-only: this is
 * a type marker, not a status — see the Status & State Vocabulary in DESIGN.md.
 */
export function FileKindIcon({ kind, className }: Readonly<FileKindIconProps>) {
  const Icon = kind ? getFileKindIcon(kind) : File;

  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  );
}

interface FileKindLabelProps extends FileKindIconProps {
  children: ReactNode;
}

/**
 * Icon + label row used by every export format picker and list cell, so the
 * same format reads identically in a Select, a table cell and a menu item.
 */
export function FileKindLabel({
  kind,
  className,
  children,
}: Readonly<FileKindLabelProps>) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <FileKindIcon kind={kind} />
      {children}
    </span>
  );
}

"use client";

import type { ReactNode } from "react";
import { File } from "lucide-react";
import { getFileKindIcon } from "@/lib/file-kinds/file-kind-icons";
import type { FileKindKey } from "@/lib/file-kinds";
import { cn } from "@/lib/utils";

interface FileKindIconProps {
  /** Omit for an unknown kind — generic file glyph, never a guessed type. */
  kind?: FileKindKey;
  className?: string;
}

/** Muted file-type mark. Not a status — see DESIGN.md File Type Marks. */
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

/** Icon + label row for export pickers, menus, and table cells. */
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

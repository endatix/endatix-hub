import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Folder as FolderIcon, FolderLock, FolderMinus } from "lucide-react";
import type { ReactNode } from "react";

export type FormFolderChipProps = {
  label: string;
  immutable?: boolean;
  isActive?: boolean;
  unassigned?: boolean;
  trailing?: ReactNode;
  className?: string;
};

export function FormFolderChip({
  label,
  immutable = false,
  isActive = true,
  unassigned = false,
  trailing,
  className,
}: Readonly<FormFolderChipProps>) {
  let Icon;
  if (unassigned) {
    Icon = FolderMinus;
  } else if (immutable) {
    Icon = FolderLock;
  } else {
    Icon = FolderIcon;
  }

  let iconClassName: string;
  if (unassigned) {
    iconClassName = "text-muted-foreground";
  } else if (immutable) {
    iconClassName = "text-destructive";
  } else if (isActive) {
    iconClassName = "text-primary";
  } else {
    iconClassName = "text-muted-foreground";
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "mb-2 w-fit max-w-full gap-1.5 pr-2 pl-1.5 text-xs font-normal",
        trailing && "pr-1.5",
        className,
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", iconClassName)} aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
      {trailing}
    </Badge>
  );
}

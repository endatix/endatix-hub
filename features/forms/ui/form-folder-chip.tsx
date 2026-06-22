import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Folder as FolderIcon, FolderLock, FolderMinus } from "lucide-react";

export type FormFolderChipProps = {
  label: string;
  immutable?: boolean;
  isActive?: boolean;
  unassigned?: boolean;
};

export function FormFolderChip({
  label,
  immutable = false,
  isActive = true,
  unassigned = false,
}: Readonly<FormFolderChipProps>) {
  const Icon = unassigned ? FolderMinus : immutable ? FolderLock : FolderIcon;
  const iconClassName = unassigned
    ? "text-muted-foreground"
    : immutable
      ? "text-destructive"
      : isActive
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <Badge
      variant="outline"
      className="mb-2 w-fit gap-1.5 pr-2 pl-1.5 text-xs font-normal"
    >
      <Icon className={cn("size-3.5 shrink-0", iconClassName)} aria-hidden />
      {label}
    </Badge>
  );
}

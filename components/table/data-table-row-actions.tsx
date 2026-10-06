import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DataTableRowAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

/** The icon actions at the end of a list row, each named for screen readers. */
export function DataTableRowActions({
  actions,
}: Readonly<{ actions: DataTableRowAction[] }>) {
  return (
    <div className="flex items-center justify-end gap-1">
      {actions.map(({ label, icon: Icon, onClick }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}

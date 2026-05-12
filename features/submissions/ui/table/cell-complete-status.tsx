import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const getStatusLabel = (isComplete: boolean) => (isComplete ? "Yes" : "No");

interface CellCompleteStatusProps {
  isComplete: boolean;
}

export function CellCompleteStatus({ isComplete }: CellCompleteStatusProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        isComplete
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
      )}
    >
      {getStatusLabel(isComplete)}
    </Badge>
  );
}

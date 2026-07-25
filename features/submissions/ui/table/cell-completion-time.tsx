import { getElapsedTimeString } from "@/lib/utils";

interface CellCompletionTimeProps {
  startedAt: Date;
  completedAt?: Date;
}

export function CellCompletionTime({
  startedAt,
  completedAt,
}: CellCompletionTimeProps) {
  return (
    <div className="whitespace-nowrap">
      {getElapsedTimeString(startedAt, completedAt, "compact")}
    </div>
  );
}

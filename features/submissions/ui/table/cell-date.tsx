import { parseDate } from "@/lib/utils";
import { useMemo } from "react";

interface CellDateProps {
  date?: Date;
  visible?: boolean;
}

//TODO: Add a date formatting options
export function CellDate({ date, visible = true }: CellDateProps) {
  const parsedDate = useMemo(() => {
    if (!date) {
      return null;
    }

    return parseDate(date);
  }, [date]);

  if (!parsedDate) {
    return visible ? (
      <span className="font-normal text-muted-foreground">-</span>
    ) : null;
  }

  return visible ? (
    <span className="font-normal">{parsedDate.toLocaleString("en-US")}</span>
  ) : null;
}

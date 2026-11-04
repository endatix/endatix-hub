import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldWithHelpProps = {
  id: string;
  /** Usually text; a literal from a file (a column name) may come monospace. */
  label: ReactNode;
  /** One visible line under the control; wire the control with `aria-describedby={helpId(id)}`. */
  help: ReactNode;
  invalid?: boolean;
  children: ReactNode;
};

export const helpId = (id: string) => `${id}-help`;

/** Label, control, and the one help line under it (DESIGN.md §6 Displaying values). */
export function FieldWithHelp(props: Readonly<FieldWithHelpProps>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.children}
      <p
        id={helpId(props.id)}
        aria-live="polite"
        className={cn(
          "text-xs",
          props.invalid ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {props.help}
      </p>
    </div>
  );
}

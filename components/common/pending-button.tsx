import type { ComponentProps } from "react";
import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";

type PendingButtonProps = ComponentProps<typeof Button> & {
  pending: boolean;
  label: string;
  /** The running verb, e.g. "Adding…" (DESIGN.md §5 Buttons). */
  pendingLabel: string;
};

export function PendingButton({
  pending,
  label,
  pendingLabel,
  disabled,
  ...props
}: Readonly<PendingButtonProps>) {
  return (
    <Button disabled={pending || disabled} {...props}>
      {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}

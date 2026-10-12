"use client";

import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PendingButton } from "@/components/common/pending-button";

export type PanelFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  desktopType: "simple" | "complex";
  trigger?: ReactNode;
  pending: boolean;
  title: ReactNode;
  description: ReactNode;
  error: string | null;
  errorTitle: string;
  submitLabel: string;
  pendingLabel: string;
  submitDisabled?: boolean;
  /** A later step of a multi-step form: `Back` replaces `Cancel`. */
  onBack?: () => void;
  /** `false` on an outcome step, whose submit (`Done`) is the only way out. */
  cancelable?: boolean;
  onSubmit: () => void;
  children: ReactNode;
};

/** A failed save, at the top of the body; the form below keeps its values (DESIGN.md §6). */
export function PanelFormError({
  title,
  message,
}: Readonly<{ title: string; message: string | null }>) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/** `Back` on a later step, `Cancel` otherwise, nothing on an outcome step (DESIGN.md §6). */
function SecondaryButton(props: Readonly<PanelFormProps>) {
  const { onBack, cancelable = true, pending } = props;
  if (!onBack && !cancelable) return null;
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={onBack ?? (() => props.onOpenChange(false))}
    >
      {onBack ? "Back" : "Cancel"}
    </Button>
  );
}

function PanelFormFooter(props: Readonly<PanelFormProps>) {
  const { pending, submitLabel: label, pendingLabel, submitDisabled } = props;
  return (
    <ResponsivePanelFooter>
      <SecondaryButton {...props} />
      <PendingButton
        type="submit"
        disabled={submitDisabled}
        {...{ pending, label, pendingLabel }}
      />
    </ResponsivePanelFooter>
  );
}

/**
 * Create/edit overlay as one form (DESIGN.md §6): header, failure strip, caller's `PanelSection`s,
 * Cancel (or Back) + submit. A wizard passes its current step's labels and handlers.
 * `display: contents` keeps Header/Body/Footer on the panel chrome flex stack.
 */
export function PanelForm(props: Readonly<PanelFormProps>) {
  const { open, onOpenChange, desktopType, trigger, pending, onSubmit } = props;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <ResponsivePanel
      {...{ open, onOpenChange, desktopType, trigger }}
      dismissible={!pending}
    >
      <form className="contents" onSubmit={submit}>
        <ResponsivePanelHeader>
          <ResponsivePanelTitle className="break-words">
            {props.title}
          </ResponsivePanelTitle>
          <ResponsivePanelDescription>
            {props.description}
          </ResponsivePanelDescription>
        </ResponsivePanelHeader>
        <ResponsivePanelBody>
          <PanelFormError title={props.errorTitle} message={props.error} />
          {props.children}
        </ResponsivePanelBody>
        <PanelFormFooter {...props} />
      </form>
    </ResponsivePanel>
  );
}

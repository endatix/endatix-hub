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

function CancelButton({
  pending,
  onCancel,
}: Readonly<{ pending: boolean; onCancel: () => void }>) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={onCancel}
    >
      Cancel
    </Button>
  );
}

function PanelFormFooter(props: Readonly<PanelFormProps>) {
  const { pending, submitLabel: label, pendingLabel, submitDisabled } = props;
  return (
    <ResponsivePanelFooter>
      <CancelButton
        pending={pending}
        onCancel={() => props.onOpenChange(false)}
      />
      <PendingButton
        type="submit"
        disabled={submitDisabled}
        {...{ pending, label, pendingLabel }}
      />
    </ResponsivePanelFooter>
  );
}

function PanelFormContent(props: Readonly<PanelFormProps>) {
  return (
    <>
      <ResponsivePanelHeader>
        <ResponsivePanelTitle className="break-words">
          {props.title}
        </ResponsivePanelTitle>
        <ResponsivePanelDescription>
          {props.description}
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>
      <ResponsivePanelBody className="grid content-start gap-5">
        <PanelFormError title={props.errorTitle} message={props.error} />
        {props.children}
      </ResponsivePanelBody>
      <PanelFormFooter {...props} />
    </>
  );
}

/**
 * A create/edit overlay as one form: header, an error strip that keeps the values, the caller's
 * sections, and Cancel + a submit that names its running verb. Locked while it saves.
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
      <form className="flex h-full min-h-0 flex-col" onSubmit={submit}>
        <PanelFormContent {...props} />
      </form>
    </ResponsivePanel>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ImportWizard } from "../use-import-csv.hook";

type DiscardProps = { onDiscard: () => void; onKeep: () => void };

function DiscardActions({ onDiscard, onKeep }: Readonly<DiscardProps>) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="destructive" onClick={onDiscard}>
        Discard and start over
      </Button>
      <Button type="button" variant="outline" onClick={onKeep}>
        Keep it
      </Button>
    </div>
  );
}

/** Starting over asks first: the API discards the stopped import when the new one starts. */
function DiscardConfirm(props: Readonly<DiscardProps>) {
  return (
    <Alert variant="warning">
      <TriangleAlert />
      <AlertTitle>Start a new import?</AlertTitle>
      <AlertDescription className="grid gap-3">
        <p>
          The stopped import is discarded. Participants it already wrote stay on
          this form; its other rows are not written.
        </p>
        <DiscardActions {...props} />
      </AlertDescription>
    </Alert>
  );
}

function StartNewButton({
  wizard,
  onClick,
}: Readonly<{ wizard: ImportWizard; onClick: () => void }>) {
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        disabled={wizard.pending}
        onClick={onClick}
      >
        Start a new import
      </Button>
    </div>
  );
}

type StoppedImportProps = { wizard: ImportWizard; children: ReactNode };

/** A stopped write (`children` says why): Resume continues it, or a new import replaces it. */
export function StoppedImport({
  wizard,
  children,
}: Readonly<StoppedImportProps>) {
  const [discarding, setDiscarding] = useState(false);
  const keep = () => setDiscarding(false);
  if (discarding)
    return <DiscardConfirm onDiscard={wizard.startNew} onKeep={keep} />;
  return (
    <>
      {children}
      <StartNewButton wizard={wizard} onClick={() => setDiscarding(true)} />
    </>
  );
}

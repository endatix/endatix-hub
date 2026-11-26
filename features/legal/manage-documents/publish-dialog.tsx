"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LegalMarkdown } from "../legal-markdown";
import { titles, type Change, type DocumentState } from "./documents";
import type { Editor } from "./use-document-editor";
import { DocumentFailure } from "./document-failure";

interface Props {
  document: DocumentState;
  editor: Editor;
}
export function PublishDialog({ document, editor }: Readonly<Props>) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !editor.pending) editor.close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish {titles[document.kind]}</DialogTitle>
          <DialogDescription>Review the saved draft. A published version cannot be edited.</DialogDescription>
        </DialogHeader>
        <LegalMarkdown text={document.draftMarkdown ?? ""} />
        <DocumentFailure editor={editor} />
        <PublishDecision editor={editor} kind={document.kind} />
      </DialogContent>
    </Dialog>
  );
}

const changeDescriptions = {
  terms: {
    material: "A substantive update. For required Terms, people must accept again.",
    minor: "A clarification. When Terms are required, people who accepted the latest material Terms receive a notice.",
  },
  privacy: {
    material: "A substantive update to the notice. It does not require acceptance.",
    minor: "A clarification to the notice. It does not require acceptance.",
  },
};

function PublishDecision({ editor, kind }: Readonly<{ editor: Editor; kind: DocumentState["kind"] }>) {
  const [change, setChange] = useState<Change>();
  return <>
    <fieldset disabled={editor.pending} className="space-y-2">
      <legend>Type of change</legend>
      <Choice value="material" select={setChange}>{changeDescriptions[kind].material}</Choice>
      <Choice value="minor" select={setChange}>{changeDescriptions[kind].minor}</Choice>
    </fieldset>
    <DialogFooter>
      <Button variant="outline" disabled={editor.pending} onClick={editor.close}>Cancel</Button>
      <Button disabled={!change || editor.locked} onClick={() => change && editor.publish(change)}>
        Publish version
      </Button>
    </DialogFooter>
  </>;
}

interface ChoiceProps {
  value: Change;
  select: (value: Change) => void;
  children: React.ReactNode;
}
function Choice({ value, select, children }: Readonly<ChoiceProps>) {
  const label = value === "material" ? "Material" : "Minor";
  return (
    <div>
      <label className="flex items-center gap-2">
        <input type="radio" name="change" value={value} onChange={() => select(value)} />
        {label}
      </label>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

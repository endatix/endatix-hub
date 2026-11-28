"use client";

import { createContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { canonicalSurvey } from "@endatix/survey-journal/hash";
import { useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";

export const LegacySubmission = createContext<(json: string | null) => void>(() => {});
type Document = object | null;
interface Snapshot { source: Document; canvas: Document; revision: number; conflict: boolean }

function acceptRefresh(prior: Snapshot, source: Document, {dirty, submitted}: {dirty: boolean; submitted: string | null}): Snapshot {
  const fresh = canonicalSurvey(JSON.stringify(source));
  if (fresh === canonicalSurvey(JSON.stringify(prior.source)) || (submitted && fresh === canonicalSurvey(submitted))) {
    return { ...prior, source };
  }
  if (dirty) return { ...prior, source, conflict: true };
  return { source, canvas: source, revision: prior.revision + 1, conflict: false };
}

function LegacyRefreshDialog({ load, keep }: { load(): void; keep(): void }) {
  return <Dialog open>
    <DialogContent showCloseButton={false}>
      <DialogTitle>This form changed elsewhere</DialogTitle>
      <DialogDescription>Keep your edits on screen, or replace them with the saved form. If you keep yours, your next manual save replaces the saved version.</DialogDescription>
      <DialogFooter>
        <Button variant="outline" onClick={load}>Load saved form</Button>
        <Button onClick={keep}>Keep editing my copy</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function LegacyEditorSource({ source, frozen, children }: { source: Document; frozen: boolean; children(json: Document): ReactNode }) {
  const designer = useSurveyDesigner();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [view, setView] = useState<Snapshot>(() => ({ source, canvas: source, revision: 0, conflict: false }));
  if (!frozen && view.source !== source) {
    setView(acceptRefresh(view, source, {dirty: designer.hasUnsavedChanges || designer.isJsonModified, submitted}));
    setSubmitted(null);
  }
  function load() {
    designer.setHasUnsavedChanges(false);
    designer.setIsJsonModified(false);
    setView({ ...view, canvas: view.source, revision: view.revision + 1, conflict: false });
  }
  return <LegacySubmission.Provider value={setSubmitted}>
    <div className="contents" key={view.revision}>{children(view.canvas)}</div>
    {view.conflict && <LegacyRefreshDialog load={load} keep={() => setView({ ...view, conflict: false })} />}
  </LegacySubmission.Provider>;
}

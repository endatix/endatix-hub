"use client";

import { createContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { canonicalSurvey } from "@endatix/survey-journal/hash";
import { useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";

type Submission = { document: string };
// Each save owns its cancellation, including when two requests have identical documents.
export const LegacySubmission = createContext<(json: string) => () => void>(() => () => {});
type Document = object | null;
interface Snapshot { source: Document; canvas: Document; revision: number; conflict: boolean }

function acceptPeer(prior: Snapshot, source: Document, dirty: boolean): Snapshot {
  if (dirty) return { ...prior, source, conflict: true };
  return { source, canvas: source, revision: prior.revision + 1, conflict: false };
}

function useSubmissions(source: Document) {
  const [pending, setPending] = useState<Submission[]>([]);
  function retire(ticket: Submission) {
    setPending(prior => prior.filter(entry => entry !== ticket));
  }
  function submit(json: string) {
    const ticket = { document: canonicalSurvey(json) };
    // A theme-only manual save can return the same active document and no changed-source refresh.
    if (!pending.length && ticket.document === canonicalSurvey(JSON.stringify(source))) return () => {};
    setPending(prior => [...prior, ticket]);
    return () => retire(ticket);
  }
  function acknowledge(fresh: string) {
    const ticket = pending.find(entry => entry.document === fresh);
    if (ticket) retire(ticket);
    return Boolean(ticket);
  }
  return { submit, acknowledge };
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

interface LegacySourceProps { source: Document; frozen: boolean; themeModified: boolean; children(json: Document): ReactNode }
export function LegacyEditorSource({ source, frozen, themeModified, children }: LegacySourceProps) {
  const designer = useSurveyDesigner();
  const [view, setView] = useState<Snapshot>(() => ({ source, canvas: source, revision: 0, conflict: false }));
  const submissions = useSubmissions(view.source);
  if (!frozen && view.source !== source) {
    const fresh = canonicalSurvey(JSON.stringify(source));
    const sameOrOwn = fresh === canonicalSurvey(JSON.stringify(view.source)) || submissions.acknowledge(fresh);
    const dirty = designer.hasUnsavedChanges || designer.isJsonModified || themeModified;
    setView(sameOrOwn ? { ...view, source } : acceptPeer(view, source, dirty));
  }
  function load() {
    designer.setHasUnsavedChanges(false);
    designer.setIsJsonModified(false);
    setView({ ...view, canvas: view.source, revision: view.revision + 1, conflict: false });
  }
  return <LegacySubmission.Provider value={submissions.submit}>
    <div className="contents" key={view.revision}>{children(view.canvas)}</div>
    {view.conflict && <LegacyRefreshDialog load={load} keep={() => setView({ ...view, conflict: false })} />}
  </LegacySubmission.Provider>;
}

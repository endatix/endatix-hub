"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DraftAutosave, type DraftView } from "@/lib/survey-features/draft-autosave/controller";
import { openDraftStore } from "@/lib/survey-features/draft-autosave/idb-draft-store";
import type { FormDraft } from "@/lib/endatix-api/forms/types";
import { saveDraftAction } from "./save-draft.action";
import { DraftResolution } from "./draft-resolution";

interface EditorSession { controller: DraftAutosave; view: DraftView }
const DraftContext = createContext<EditorSession | null>(null);
export const LegacyScope = createContext("");
export const useEditorDraft = () => useContext(DraftContext);

interface Source { formId: string; scope: string; head: FormDraft; userId: string }
interface Props extends Source { children(document: object): ReactNode }
interface Bindings {
  change(view: DraftView): void;
  load(document: string): void;
  ready(controller: DraftAutosave): void;
}

async function mountEditor(source: Source, bindings: Bindings, signal: AbortSignal) {
  const { scope, formId, head } = source;
  const store = await openDraftStore(scope, head, signal);
  if (signal.aborted) return store.release();
  const controller = new DraftAutosave(store.queue ?? DraftAutosave.empty(head), {
    ...store, ...bindings, online: () => navigator.onLine,
    send: request => saveDraftAction(formId, scope, request),
  });
  const resume = () => void controller.resume();
  for (const event of ["online", "offline", "focus"]) window.addEventListener(event, resume, { signal });
  signal.addEventListener("abort", () => void controller.close().finally(store.release), { once: true });
  controller.open(head);
  bindings.ready(controller);
}

function useSession(source: Source, load: Bindings["load"]) {
  const [view, change] = useState<DraftView>();
  const [controller, ready] = useState<DraftAutosave>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void mountEditor(source, { change, load, ready }, abort.signal).catch(() => {
      if (!abort.signal.aborted) setError(true);
    });
    return () => abort.abort();
  }, [source, load]);
  return { session: view && controller ? { view, controller } : null, error };
}

function LastSaver({ source, view }: { source: Source; view: DraftView }) {
  const [dismissed, dismiss] = useState(false);
  useEffect(() => { if (view.count) dismiss(true); }, [view.count]);
  const saver = source.head.lastModifiedBy?.userId;
  if (dismissed || !saver || saver === source.userId) return null;
  const at = source.head.lastModifiedAt;
  return <div className="flex items-center gap-2 px-4 text-sm">
    Last saved by user {saver}{at && `, ${new Date(at).toLocaleString()}`}.
    <button type="button" onClick={() => dismiss(true)}>Dismiss</button>
  </div>;
}

export function DraftEditorProvider(props: Props) {
  // A refresh may return a newer head. An open editor reconciles it through If-Match.
  // The parent keys this provider by form and identity.
  const [source] = useState<Source>(() => ({ formId: props.formId, head: props.head, scope: props.scope, userId: props.userId }));
  const [canvas, setCanvas] = useState(() => ({ document: JSON.parse(source.head.jsonData), revision: 0 }));
  const [load] = useState(() => (json: string) => setCanvas(prior => ({ document: JSON.parse(json), revision: prior.revision + 1 })));
  const { session, error } = useSession(source, load);
  if (error) return <p role="alert">Could not open the local draft. Reload to try again.</p>;
  if (!session) return <p role="status">Opening draft…</p>;
  return <DraftContext.Provider value={session}>
    <LastSaver source={source} view={session.view} />
    <div key={canvas.revision} className="contents">{props.children(canvas.document)}</div>
    <DraftResolution {...session} />
  </DraftContext.Provider>;
}

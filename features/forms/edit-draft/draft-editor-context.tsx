"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DraftAutosave,
  type DraftView,
} from "@/lib/survey-features/draft-autosave/controller";
import { openDraftStore } from "@/lib/survey-features/draft-autosave/idb-draft-store";
import type { FormDraft } from "@/lib/endatix-api/forms/types";
import { saveDraftAction } from "./save-draft.action";
import { DraftResolution } from "./draft-resolution";

const DraftContext = createContext<{
  controller: DraftAutosave;
  view: DraftView;
} | null>(null);
export const useEditorDraft = () => useContext(DraftContext);

interface Props {
  formId: string;
  scope: string;
  head: FormDraft;
  children: (document: object) => ReactNode;
}

export function DraftEditorProvider({ formId, scope, head, children }: Props) {
  const [view, setView] = useState<DraftView>();
  const [controller, setController] = useState<DraftAutosave>();
  const [canvas, setCanvas] = useState(() => JSON.parse(head.jsonData));
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    void openDraftStore(scope)
      .then((store) => {
        if (!active) return store.release();
        const autosave = new DraftAutosave(
          store.queue ?? DraftAutosave.empty(head),
          {
            ...store,
            change: (value) => {
              setView(value);
              if (value.count) setDismissed(true);
            },
            online: () => navigator.onLine,
            send: (request) => saveDraftAction(formId, scope, request),
            load: (document) => {
              setCanvas(JSON.parse(document));
              setRevision((n) => n + 1);
            },
          },
        );
        autosave.open(head);
        setController(autosave);
        const resume = () => {
          void autosave.resume();
        };
        window.addEventListener("online", resume);
        window.addEventListener("offline", resume);
        window.addEventListener("focus", resume);
        cleanup = () => {
          window.removeEventListener("online", resume);
          window.removeEventListener("offline", resume);
          window.removeEventListener("focus", resume);
          void autosave.close().finally(store.release);
        };
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      cleanup?.();
    };
  }, [scope, formId, head]);
  if (error)
    return (
      <p role="alert">Could not open the local draft. Reload to try again.</p>
    );
  if (!controller || !view) return <p role="status">Opening draft…</p>;
  const saver = head.lastModifiedBy?.userId;
  return (
    <DraftContext.Provider value={{ controller, view }}>
      {!dismissed && saver && saver !== JSON.parse(scope)[1] && (
        <div className="flex items-center gap-2 px-4 text-sm">
          Last saved by user {saver}
          {head.lastModifiedAt &&
            `, ${new Date(head.lastModifiedAt).toLocaleString()}`}
          .
          <button type="button" onClick={() => setDismissed(true)}>
            Dismiss
          </button>
        </div>
      )}
      <div key={revision} className="contents">
        {children(canvas)}
      </div>
      <DraftResolution controller={controller} view={view} />
    </DraftContext.Provider>
  );
}

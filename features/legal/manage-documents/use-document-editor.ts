"use client";
import { useState, useTransition } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { Result, type ResultType } from "@/lib/result";
import { editDocument, previewDraft } from "./edit-document.action";
import type { Change, DocumentState, Edit } from "./documents";

type Failure = { message: string; needsReload: boolean };
type Operation = () => Promise<ResultType<DocumentState>>;
type Receive = (value: DocumentState) => void;

function useDocumentRequest() {
  const [failure, setFailure] = useState<Failure>();
  const [pending, start] = useTransition();
  function run(operation: Operation, receive: Receive) {
    start(async () => {
      try {
        const result = await operation();
        if (Result.isError(result))
          return setFailure(old => ({message: result.message, needsReload: !!old?.needsReload || result.statusCode === 409}));
        setFailure(undefined);
        receive(result.value);
      } catch (cause) {
        unstable_rethrow(cause);
        setFailure({message: "Could not confirm the result. Reload the saved document.", needsReload: true});
      }
    });
  }
  return { failure, pending, run };
}

async function readDisplayedDraft(document: DocumentState) {
  const result = await previewDraft(document.kind);
  if (Result.isError(result)) return result;
  if (result.value.revision !== document.revision || !result.value.draftMarkdown)
    return Result.error<DocumentState>("The saved draft changed. Reload it before publishing.", undefined, undefined, {statusCode:409});
  return result;
}

function useDraft(snapshot: DocumentState) {
  const [read, setRead] = useState(snapshot);
  const [local, setLocal] = useState<{base: DocumentState; text: string}>();
  const [previousText, setPreviousText] = useState<string>();
  const latest = BigInt(read.revision) > BigInt(snapshot.revision) ? read : snapshot;
  const base = local?.base ?? latest;
  const setText = (text: string) => setLocal(text === (base.draftMarkdown ?? "") ? undefined : {base, text});
  function adopt(value: DocumentState) {
    setRead(value);
    setLocal(undefined);
  }
  function reconcile(value: DocumentState) {
    setPreviousText(local?.text);
    adopt(value);
  }
  return {base, text: local?.text ?? base.draftMarkdown ?? "", dirty: !!local, setText, adopt, reconcile, previousText};
}

function useDocumentOperations(draft: ReturnType<typeof useDraft>) {
  const {run, ...request} = useDocumentRequest();
  const [preview, setPreview] = useState<DocumentState | null>(null);
  const router = useRouter();
  const close = () => setPreview(null);
  const complete = (value: DocumentState) => { draft.adopt(value); close(); router.refresh(); };
  const reload = () => run(() => previewDraft(draft.base.kind), value => {
    draft.reconcile(value); close(); router.refresh();
  });
  const review = () => run(() => readDisplayedDraft(draft.base), setPreview);
  const write = (edit: Edit) => run(() => editDocument(edit), complete);
  return {...request, write, review, reload, preview, close};
}

export function useDocumentEditor(document: DocumentState) {
  const draft = useDraft(document);
  const { write, ...controls } = useDocumentOperations(draft);
  const displayed = { kind: document.kind, revision: draft.base.revision };
  return {
    ...draft, ...controls, locked: controls.pending || !!controls.failure?.needsReload,
    save: () => write({ ...displayed, operation: "draft", markdown: draft.text }),
    toggle: () => write({ ...displayed, operation: "required", required: !draft.base.required }),
    publish: (change: Change) => controls.preview && write({
      kind: document.kind, revision: controls.preview.revision, operation: "publish", change,
    }),
  };
}
export type Editor = ReturnType<typeof useDocumentEditor>;

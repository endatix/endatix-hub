"use client";
import { useState, useTransition } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { Result } from "@/lib/result";
import { editDocument, previewDraft } from "./edit-document.action";
import type { Change, DocumentState, Edit } from "./documents";

function useDocumentRequest() {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(work: () => Promise<void>) {
    setError("");
    start(async () => {
      try {
        await work();
      } catch (cause) {
        unstable_rethrow(cause);
        setError("The request could not be confirmed. Reload the saved document before trying again.");
      }
    });
  }
  return { error, setError, pending, run };
}

function useSavedDocument(document: DocumentState) {
  const { error, setError, pending, run } = useDocumentRequest();
  const [preview, setPreview] = useState<DocumentState | null>(null);
  const router = useRouter();
  function write(edit: Edit) {
    run(async () => {
      setPreview(null);
      const result = await editDocument(edit);
      if (Result.isError(result)) return setError(result.message);
      router.refresh();
    });
  }
  const review = () => run(async () => {
    const result = await readDisplayedDraft(document);
    if (Result.isError(result)) return setError(result.message);
    setPreview(result.value);
  });
  return {write, review, preview, error, pending, close: () => setPreview(null)};
}

async function readDisplayedDraft(document: DocumentState) {
  const result = await previewDraft(document.kind);
  if (Result.isError(result)) return result;
  if (result.value.revision !== document.revision || !result.value.draftMarkdown)
    return Result.error<DocumentState>("The saved draft changed. Reload it before publishing.");
  return result;
}

export function useDocumentEditor(document: DocumentState) {
  const { write, ...saved } = useSavedDocument(document);
  const [text, setText] = useState(document.draftMarkdown ?? "");
  const displayed = { kind: document.kind, revision: document.revision };
  return {
    ...saved,
    text,
    setText,
    dirty: text !== (document.draftMarkdown ?? ""),
    save: () => write({ ...displayed, operation: "draft", markdown: text }),
    toggle: () => write({ ...displayed, operation: "required", required: !document.required }),
    publish: (change: Change) => saved.preview && write({ ...displayed, operation: "publish", change }),
  };
}
export type Editor = ReturnType<typeof useDocumentEditor>;

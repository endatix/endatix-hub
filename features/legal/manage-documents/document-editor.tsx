"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LegalMarkdown } from "../legal-markdown";
import { titles, type DocumentState } from "./documents";
import { PublishDialog } from "./publish-dialog";
import { useDocumentEditor, type Editor } from "./use-document-editor";

export function DocumentEditor({ document }: Readonly<{ document: DocumentState }>) {
  const editor = useDocumentEditor(document);
  return (
    <section className="space-y-4" aria-label={titles[document.kind]}>
      <h2 className="text-xl font-semibold">{titles[document.kind]}</h2>
      <p>{document.publishedNumber ? `Published version ${document.publishedNumber}` : "No published version"}</p>
      {document.kind === "terms" && <RequiredSetting document={document} editor={editor} />}
      <DraftFields editor={editor} />
      {editor.error && <RetryDocument message={editor.error} />}
      {editor.preview && <PublishDialog document={editor.preview} editor={editor} />}
    </section>
  );
}

function RetryDocument({message}: Readonly<{message: string}>) {
  return <div role="alert" className="space-y-2">
    <p>{message}</p><p>Copy any edits you want to keep before reloading.</p>
    <Button variant="outline" onClick={() => window.location.reload()}>Reload saved document</Button>
  </div>;
}

interface SettingProps {
  document: DocumentState;
  editor: Editor;
}
function RequiredSetting({ document, editor }: Readonly<SettingProps>) {
  return (
    <div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={document.required}
          onChange={editor.toggle}
          disabled={!document.publishedNumber || editor.pending || editor.dirty}
        />
        Required
      </label>
      <p className="text-sm text-muted-foreground">
        Require acceptance of the published Terms before using the workspace.
      </p>
    </div>
  );
}

function DraftFields({ editor }: Readonly<{ editor: Editor }>) {
  return (
    <div className="space-y-3">
      <label htmlFor="legal-draft">Draft (Markdown)</label>
      <Textarea
        id="legal-draft"
        rows={10}
        disabled={editor.pending}
        value={editor.text}
        onChange={(e) => editor.setText(e.target.value)}
      />
      <details>
        <summary>Preview draft</summary>
        <LegalMarkdown text={editor.text} />
      </details>
      <DraftActions editor={editor} />
    </div>
  );
}

function DraftActions({editor}: Readonly<{editor: Editor}>) {
  return <div className="flex flex-wrap gap-2">
        <Button disabled={!editor.dirty || !editor.text.trim() || editor.pending} onClick={editor.save}>
          Save draft
        </Button>
        <Button variant="outline" disabled={editor.dirty || !editor.text || editor.pending} onClick={editor.review}>
          Review and publish
        </Button>
  </div>;
}

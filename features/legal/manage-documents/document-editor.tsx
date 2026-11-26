"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LegalMarkdown } from "../legal-markdown";
import { titles, type DocumentState } from "./documents";
import { PublishDialog } from "./publish-dialog";
import { useDocumentEditor, type Editor } from "./use-document-editor";
import { DocumentFailure } from "./document-failure";

export function DocumentEditor({ document, active = true }: Readonly<{ document: DocumentState; active?: boolean }>) {
  const editor = useDocumentEditor(document);
  if (!active) return null;
  return (
    <section className="space-y-4" aria-label={titles[document.kind]}>
      <h2 className="text-xl font-semibold">{titles[document.kind]}</h2>
      <p>{editor.base.publishedNumber ? `Published version ${editor.base.publishedNumber}` : "No published version"}</p>
      {document.kind === "terms" && <RequiredSetting document={editor.base} editor={editor} />}
      <DraftFields editor={editor} />
      {!editor.preview && <DocumentFailure editor={editor} />}
      {editor.previousText && <details><summary>Your previous unsaved text</summary><pre className="whitespace-pre-wrap">{editor.previousText}</pre></details>}
      {editor.preview && <PublishDialog document={editor.preview} editor={editor} />}
    </section>
  );
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
          disabled={!document.publishedNumber || editor.locked || editor.dirty}
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
        <Button disabled={!editor.dirty || !editor.text.trim() || editor.locked} onClick={editor.save}>
          Save draft
        </Button>
        <Button variant="outline" disabled={editor.dirty || !editor.text || editor.locked} onClick={editor.review}>
          Review and publish
        </Button>
  </div>;
}

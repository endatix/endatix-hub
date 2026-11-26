import { Button } from "@/components/ui/button";
import type { Editor } from "./use-document-editor";

export function DocumentFailure({editor}: Readonly<{editor: Editor}>) {
  if (!editor.failure) return null;
  return <div role="alert" className="space-y-2">
    <p>{editor.failure.message}</p>
    {editor.failure.needsReload && <Button variant="outline" disabled={editor.pending} onClick={editor.reload}>
      Reload saved document
    </Button>}
  </div>;
}

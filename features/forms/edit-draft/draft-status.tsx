"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { downloadText } from "@/lib/utils/files-download";
import type { DraftAutosave, DraftView } from "@/lib/survey-features/draft-autosave/controller";
import { useEditorDraft } from "./draft-editor-context";

const labels = {
  saving: "Saving…", saved: "Saved", auth: "Sign in to save", conflict: "Changed elsewhere",
  recovery: "Recovery needed", error: "Save failed", modeChanged: "Reopen the designer",
};

function saveLabel(view: DraftView) {
  if (view.status !== "offline") return labels[view.status];
  return `Offline · ${view.count} ${view.count === 1 ? "change" : "changes"} on this device`;
}

function publishLabel({ count, head }: DraftView) {
  if (count || head.hasUnpublishedChanges) return "Unpublished changes";
  return head.activeNumber == null ? null : `Live: v${head.activeNumber}`;
}

function SaveAction({ view, controller }: { view: DraftView; controller: DraftAutosave }) {
  const router = useRouter();
  if (view.status === "auth") {
    const signIn = () => router.push(`/signin?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
    return <Button size="sm" onClick={signIn}>Sign in</Button>;
  }
  if (view.status === "modeChanged") {
    const download = () => downloadText(controller.localDocument, "local-form-draft.json", "application/json");
    return <Button size="sm" onClick={download}>Download local changes</Button>;
  }
  if (view.status !== "error") return null;
  return <Button size="sm" variant="outline" onClick={() => void controller.resume()}>Retry</Button>;
}

export function DraftStatusBadges() {
  const draft = useEditorDraft();
  if (!draft) return null;
  const { view } = draft;
  const published = publishLabel(view);
  const detail = view.message ?? `Draft ${view.head.version} · ${view.head.lastModifiedAt ?? "No edits yet"}`;
  return <span className="flex items-center gap-2" role="status">
    <Badge variant="outline" title={detail}>{saveLabel(view)}</Badge>
    {published && <Badge variant="secondary">{published}</Badge>}
    <SaveAction {...draft} />
  </span>;
}

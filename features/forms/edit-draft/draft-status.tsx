"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEditorDraft } from "./draft-editor-context";
import { useRouter } from "next/navigation";

export function DraftStatusBadges() {
  const draft = useEditorDraft();
  const router = useRouter();
  if (!draft) return null;
  const { view, controller } = draft;
  const labels = {
    saving: "Saving…",
    saved: "Saved",
    offline: `Offline · ${view.count} ${view.count === 1 ? "change" : "changes"} on this device`,
    auth: "Sign in to save",
    conflict: "Changed elsewhere",
    recovery: "Recovery needed",
    error: "Save failed",
  };
  return (
    <span className="flex items-center gap-2" role="status">
      <Badge
        variant="outline"
        title={
          view.message ??
          `Draft ${view.head.version} · ${view.head.lastModifiedAt ?? "No edits yet"}`
        }
      >
        {labels[view.status]}
      </Badge>
      {view.count || view.head.hasUnpublishedChanges ? (
        <Badge variant="secondary">Unpublished changes</Badge>
      ) : (
        view.head.activeNumber != null && (
          <Badge variant="outline">Live: v{view.head.activeNumber}</Badge>
        )
      )}
      {view.status === "auth" && (
        <Button
          size="sm"
          onClick={() =>
            router.push(
              `/signin?returnUrl=${encodeURIComponent(location.pathname + location.search)}`,
            )
          }
        >
          Sign in
        </Button>
      )}
      {view.status === "error" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void controller.resume()}
        >
          Retry
        </Button>
      )}
    </span>
  );
}

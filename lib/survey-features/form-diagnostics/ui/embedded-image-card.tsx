"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useOptionalDesignerRuntime } from "@/lib/designer-runtime";
import { useSurveyDesigner } from "../../designer/design-survey.context";
import { OriginalImageUploadContext } from "../../rich-text/ui/image-upload-context";
import { convertImages } from "../convert-images";
import { conversionSession, type ImageSnapshot } from "../conversion-session";
import type { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";
import type { ImageReview } from "../embedded-images";

function PlacementList({ review }: Readonly<{ review: ImageReview }>) {
  return <ul aria-label="Image placements" className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
    {review.eligible.map(({ field, span }) => <li key={JSON.stringify([field.path, span.start])}>
      {field.location} <span className="text-muted-foreground">· Embedded → Stored</span>
    </li>)}
    {review.skipped.map(({ location, reason }, index) => <li key={`${location}:${index}`}>
      {location} · Skipped: {reason}
    </li>)}
  </ul>;
}

function count(value: number, unit: string) {
  return `${value.toLocaleString()} ${unit}${value === 1 ? "" : "s"}`;
}

export function EmbeddedImageCard({ model }: Readonly<{ model: FormDiagnosticsPlugin }>) {
  const session = conversionSession(model.creator);
  return session ? <ImageCard session={session} /> : null;
}

function ImageCard({ session }: Readonly<{ session: NonNullable<ReturnType<typeof conversionSession>> }>) {
  const runtime = useOptionalDesignerRuntime();
  const canEdit = runtime?.stateRef.current.canConvertImages === true;
  const store = useContext(OriginalImageUploadContext);
  const { hasUnsavedChanges } = useSurveyDesigner();
  const request = useRef<AbortController | null>(null);
  const [snapshot, setSnapshot] = useState<ImageSnapshot>();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const scan = useCallback(() => {
    try { setSnapshot(session?.review()); setMessage(""); }
    catch { setSnapshot(undefined); setMessage("Cannot match the stored definition to the editor. Review your changes."); }
  }, [session]);
  useEffect(() => {
    scan();
    return () => { request.current?.abort(); request.current = null; };
  }, [scan]);
  const review = snapshot?.inventory;
  if (!review) return message && <p role="alert">{message}</p>;
  const placements = count(review.eligible.length, "placement");
  const files = count(review.files.length, "file");
  const remaining = review.files.filter(file => !session?.uploads.has(file.key));
  const bytes = remaining.reduce((sum, file) => sum + file.bytes.length, 0);
  if (!review.eligible.length && !review.skipped.length && !message) return null;

  async function convert() {
    if (!snapshot || !store || !session || request.current || !canEdit) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const result = await convertImages(session, snapshot, { store, signal: controller.signal, progress: setMessage });
      if (request.current !== controller) return;
      if (result === "converted") {
        setDone(true); setExpanded(false);
        setMessage(`${placements} converted using ${files}. ${review?.skipped.length} skipped.`);
      } else if (result === "stale") {
        setExpanded(false); setMessage("The definition changed. Review again. No changes applied.");
      } else if (result === "cancelled") setMessage("Cancelled. No changes applied.");
      else setMessage(`Upload failed at ${result.failed}. No changes applied. Retry conversion.`);
    } catch { setMessage("Could not apply this review. Review images again."); setExpanded(false); }
    finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }
  return <section aria-label="Embedded images" className="space-y-3 rounded-lg border bg-card p-4">
    <h3 className="font-semibold">Embedded images</h3>
    {!done && <p className="text-sm">Moving embedded images to storage can make this definition smaller. {placements} can change · {count(remaining.length, "file")} to upload ({bytes.toLocaleString()} bytes) · {review.skipped.length} skipped.</p>}
    {!store && <p className="text-sm text-muted-foreground">Conversion is unavailable because storage is disabled.</p>}
    <p role="status" className="text-sm">{message} {done && hasUnsavedChanges && "Changes not saved."}</p>
    {expanded && <><p className="text-sm">Only the source changes. Captions, dimensions and styling stay the same. Images are not resized. Use Save to keep your changes.</p><PlacementList review={review} /></>}
    <div className="flex flex-wrap gap-2">
      {!expanded && <Button variant="outline" onClick={() => { if (!done) scan(); setExpanded(true); }}>{done ? "View changes" : "Review images"}</Button>}
      {expanded && !done && canEdit && store && review.eligible.length > 0 &&
        <Button disabled={busy} onClick={convert}>Convert {placements}</Button>}
      {expanded && <Button variant="ghost" onClick={() => busy ? request.current?.abort() : setExpanded(false)}>{busy ? "Cancel" : "Close"}</Button>}
      {done && hasUnsavedChanges && <Button variant="outline" onClick={() => {
        if (!session?.undo()) { setMessage("The definition changed. Undo is unavailable."); return; }
        setDone(false); scan(); setMessage("Conversion undone.");
      }}>Undo conversion</Button>}
    </div>
  </section>;
}

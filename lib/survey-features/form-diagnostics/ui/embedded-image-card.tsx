"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useOptionalDesignerRuntime } from "@/lib/designer-runtime";
import { formatBytes } from "@/lib/utils/formatters";
import { useSurveyDesigner } from "../../designer/design-survey.context";
import {
  conversionSession,
  type ConversionSession,
} from "../conversion-session";
import type { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";
import { placementsByField, type ImageReview } from "../embedded-images";
import { count, useImageConversion } from "./use-image-conversion";

function ReviewDescription({ review }: Readonly<{ review: ImageReview }>) {
  const bytes = review.eligible.reduce(
    (sum, { span }) => sum + span.source.length,
    0,
  );
  return (
      <p className="text-sm">
        Only the source changes. Captions, dimensions and styling stay the same.
        Images are not resized. Stored links replace {formatBytes(bytes)} of
        embedded sources. Use Save to keep your changes.
      </p>
  );
}

type EligibleImage = ImageReview["eligible"][number];
function Placement({ item, index }: Readonly<{ item: EligibleImage; index: number }>) {
  return (
    <li className="flex items-center gap-2">
      <Image unoptimized alt="" src={item.span.source} width={32} height={32} className="size-8 rounded-sm object-contain" />
      Image {index + 1} <span className="text-muted-foreground">· Embedded → Stored</span>
    </li>
  );
}

function groupedPlacements(review: ImageReview) {
  return Array.from(placementsByField(review), ([field, images]) => <li key={JSON.stringify(field.path)}>
    <p className="font-medium">{field.location} · {count(images.length, "placement")}</p>
    <ul>{images.map((item, index) => <Placement key={item.span.start} item={item} index={index} />)}</ul>
  </li>);
}

function PlacementList({ review }: Readonly<{ review: ImageReview }>) {
  return <>
      <ReviewDescription review={review} />
      <ul
        aria-label="Image placements"
        className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3 text-sm"
      >
        {groupedPlacements(review)}
        {review.skipped.map(({ location, reason }, index) => (
          <li key={`${location}:${index}`}>
            {location} · Skipped: {reason}
          </li>
        ))}
      </ul>
    </>;
}

type Controls = ReturnType<typeof useImageConversion>;
type ActionProps = { controls: Controls; placements: number };
function ReviewActions({ controls, placements }: Readonly<ActionProps>) {
  const canEdit = useOptionalDesignerRuntime()?.stateRef.current.canConvertImages;
  const reviewLabel = controls.stale ? "Review again" : "Review images";
  if (!controls.expanded) return <Button variant="outline" onClick={controls.open}>
    {controls.done ? "View changes" : reviewLabel}
  </Button>;
  const canConvert = canEdit && !controls.done && controls.enabled && placements > 0;
  return <>
    {canConvert && <Button disabled={controls.busy} onClick={controls.convert}>{controls.retry ? "Retry conversion" : `Convert ${count(placements, "placement")}`}</Button>}
    <Button variant="ghost" onClick={controls.close}>{controls.busy ? "Cancel" : "Close"}</Button>
  </>;
}

function Actions({ controls, placements }: Readonly<ActionProps>) {
  const { hasUnsavedChanges } = useSurveyDesigner();
  const canEdit = useOptionalDesignerRuntime()?.stateRef.current.canConvertImages;
  const unsaved = controls.done && hasUnsavedChanges;
  return (
    <>
      <p role="status" className="text-sm">
        {controls.message} {unsaved && "Changes not saved."}
      </p>
      <div className="flex flex-wrap gap-2">
        <ReviewActions controls={controls} placements={placements} />
        {unsaved && canEdit && (
          <Button variant="outline" onClick={controls.undo}>
            Undo conversion
          </Button>
        )}
      </div>
    </>
  );
}

function ImageSummary({ session, review }: Readonly<{ session: ConversionSession; review: ImageReview }>) {
  const remaining = review.files.filter(
    (file) => !session.uploads.has(file.key),
  );
  const bytes = remaining.reduce((sum, file) => sum + file.bytes.length, 0);
  return <p className="text-sm">
    Moving embedded images to storage can make this definition smaller.{" "}
    {count(review.eligible.length, "placement")} can change · {count(remaining.length, "file")} to upload ({formatBytes(bytes)}) · {review.skipped.length} skipped.
  </p>;
}

function ImageCard({ session }: Readonly<{ session: ConversionSession }>) {
  const controls = useImageConversion(session);
  const { review, message } = controls;
  if (!review) return message && <p role="alert">{message}</p>;
  if (!review.eligible.length && !review.skipped.length && !message) return null;
  return (
    <section
      aria-label="Embedded images"
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <h3 className="font-semibold">Embedded images</h3>
      {!controls.done && <ImageSummary session={session} review={review} />}
      {!controls.enabled && <p className="text-sm text-muted-foreground">Conversion is unavailable because storage is disabled.</p>}
      {controls.expanded && <PlacementList review={review} />}
      <Actions controls={controls} placements={review.eligible.length} />
    </section>
  );
}

export function EmbeddedImageCard({
  model,
}: Readonly<{ model: FormDiagnosticsPlugin }>) {
  const session = conversionSession(model.creator);
  return session ? <ImageCard session={session} /> : null;
}

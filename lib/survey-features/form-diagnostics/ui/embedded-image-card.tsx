"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useId } from "react";
import { useOptionalDesignerRuntime } from "@/lib/designer-runtime";
import { formatBytes } from "@/lib/utils/formatters";
import { useSurveyDesigner } from "../../designer/design-survey.context";
import type { ConversionSession } from "../conversion-session";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "@/lib/survey-js";
import { ESTIMATED_LINK_BYTES } from "../definition-size";
import { placementsByField, type ImageReview } from "../embedded-images";
import { count, useImageConversion } from "./use-image-conversion";

function ReviewDescription() {
  return (
      <p className="text-sm">
        Only the source changes. Captions, dimensions and styling stay the same.
        Original files are uploaded without resizing. The estimate assumes a {ESTIMATED_LINK_BYTES}-byte
        stored link per placement. Actual link lengths vary.
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
      <ReviewDescription />
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
type ActionProps = { controls: Controls; placements: number; detailsId: string };
function reviewButtonLabel(controls: Controls) {
  if (controls.expanded) return controls.busy ? "Cancel" : "Close";
  if (controls.done) return "View changes";
  return controls.stale ? "Review again" : "Review images";
}
function ReviewActions({ controls, placements, detailsId }: Readonly<ActionProps>) {
  const canEdit = useOptionalDesignerRuntime()?.stateRef.current.canConvertImages;
  const canConvert = canEdit && !controls.done && controls.enabled && placements > 0;
  return <>
    <Button variant={!controls.expanded && canConvert ? "default" : "outline"} aria-expanded={controls.expanded} aria-controls={detailsId}
      onClick={controls.expanded ? controls.close : controls.open}>{reviewButtonLabel(controls)}</Button>
    {controls.expanded && canConvert && <Button disabled={controls.busy} onClick={controls.convert}>{controls.retry ? "Retry conversion" : `Convert ${count(placements, "placement")}`}</Button>}
  </>;
}

function Actions({ controls, placements, session, detailsId }: Readonly<ActionProps & { session: ConversionSession }>) {
  const { hasUnsavedChanges } = useSurveyDesigner();
  const runtime = useOptionalDesignerRuntime()?.stateRef.current;
  const unsaved = controls.done && hasUnsavedChanges && Boolean(session.lastConversion);
  return <>
      <output className="block text-sm">
        {controls.message} {unsaved && `Changes not saved. Use ${runtime?.templateId ? "Save Template" : "Save"} to keep this version.`}
      </output>
      <div className="flex flex-wrap gap-2">
        <ReviewActions controls={controls} placements={placements} detailsId={detailsId} />
        {controls.done && <PreviewButton session={session} />}
        {unsaved && runtime?.canConvertImages && (
          <Button variant="outline" onClick={controls.undo}>
            Undo conversion
          </Button>
        )}
      </div>
    </>;
}

function PreviewButton({ session }: Readonly<{ session: ConversionSession }>) {
  const tab = SURVEY_CREATOR_BUILT_IN_TAB.preview;
  if (!session.creator.tabs.some(item => item.id === tab)) return null;
  return <Button variant="outline" onClick={() => { session.creator.activeTab = tab; }}>Preview</Button>;
}

function ImageSummary({ session, controls }: Readonly<{ session: ConversionSession; controls: Controls }>) {
  const { snapshot } = controls;
  if (!snapshot) return null;
  const review = snapshot.inventory;
  const remaining = review.files.filter(
    (file) => !session.uploads.has(file.key),
  );
  const bytes = remaining.reduce((sum, file) => sum + file.bytes.length, 0);
  const estimate = snapshot.estimatedSavings;
  return <div className="space-y-1 text-sm">
    {review.eligible.length > 0 && <p className="font-medium">
      {estimate === 0 ? "Estimated definition size: unchanged." :
        `Estimated definition size: ${formatBytes(Math.abs(estimate))} ${estimate < 0 ? "larger" : "smaller"} with stored links.`}
    </p>}
    <p className="text-muted-foreground">{count(review.eligible.length, "placement")} can change · {count(remaining.length, "file")} to upload ({formatBytes(bytes)}) · {review.skipped.length} skipped.</p>
  </div>;
}

export function EmbeddedImageCard({ session, controls }: Readonly<{ session: ConversionSession; controls: Controls }>) {
  const detailsId = useId();
  const { review, message } = controls;
  if (!review) return message && <p role="alert">{message}</p>;
  if (!review.eligible.length && !review.skipped.length && !message) return null;
  return (
    <section
      aria-label="Embedded images"
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <ImageHeading done={controls.done} eligible={review.eligible.length} />
      {controls.done && session.measuredChange ? <MeasuredSize change={session.measuredChange} /> : <ImageSummary session={session} controls={controls} />}
      {!controls.enabled && <p className="text-sm text-muted-foreground">Conversion is unavailable because storage is disabled.</p>}
      <div id={detailsId} hidden={!controls.expanded}>{controls.expanded && <PlacementList review={review} />}</div>
      <Actions controls={controls} placements={review.eligible.length} session={session} detailsId={detailsId} />
    </section>
  );
}

function ImageHeading({done, eligible}: Readonly<{done: boolean; eligible: number}>) {
  const label = eligible ? "Optimization" : "Manual review";
  const title = eligible ? "Move embedded images to storage" : "Images left embedded";
  return <>
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{done ? "Result" : label}</p>
    <h3 className="font-semibold">{done ? "Images moved to storage" : title}</h3>
  </>;
}
function MeasuredSize({ change }: Readonly<{ change: NonNullable<ConversionSession["measuredChange"]> }>) {
  const direction = change.delta < 0 ? "larger" : "smaller";
  const difference = change.delta === 0 ? "unchanged" : `${change.percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}% ${direction}`;
  return <p className="text-sm font-medium">
    Definition: {change.before.toLocaleString()} → {change.after.toLocaleString()} bytes
    {" "}({difference}).
  </p>;
}

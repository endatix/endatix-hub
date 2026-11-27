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
import type { ImageReview } from "../embedded-images";
import { count, useImageConversion } from "./use-image-conversion";
import { Badge } from "@/components/ui/badge";
import { imageBenefit } from "../diagnostic-findings";
import { BenefitSummary, ReviewHeading } from "./finding-panel";

function ReviewDescription({template}: Readonly<{template: boolean}>) {
  return (
      <p className="text-sm">
        Only the source changes. Captions, dimensions and styling stay the same.
        Each distinct file uploads once without resizing. The {template ? "template" : "form"} changes in the designer.
        Use {template ? "Save Template" : "Save"} to keep the change, or undo it.
      </p>
  );
}

type EligibleImage = ImageReview["eligible"][number];
function Placement({ item, group, file }: Readonly<{ item: EligibleImage; group: string; file: string }>) {
  const field = item.field.location.slice(group.length).replace(/^[\s·›]+/, "");
  return (
    <li className="flex items-center gap-2">
      <Image unoptimized alt="" src={item.span.source} width={32} height={32} className="size-8 rounded-sm object-contain" />
      <span>{field || item.field.location} · {file}</span><Badge variant="outline">Embedded → Stored</Badge>
    </li>
  );
}

function groupedPlacements(review: ImageReview) {
  const groups = new Map<string, EligibleImage[]>();
  for (const item of review.eligible) {
    const group = item.field.group ?? item.field.location;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  }
  const files = new Map(review.files.map((file,i) => [file.key, `File ${i+1} · ${formatBytes(file.bytes.length)}`]));
  return Array.from(groups, ([group, images]) => <li key={group} className="rounded-md bg-muted/50 p-2">
    <p className="font-medium">{group} · {count(images.length, "placement")}</p>
    <ul>{images.map(item => <Placement key={JSON.stringify([item.field.path,item.span.start])} item={item} group={group} file={files.get(item.key)!} />)}</ul>
  </li>);
}

function PlacementList({ review, done, blocked }: Readonly<{ review: ImageReview; done: boolean; blocked: boolean }>) {
  const template = Boolean(useOptionalDesignerRuntime()?.stateRef.current.templateId);
  return <>
      <ReviewHeading>{done ? "Converted placements" : blocked ? "Placement details" : "What will change"}</ReviewHeading>
      {!done && !blocked && <ReviewDescription template={template} />}
      {!done && review.eligible.length > 0 && <details><summary className="cursor-pointer text-sm">Estimate assumptions</summary>
        <p className="text-sm">Compact UTF-8 definition JSON, assuming a {ESTIMATED_LINK_BYTES}-byte stored link per placement. Actual links vary; upload bytes are separate.</p></details>}
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
      {unsaved && <Badge variant="warning">Not saved</Badge>}
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

function ImageEvidence({ session, controls }: Readonly<{ session: ConversionSession; controls: Controls }>) {
  const { snapshot } = controls;
  if (!snapshot) return null;
  const review = snapshot.inventory;
  const remaining = review.files.filter(
    (file) => !session.uploads.has(file.key),
  );
  const bytes = remaining.reduce((sum, file) => sum + file.bytes.length, 0);
  return <p className="text-sm text-muted-foreground">{count(review.eligible.length, "placement")} can change · {count(remaining.length, "file")} to upload ({formatBytes(bytes)}) · {review.skipped.length} skipped.</p>;
}

function useImageEffect(controls: Controls) {
  const runtime = useOptionalDesignerRuntime()?.stateRef.current;
  const blocked = !controls.enabled || !runtime?.canConvertImages;
  return { blocked, label: imageEffect(controls, runtime) };
}

type ImageCardProps = Readonly<{session: ConversionSession; controls: Controls; lead: boolean}>;
function ImageLeadSummary({ session, controls, lead }: ImageCardProps) {
  const {blocked,label} = useImageEffect(controls);
  const heading = controls.done ? "Conversion result" : blocked ? "Review first" : "Recommended first";
  return <>
    <p className="flex flex-wrap items-center gap-2 text-xs font-medium">{lead && heading}
      <Badge variant={blocked ? "secondary" : "info"}>{label}</Badge></p>
    {controls.done && session.measuredChange ? <MeasuredSize change={session.measuredChange} /> :
      <ImageOverview controls={controls} prominent={lead && !blocked} blocked={blocked} />}
    {!controls.done && <ImageEvidence session={session} controls={controls} />}
  </>;
}
export function EmbeddedImageCard({ session, controls, lead }: ImageCardProps) {
  const detailsId = useId();
  const {blocked} = useImageEffect(controls);
  const { review, message } = controls;
  if (!review) return message && <p role="alert">{message}</p>;
  if (!review.eligible.length && !review.skipped.length && !message) return null;
  return (
    <section
      aria-label="Embedded images"
      className={lead ? "space-y-3 rounded-lg border-2 border-primary/35 bg-card p-5" : "space-y-2 p-3"}
    >
      <ImageLeadSummary session={session} controls={controls} lead={lead} />
      {!controls.enabled && <p className="text-sm text-muted-foreground">Conversion is unavailable because storage is disabled.</p>}
      <div id={detailsId} hidden={!controls.expanded}>{controls.expanded && <PlacementList review={review} done={controls.done} blocked={blocked} />}</div>
      <Actions controls={controls} placements={review.eligible.length} session={session} detailsId={detailsId} />
    </section>
  );
}

function imageEffect(controls: Controls, runtime?: {canConvertImages?: boolean; templateId?: string}) {
  if (controls.done) return "Conversion applied";
  if (!controls.review?.eligible.length) return "Review by hand";
  if (!controls.enabled) return "Unavailable · storage off";
  if (!runtime?.canConvertImages) return "Needs edit access";
  return runtime.templateId ? "Changes this template after Save" : "Changes this form after Save";
}
function ImageOverview({controls, prominent, blocked}: Readonly<{controls: Controls; prominent: boolean; blocked: boolean}>) {
  const snapshot = controls.snapshot;
  if (!snapshot) return null;
  const eligible = snapshot.inventory.eligible.length > 0;
  const benefit = eligible ? imageBenefit(snapshot.bytes, snapshot.estimatedSavings) :
    { basis: "Not measured" as const, headline: "Identify unsupported placements", explanation: "Inspect each skipped source before editing it manually." };
  return <div className={prominent ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>
    <div><h3 className="text-lg font-semibold">{eligible ? "Move embedded images to storage" : "Images left embedded"}</h3>
      <p className="text-sm">These images are stored inside the authored definition.</p></div>
    <BenefitSummary benefit={benefit} prominent={prominent} blocked={eligible && blocked} />
  </div>;
}
function MeasuredSize({ change }: Readonly<{ change: NonNullable<ConversionSession["measuredChange"]> }>) {
  const direction = change.delta < 0 ? "larger" : "smaller";
  const difference = change.delta === 0 ? "unchanged" : `${change.percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}% ${direction}`;
  return <p className="rounded-md bg-primary/5 p-3 text-sm font-medium"><strong className="block">Measured definition size</strong>
    Definition: {change.before.toLocaleString()} → {change.after.toLocaleString()} bytes
    {" "}({difference}).
  </p>;
}

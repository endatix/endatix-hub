"use client";

import { useCallback, useId, useMemo, useState, useSyncExternalStore } from "react";
import { ReactElementFactory } from "survey-react-ui";
import { useOptionalDesignerRuntime } from "@/lib/designer-runtime";
import { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";
import { conversionSession } from "../conversion-session";
import { choiceListCheck, structureNotes } from "../diagnostic-recommendations";
import { AudienceFindings, useAudienceFindings } from "./audience-findings";
import { ConvertLargeChoiceLists } from "./convert-large-choice-lists";
import { EmbeddedImageCard } from "./embedded-image-card";
import { useImageConversion } from "./use-image-conversion";
import { AllChecks, Disclosure, OverviewHeader } from "./diagnostic-checks";

type ModelProps = Readonly<{ model: FormDiagnosticsPlugin }>;
interface FormDiagnosticsTabProps {
  data?: FormDiagnosticsPlugin | { model?: FormDiagnosticsPlugin };
}

function useAudienceCheck(model: FormDiagnosticsPlugin) {
  const key = useId();
  const subscribe = useCallback((notify: () => void) => {
    model.registerPropertyChangedHandlers(["audienceCheck"], notify, key);
    return () => model.unregisterPropertyChangedHandlers(["audienceCheck"], key);
  }, [model, key]);
  const read = () => model.audienceCheck;
  return useSyncExternalStore(subscribe, read, read);
}

function ChoiceTool({ model, check }: ModelProps & { check: ReturnType<typeof choiceListCheck> }) {
  const [inspected, setInspected] = useState(false);
  if (!check.count && !inspected) return null;
  const title = check.recommended ? "Move large choice lists into a new form copy" : "Optional: create a copy with data lists";
  return <Disclosure title={title} onInspect={() => setInspected(true)}>
    <ConvertLargeChoiceLists model={model} />
  </Disclosure>;
}

function imageStatus(images: ReturnType<typeof useImageConversion>, available: boolean) {
  if (!images.review) return available && !images.message
    ? { label: "Checking…", notice: "Checking embedded images…" }
    : { label: "Not available", notice: "Some checks are unavailable" };
  if (images.busy) return { label: "Uploading", notice: "Conversion in progress" };
  if (images.retry || images.stale) return { label: "Review needed", notice: "Conversion needs review" };
  if (images.done) return { label: "Conversion applied", notice: "" };
  return imageInventoryStatus(images.review, images.enabled);
}

function imageInventoryStatus(review: NonNullable<ReturnType<typeof useImageConversion>["review"]>, enabled: boolean) {
  if (review.eligible.length && !enabled) return { label: "Storage disabled", notice: "Image storage is unavailable" };
  if (review.skipped.length) return { label: `${review.skipped.length} skipped`, notice: "Some image placements need manual review" };
  return { label: review.eligible.length ? "Review available" : "Checked · none embedded", notice: "" };
}

function useOverview(model: FormDiagnosticsPlugin) {
  const session = conversionSession(model.creator);
  const images = useImageConversion(session);
  const source = images.snapshot?.source;
  const check = useMemo(() => choiceListCheck(source ?? model.creator.JSON ?? {}, Boolean(model.formId)),
    [source, model, model.stats, model.formId]);
  const measured = images.done ? session?.measuredChange : undefined;
  const bytes = measured?.after ?? images.snapshot?.bytes ?? model.stats.uncompressedSize;
  const estimated = images.done ? 0 : Math.max(0, images.snapshot?.estimatedSavings ?? 0);
  // These signals can describe the same choice label. Do not subtract its bytes twice.
  const remaining = bytes - Math.max(estimated, check.recommended ? check.bytes : 0);
  return { session, images, bytes, check, notes: structureNotes(model.stats, remaining) };
}

function checkNotice(status: ReturnType<typeof imageStatus>, audience: ReturnType<typeof useAudienceCheck>, pendingSave: boolean) {
  if (pendingSave) return "Conversion ready to save";
  if (audience === "failed") return "Some checks are unavailable";
  if (audience === "checking") return "Checking personalization…";
  return status.notice;
}

function useDiagnosticsOverview(model: FormDiagnosticsPlugin) {
  const overview = useOverview(model);
  const { session, images, check, notes } = overview;
  const findings = useAudienceFindings(model);
  const audience = useAudienceCheck(model);
  const upload = model.stats.fileUploadWithoutBlobCount;
  const canEdit = useOptionalDesignerRuntime()?.stateRef.current.canConvertImages;
  const imageOpportunity = Boolean(!images.done && images.review?.eligible.length && (images.snapshot?.estimatedSavings ?? 0) > 0);
  const imageAction = imageOpportunity && images.enabled && canEdit;
  const actions = [imageAction, check.recommended, upload > 0, findings.length > 0, notes.length > 0].filter(Boolean).length;
  const status = imageStatus(images, Boolean(session));
  const notice = checkNotice(status, audience, Boolean(images.done && session?.lastConversion));
  const noticeText = imageOpportunity && !canEdit && !notice ? "Moving embedded images requires edit access" : notice;
  return { ...overview, actions, notice: noticeText, findings, upload, status, audience };
}

function DiagnosticsOverview({ model }: ModelProps) {
  const { session, images, bytes, check, notes, actions, notice, findings, upload, status, audience } = useDiagnosticsOverview(model);
  return <div className="h-full w-full min-w-0 flex-1 overflow-y-auto bg-background px-3 py-5 sm:p-8">
    <div className="mx-auto max-w-3xl space-y-4">
      <OverviewHeader actions={actions} notice={notice} bytes={bytes} questions={model.stats.totalQuestions} />
      {upload > 0 && <p className="rounded-lg border p-4 text-sm"><strong>Review file storage.</strong> {upload} upload questions store files in submission JSON. Check their storage settings.</p>}
      {session && <EmbeddedImageCard session={session} controls={images} />}
      {findings.length > 0 && <Disclosure title={`Review personalization · ${findings.length} ${findings.length === 1 ? "finding" : "findings"}`}>
        <AudienceFindings findings={findings} actions={model} />
      </Disclosure>}
      {notes.length > 0 && <Disclosure title={`Review form structure · ${notes[0]}`}><ul className="list-inside list-disc text-sm">{notes.map(note => <li key={note}>{note}</li>)}</ul></Disclosure>}
      <ChoiceTool model={model} check={check} />
      <AllChecks model={model} images={status.label} audience={audience} />
    </div>
  </div>;
}

export function FormDiagnosticsView({ model }: Readonly<{ model?: FormDiagnosticsPlugin }>) {
  if (!model?.stats) return <p className="p-6 text-muted-foreground">Diagnostics unavailable. No definition to check.</p>;
  return <DiagnosticsOverview model={model} />;
}

export function FormDiagnosticsTab({ data }: Readonly<FormDiagnosticsTabProps>) {
  return <FormDiagnosticsView model={data instanceof FormDiagnosticsPlugin ? data : data?.model} />;
}

let isRegistered = false;
export function registerFormDiagnosticsTab() {
  if (isRegistered) return;
  ReactElementFactory.Instance.registerElement("svc-tab-form-diagnostics",
    (props: unknown) => <FormDiagnosticsTab {...(props as FormDiagnosticsTabProps)} />);
  isRegistered = true;
}

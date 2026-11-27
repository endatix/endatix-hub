"use client";

import { useCallback, useId, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { ReactElementFactory } from "survey-react-ui";
import { useOptionalDesignerRuntime } from "@/lib/designer-runtime";
import { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";
import { conversionSession } from "../conversion-session";
import { choiceListCheck } from "../diagnostic-recommendations";
import { choiceFinding, leadConversion, manualFindings, type Conversion, type Finding } from "../diagnostic-findings";
import { AudienceFindings, useAudienceFindings } from "./audience-findings";
import { ConvertLargeChoiceLists } from "./convert-large-choice-lists";
import { EmbeddedImageCard } from "./embedded-image-card";
import { useImageConversion } from "./use-image-conversion";
import { AllChecks, OverviewHeader, type CheckInputs, type CheckStatus } from "./diagnostic-checks";
import { FindingPanel } from "./finding-panel";
import { Button } from "@/components/ui/button";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "@/lib/survey-js";
import type { sizeChange } from "../definition-size";

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

function ChoiceTool({ model, check, allowed, lead }: ModelProps & { check: ReturnType<typeof choiceListCheck>; allowed: boolean; lead: boolean }) {
  const [change, setChange] = useState<ReturnType<typeof sizeChange> | null>(null);
  const finding = choiceFinding(check.count, check.bytes);
  if (!check.recommended) finding.title = "Optional: create a copy with data lists";
  const result = change && <span className="block"><strong className="block">Measured copy definition size</strong>{change.before.toLocaleString()} → {change.after.toLocaleString()} bytes ({change.percent.toFixed(1)}% {change.delta >= 0 ? "smaller" : "larger"}). The original form is unchanged.</span>;
  return <FindingPanel lead={lead} finding={finding} result={result} effect={allowed ? "Creates a copy" : "Needs create and edit access"} blocked={!allowed} cta="Review choice lists">
    {allowed ? <ConvertLargeChoiceLists model={model} onCopy={setChange} /> : <p>Creating the copy requires permission to create and edit forms. No changes are available here.</p>}
  </FindingPanel>;
}

type ImageState = ReturnType<typeof useImageConversion>;
type ImageCheck = { label: string; notice: string; status: CheckStatus };
function imageStatus(images: ImageState, session: ReturnType<typeof conversionSession>, editable: boolean): ImageCheck {
  if (!images.review) return session && !images.message
    ? { label: "Checking…", notice: "Checking embedded images…", status: "Pending" }
    : { label: "Not available", notice: "Some checks are unavailable", status: "Unavailable" };
  if (images.busy) return { label: "Uploading", notice: "Conversion in progress", status: "Pending" };
  if (images.retry || images.stale) return { label: "Review again", notice: "Conversion needs review", status: "Needs review" };
  if (images.done && session?.lastConversion) return { label: "Conversion applied · not saved", notice: "", status: "Pending" };
  if (images.done) return imageInventoryStatus({...images.review,eligible:[]},images.enabled,editable);
  return imageInventoryStatus(images.review, images.enabled, editable);
}

function imageInventoryStatus(review: NonNullable<ImageState["review"]>, enabled: boolean, editable: boolean): ImageCheck {
  if (review.eligible.length && !enabled) return { label: "Storage disabled", notice: "Image storage is unavailable", status: "Unavailable" };
  if (review.eligible.length && !editable) return { label: "Needs edit access", notice: "Moving embedded images requires edit access", status: "Unavailable" };
  if (review.skipped.length) return { label: `${review.skipped.length} skipped`, notice: "Some image placements need manual review", status: "Needs review" };
  if (review.eligible.length) return {label: `${review.eligible.length} placements`, notice: "", status: "Needs review"};
  return { label: "Checked · none embedded", notice: "", status: "OK" };
}

function useOverview(model: FormDiagnosticsPlugin) {
  const session = conversionSession(model.creator);
  const images = useImageConversion(session);
  const source = images.done ? model.creator.JSON : images.snapshot?.source;
  const isForm = Boolean(model.formId);
  const check = useMemo(() => choiceListCheck(source ?? model.creator.JSON ?? {}, isForm),
    [source, model, isForm]);
  const measured = images.done ? session?.measuredChange : undefined;
  const bytes = measured?.after ?? images.snapshot?.bytes ?? model.stats.uncompressedSize;
  const estimated = images.done ? 0 : Math.max(0, images.snapshot?.estimatedSavings ?? 0);
  // These signals can describe the same choice label. Do not subtract its bytes twice.
  const remaining = bytes - Math.max(estimated, check.recommended ? check.impact : 0);
  return { session, images, bytes, check, remaining };
}

function checkNotice(status: ReturnType<typeof imageStatus>, audience: ReturnType<typeof useAudienceCheck>, pendingSave: boolean) {
  if (pendingSave) return "Conversion ready to save";
  if (audience === "failed") return "Some checks are unavailable";
  if (audience === "checking") return "Checking personalization…";
  return status.notice;
}

function conversionCandidates(overview:ReturnType<typeof useOverview>, permissions:{canCopy:boolean; editable:boolean}) {
  const {images, check} = overview;
  const candidates: Conversion[] = [];
  if (images.review?.eligible.length || images.done) candidates.push({id:"images", runnable:permissions.editable && images.enabled, impact:images.snapshot?.estimatedSavings ?? 0});
  if (check.recommended) candidates.push({id:"choices", runnable:permissions.canCopy, impact:check.impact});
  return candidates;
}

function useDiagnosticsOverview(model: FormDiagnosticsPlugin) {
  const overview = useOverview(model);
  const { session, images, remaining } = overview;
  const findings = useAudienceFindings(model);
  const audience = useAudienceCheck(model);
  const runtime = useOptionalDesignerRuntime()?.stateRef.current;
  const canCopy = runtime?.canCreateListCopy === true;
  const pages = model.creator.survey?.pages.length ?? 0;
  const manual = manualFindings(model.stats, {remainingBytes:remaining, pages, audience:findings.length});
  const status = imageStatus(images, session, Boolean(runtime?.canConvertImages));
  const candidates = conversionCandidates(overview,{canCopy,editable:runtime?.canConvertImages === true});
  const lead = images.done || images.busy || images.retry ? "images" : leadConversion(candidates);
  const actions = candidates.length + manual.length + Number(!images.review?.eligible.length && Boolean(images.review?.skipped.length));
  const notice = checkNotice(status, audience, Boolean(images.done && session?.lastConversion));
  return { ...overview, actions, notice, findings, manual, lead, canCopy, status, pages, audience };
}

function ManualReview({ model, finding, children }: ModelProps & {finding: Finding; children?: ReactNode}) {
  const tabs = SURVEY_CREATOR_BUILT_IN_TAB;
  const tab = finding.id === "logic" ? tabs.logic : finding.id === "size" ? tabs.json : tabs.designer;
  return <FindingPanel finding={finding} cta={finding.id === "audience" ? "Review personalization" : "Review details"}>
    {children ?? <><ManualLocations model={model} id={finding.id} /><p className="text-sm">Nothing is changed automatically. Inspect the relevant settings in the editor.</p>
      {model.creator.tabs.some(item => item.id === tab) && <Button variant="outline" onClick={() => {model.creator.activeTab = tab;}}>Open {tab === tabs.json ? "JSON Editor" : tab === tabs.logic ? "Logic" : "Designer"}</Button>}</>}
  </FindingPanel>;
}

function ManualLocations({model,id}: ModelProps & {id:string}) {
  const survey = model.creator.survey;
  if (id === "length") return <ul className="max-h-48 overflow-auto text-sm">{survey.pages.map(page =>
    <li key={page.name}>{page.name} · {page.questions.length} questions</li>)}</ul>;
  if (id !== "files") return null;
  const files = survey.getAllQuestions().filter(q => q.getType() === "file" && q.getPropertyValue("storeDataAsText") !== false);
  return <ul className="max-h-48 overflow-auto text-sm">{files.map(q =>
    <li key={q.name}>{q.page?.name} › {q.name} · stores files in the submission</li>)}</ul>;
}

function findingPanels(model: FormDiagnosticsPlugin, overview: ReturnType<typeof useDiagnosticsOverview>) {
  const {session,images,check,findings,manual,lead,canCopy} = overview;
  const panels = [];
  if (session && (images.message || images.review?.eligible.length || images.review?.skipped.length))
    panels.push({id:"images", node:<EmbeddedImageCard session={session} controls={images} lead={lead === "images"} />});
  if (check.recommended) panels.push({id:"choices",node:<ChoiceTool model={model} check={check} allowed={canCopy} lead={lead === "choices"} />});
  for (const finding of manual) panels.push({id:finding.id,node:<ManualReview model={model} finding={finding}>
    {finding.id === "audience" ? <AudienceFindings findings={findings} actions={model} /> : undefined}</ManualReview>});
  return panels.sort((a,b) => Number(b.id === lead) - Number(a.id === lead));
}
function DiagnosticsOverview({ model }: ModelProps) {
  const overview = useDiagnosticsOverview(model);
  const {bytes,check,actions,notice,lead,canCopy,status,audience,pages} = overview;
  const panels = findingPanels(model, overview);
  const optional = !check.recommended && check.count > 0 ? <ChoiceTool model={model} check={check} allowed={canCopy} lead={false} /> : undefined;
  const image: CheckInputs["image"] = ["Embedded images", status.label, status.status];
  return <div className="h-full w-full min-w-0 flex-1 overflow-y-auto bg-background px-3 py-5 sm:p-8">
    <div className="mx-auto max-w-3xl space-y-4">
      <OverviewHeader actions={actions} notice={notice} bytes={bytes} questions={model.stats.totalQuestions} />
      {panels.map(({id,node}, index) => <div key={id} className={id !== lead && index > Number(Boolean(lead)) ? "!mt-0" : ""}>
        {id !== lead && index === Number(Boolean(lead)) && <h3 className="mb-2 text-sm font-semibold">{lead ? "Also worth a look" : "Review findings and options"}</h3>}
        <div className={id === lead ? "" : compactRowClass(index - Number(Boolean(lead)), index === panels.length - 1)}>{node}</div>
      </div>)}
      <AllChecks model={model} image={image} audience={audience} pages={pages} bytes={bytes} choices={check} healthy={!actions && !notice} optional={optional} />
    </div>
  </div>;
}

function compactRowClass(index:number, last:boolean) {
  const top = index === 0 ? "rounded-t-lg border-t" : "";
  return `border-x border-b bg-card ${top} ${last ? "rounded-b-lg" : ""}`;
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

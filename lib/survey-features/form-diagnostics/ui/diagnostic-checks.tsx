import { useState } from "react";
import { Activity, CheckCircle2, ChevronRight } from "lucide-react";
import type { FormDiagnosticsPlugin, AudienceCheck } from "../form-diagnostics-plugin";
import { formatBytes } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import type { choiceListCheck } from "../diagnostic-recommendations";

const audienceLabels: Record<AudienceCheck, string> = {
  unavailable: "Not available", failed: "Could not complete check", checking: "Checking…", checked: "Checked",
};
export type CheckStatus = "OK" | "Needs review" | "Unavailable" | "Pending" | "Setting";
type Check = [string, string, CheckStatus];
export type CheckInputs = { model: FormDiagnosticsPlugin; image: Check; audience: AudienceCheck; bytes: number; pages: number; choices: ReturnType<typeof choiceListCheck> };
const audited = (flagged: boolean): CheckStatus => flagged ? "Needs review" : "OK";
function audienceStatus(model: FormDiagnosticsPlugin, audience: AudienceCheck): CheckStatus {
  if (audience === "checking") return "Pending";
  if (audience !== "checked") return "Unavailable";
  return audited(model.audienceFindings.length > 0);
}
function checkRows({model, image, audience, bytes, pages, choices}: CheckInputs): Check[] {
  const s = model.stats;
  return [
    ["Form definition size", formatBytes(bytes), audited(bytes > 1024 * 1024)],
    image,
    ["Questions", `${s.totalQuestions.toLocaleString()} on ${pages} pages`, audited(s.totalQuestions > 100)],
    ["Logic conditions", `${s.logicConditionsCount.toLocaleString()} · ${s.invisibleLogicItemsCount} invisible`, audited(s.logicConditionsCount > 50)],
    ["Choice lists", `${s.dropdownCount} dropdowns · largest dropdown ${s.maxDropdownChoicesCount} choices · ${s.totalChoicesJsonSize.toLocaleString()} inline characters (largest ${s.maxChoicesJsonSize.toLocaleString()})`, audited(choices.recommended)],
    ["File uploads", `${s.fileUploadCount} questions · ${s.fileUploadWithoutBlobCount} store answers inline`, audited(s.fileUploadWithoutBlobCount > 0)],
    ["Personalization", audienceLabels[audience], audienceStatus(model, audience)],
    ["Form access", model.isPublic === undefined ? "Not available" : model.isPublic ? "Public" : "Private", "Setting"],
    ["reCAPTCHA", model.requiresReCaptcha ? "Enabled" : "Disabled", "Setting"],
  ];
}
const variants = { OK: "success", "Needs review": "warning", Unavailable: "secondary", Pending: "info", Setting: "outline" } as const;
export function AllChecks({healthy, optional, ...inputs}: Readonly<CheckInputs & {healthy: boolean; optional?: React.ReactNode}>) {
  const [choice, setChoice] = useState<boolean>();
  const rows = checkRows(inputs);
  const open = choice ?? healthy;
  return <section className="rounded-lg border bg-card p-4">
    <button type="button" aria-expanded={open} onClick={() => setChoice(!open)} className="flex w-full flex-wrap items-center gap-2 text-left">
      <ChevronRight className={`size-4 ${open ? "rotate-90" : ""}`} aria-hidden="true" />
      <strong className="mr-auto">All checks and settings</strong>
      {(Object.keys(variants) as CheckStatus[]).map(status => {
        const total = rows.filter(row => row[2] === status).length;
        return total > 0 && <Badge key={status} variant={variants[status]}>{total} {status === "Setting" ? "settings" : status}</Badge>;
      })}
    </button>
    {open && <><dl className="mt-3 divide-y text-sm">{rows.map(([label,value,status]) =>
      <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-2">
        <dt className="font-medium">{label}</dt><dd className="flex flex-wrap items-center gap-2 text-muted-foreground">{value}<Badge variant={variants[status]}>{status}</Badge></dd>
      </div>)}</dl><p className="mt-2 text-xs text-muted-foreground">Settings describe the configuration; they are not failures.</p></>}
    <div hidden={!open}>{optional}</div>
  </section>;
}

function overviewTitle(actions: number, notice: string) {
  if (notice === "Conversion ready to save") return notice;
  if (!actions) return notice || "No action needed";
  return `${actions} ${actions === 1 ? "thing" : "things"} worth reviewing`;
}
export function OverviewHeader({ actions, notice, bytes, questions }: Readonly<{
  actions: number; notice: string; bytes: number; questions: number;
}>) {
  const status = overviewTitle(actions, notice);
  const Icon = !actions && !notice ? CheckCircle2 : Activity;
  return <header className="space-y-2 border-b pb-5">
    <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Icon aria-hidden="true" className="size-4" /> Diagnostics</p>
    <h2 className="text-2xl font-semibold tracking-tight">{status}</h2>
    {actions > 0 && notice && status !== notice && <p className="text-sm">{notice}</p>}
    <p className="text-sm text-muted-foreground">{formatBytes(bytes)} definition · {questions} {questions === 1 ? "question" : "questions"}</p>
    <p className="text-xs text-muted-foreground">Checks cover size, questions, logic, choices, images, files, personalization and access. They do not certify performance or security.</p>
  </header>;
}

import { useState, type ReactNode } from "react";
import { Activity, CheckCircle2, ChevronRight } from "lucide-react";
import type { FormDiagnosticsPlugin, AudienceCheck } from "../form-diagnostics-plugin";
import { formatBytes } from "@/lib/utils/formatters";

export function Disclosure({ title, children, onInspect }: Readonly<{ title: string; children: ReactNode; onInspect?: () => void }>) {
  const [visited, setVisited] = useState(false);
  function inspect() { setVisited(true); onInspect?.(); }
  return <details className="rounded-lg border bg-card">
    <summary onClick={inspect} className="group flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium focus-visible:outline-ring">
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-90" />
      {title}
    </summary>
    {visited && <div className="space-y-3 px-4 pb-4">{children}</div>}
  </details>;
}

const audienceLabels: Record<AudienceCheck, string> = {
  unavailable: "Not available", failed: "Could not complete check", checking: "Checking…", checked: "Checked",
};
function checkRows(model: FormDiagnosticsPlugin, images: string, audience: AudienceCheck) {
  const s = model.stats;
  return [
    ["Embedded images", images],
    ["Personalization", audienceLabels[audience]],
    ["Questions", `${s.totalQuestions} · ${s.totalQuestions > 100 ? "Review length" : "Within threshold"}`],
    ["Logic conditions", `${s.logicConditionsCount} · ${s.invisibleLogicItemsCount} invisible`],
    ["Dropdowns", `${s.dropdownCount} · largest list ${s.maxDropdownChoicesCount} choices`],
    ["Inline choice data", `${s.totalChoicesJsonSize.toLocaleString()} characters · largest ${s.maxChoicesJsonSize.toLocaleString()}`],
    ["File uploads", `${s.fileUploadCount} questions · ${s.fileUploadWithoutBlobCount} store answers inline`],
    ["Form access", model.isPublic === undefined ? "Not available" : model.isPublic ? "Public" : "Private"],
    ["reCAPTCHA setting", model.requiresReCaptcha ? "Enabled" : "Disabled"],
  ];
}
export function AllChecks({ model, images, audience, children }: Readonly<{
  model: FormDiagnosticsPlugin; images: string; audience: AudienceCheck; children?: ReactNode;
}>) {
  return <Disclosure title="All checks and settings">
    <dl className="divide-y text-sm">{checkRows(model, images, audience).map(([label,value]) =>
      <div key={label} className="flex flex-wrap justify-between gap-x-4 py-2">
        <dt>{label}</dt><dd className="text-muted-foreground">{value}</dd>
      </div>)}</dl>
    {children}
  </Disclosure>;
}

export function OverviewHeader({ actions, notice, bytes, questions }: Readonly<{
  actions: number; notice: string; bytes: number; questions: number;
}>) {
  const status = actions ? `${actions} ${actions === 1 ? "recommendation" : "recommendations"}`
    : notice || "No actions recommended";
  const Icon = !actions && !notice ? CheckCircle2 : Activity;
  return <header className="space-y-2 border-b pb-5">
    <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Icon aria-hidden="true" className="size-4" /> Diagnostics</p>
    <h2 className="text-2xl font-semibold tracking-tight">{status}</h2>
    {actions > 0 && notice && <p className="text-sm">{notice}</p>}
    <p className="text-sm text-muted-foreground">{formatBytes(bytes)} definition · {questions} {questions === 1 ? "question" : "questions"}</p>
  </header>;
}

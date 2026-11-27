import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Benefit, Finding } from "../diagnostic-findings";

export function BenefitSummary({ benefit, blocked, prominent }: Readonly<{ benefit: Benefit; blocked?: boolean; prominent?: boolean }>) {
  return <div className={prominent ? "min-w-0 rounded-md bg-primary/5 p-3" : "min-w-0"}>
    <p className="text-xs font-medium text-muted-foreground">{blocked ? "Benefit if converted" : "Expected benefit"} · {benefit.basis}</p>
    <p className={prominent ? "text-xl font-semibold tracking-tight" : "text-sm font-semibold"}>{benefit.headline}</p>
    <p className="text-sm text-muted-foreground">{benefit.explanation}</p>
  </div>;
}

export function ReviewHeading({ children }: Readonly<{children: ReactNode}>) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <h4 ref={ref} tabIndex={-1} className="rounded-sm font-semibold focus-visible:outline-ring">{children}</h4>;
}

function FindingLabel({lead,blocked,effect}: Readonly<{lead?: boolean; blocked?: boolean; effect:string}>) {
  return <div className="flex flex-wrap items-center gap-2">
    {lead && <strong className="text-xs">{blocked ? "Review first" : "Recommended first"}</strong>}
    <Badge variant={effect === "Creates a copy" ? "warning" : "secondary"}>{effect}</Badge>
  </div>;
}

function CompactSummary({finding,effect,blocked,result}: Readonly<{finding:Finding; effect:string; blocked?:boolean; result?:ReactNode}>) {
  return <>
    <span className="flex flex-wrap items-center justify-between gap-2"><strong>{finding.title}</strong><Badge variant="secondary">{effect}</Badge></span>
    <span className="block text-xs text-muted-foreground">{finding.evidence}</span>
    {result ?? <span className="block text-sm"><span className="text-muted-foreground">{blocked ? "Benefit if converted" : "Expected benefit"} · </span>
      <strong>{finding.benefit.headline}</strong> · {finding.benefit.basis}</span>}
    <span className="block text-sm text-muted-foreground">{finding.consequence}</span>
  </>;
}

type PanelProps = Readonly<{
  finding: Finding; lead?: boolean; effect?: string; blocked?: boolean; cta: string; children: ReactNode; result?: ReactNode;
}>;
type Toggle = {id:string; expanded:boolean; toggle:()=>void};

function PanelSummary({props, disclosure}: {props:PanelProps; disclosure:Toggle}) {
  const {finding,lead,blocked,effect="Review by hand",cta,result} = props;
  const {expanded,toggle,id} = disclosure;
  if (!lead) return (
    <button type="button" aria-label={cta} onClick={toggle} aria-expanded={expanded} aria-controls={id} className="w-full space-y-1 rounded-md text-left focus-visible:outline-ring">
      <CompactSummary finding={finding} effect={effect} blocked={blocked} result={result} />
      <span className="text-xs font-medium text-primary">{expanded ? "Hide details" : cta} ›</span>
    </button>);
  const primary = !blocked;
  return <>
    <FindingLabel lead={lead} blocked={blocked} effect={effect} />
    <div className={primary ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>
      <div><h3 className="font-semibold">{finding.title}</h3><p className="text-sm">{finding.consequence}</p></div>
      {result ?? <BenefitSummary benefit={finding.benefit} blocked={blocked} prominent={primary} />}
    </div>
    <p className="text-xs text-muted-foreground">{finding.evidence}</p>
    <Button size="sm" variant={primary ? "default" : "outline"} aria-controls={id} aria-expanded={expanded} onClick={toggle}>{expanded ? "Hide details" : cta}</Button>
  </>;
}

export function FindingPanel(props: PanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [visited, setVisited] = useState(false);
  const id = useId();
  const toggle = () => { setVisited(true); setExpanded(!expanded); };
  const {lead, finding, result, blocked, cta, children} = props;
  return <section aria-label={finding.title} className={lead ? "space-y-3 rounded-lg border-2 border-primary/35 bg-card p-5" : "space-y-2 p-3"}>
    <PanelSummary props={props} disclosure={{expanded,toggle,id}} />
    <div id={id} hidden={!expanded} className="space-y-3">{expanded && <ReviewHeading>{blocked ? "Review details" : cta}</ReviewHeading>}
      {expanded && !result && !lead && <p className="text-sm text-muted-foreground">{finding.benefit.explanation}</p>}{visited && children}</div>
  </section>;
}

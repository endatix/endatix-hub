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

export function FindingPanel({ finding, lead, effect = "Review by hand", blocked, cta, children, result }: Readonly<{
  finding: Finding; lead?: boolean; effect?: string; blocked?: boolean; cta: string; children: ReactNode; result?: ReactNode;
}>) {
  const [expanded, setExpanded] = useState(false);
  const [visited, setVisited] = useState(false);
  const id = useId();
  const toggle = () => { setVisited(true); setExpanded(!expanded); };
  return <section aria-label={finding.title} className={lead ? "space-y-3 rounded-lg border-2 border-primary/35 bg-card p-5" : "space-y-2 border-b p-4 last:border-b-0"}>
    <div className="flex flex-wrap items-center gap-2">{lead && <strong className="text-xs">{blocked ? "Review first" : "Recommended first"}</strong>}
      <Badge variant={effect === "Creates a copy" ? "warning" : "secondary"}>{effect}</Badge></div>
    <div className={lead && !blocked ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>
      <div><h3 className="font-semibold">{finding.title}</h3><p className="text-sm">{finding.consequence}</p></div>
      {result ?? <BenefitSummary benefit={finding.benefit} blocked={blocked} prominent={lead && !blocked} />}
    </div>
    <p className="text-xs text-muted-foreground">{finding.evidence}</p>
    <Button size="sm" variant={lead && !blocked ? "default" : "outline"} aria-controls={id} aria-expanded={expanded} onClick={toggle}>{expanded ? "Hide details" : cta}</Button>
    <div id={id} hidden={!expanded} className="space-y-3">{expanded && <ReviewHeading>{blocked ? "Review details" : cta}</ReviewHeading>}{visited && children}</div>
  </section>;
}

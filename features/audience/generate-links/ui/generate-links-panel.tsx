"use client";

import { Info, Link2, Users } from "lucide-react";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  useGenerateLinks,
  type GenerateLinks,
  type GenerateLinksSetup,
} from "../use-generate-links.hook";
import { LinksOutcome } from "./links-outcome";

const TRIGGER = (
  <Button variant="outline">
    <Link2 />
    Personalized links
  </Button>
);

const PANEL = {
  desktopType: "complex",
  trigger: TRIGGER,
  title: "Personalized links",
  errorTitle: "Links not created",
  pendingLabel: "Generating…",
} as const;

function RecipientsSection({ totalPeople }: Readonly<GenerateLinksSetup>) {
  const description =
    totalPeople === 0
      ? "This form has no participants yet. Add or import participants first."
      : "Every participant on this form who has no link yet. Participants who already have one keep it.";
  return (
    <PanelSection
      icon={Users}
      title="Who gets a link"
      description={description}
    >
      <dl className="grid gap-3">
        <SummaryRow
          label="Participants on this form"
          value={totalPeople.toLocaleString()}
        />
      </dl>
    </PanelSection>
  );
}

/** The consequence, once: the file is the only copy of the links (DESIGN.md §6). */
function OnlyCopyNote() {
  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>The file is the only copy</AlertTitle>
      <AlertDescription>
        Each link is shown once, when it is made, and downloads as a CSV. Anyone
        with a link can open that participant&apos;s response, so keep the file
        safe. A response starts when its link is first opened, with the form and
        that participant&apos;s values as they are then.
      </AlertDescription>
    </Alert>
  );
}

function describeStep({ batch }: GenerateLinks): string {
  if (!batch)
    return "One link per participant, each opening that participant's own response.";
  return batch.links.length > 0
    ? "The links are ready to send from your own email or panel tool."
    : "Nothing new to send: no one on this form is without a link.";
}

function stepProps(run: GenerateLinks, setup: GenerateLinksSetup) {
  const done = run.batch !== null;
  return {
    open: run.open,
    onOpenChange: run.openChange,
    pending: run.pending,
    error: run.error,
    description: describeStep(run),
    submitLabel: done ? "Done" : "Generate and download",
    submitDisabled: !done && setup.totalPeople === 0,
    cancelable: !done,
    onSubmit: done ? () => run.openChange(false) : run.generate,
  };
}

/**
 * Personalized links (DESIGN.md §6 Configure and run, Hand over a file): who gets one, the
 * consequence, then the file saved at once and the outcome in place.
 */
export function GenerateLinksPanel(setup: Readonly<GenerateLinksSetup>) {
  const run = useGenerateLinks(setup);
  return (
    <PanelForm {...PANEL} {...stepProps(run, setup)}>
      {run.batch ? (
        <LinksOutcome run={run} batch={run.batch} setup={setup} />
      ) : (
        <>
          <RecipientsSection {...setup} />
          <OnlyCopyNote />
        </>
      )}
    </PanelForm>
  );
}

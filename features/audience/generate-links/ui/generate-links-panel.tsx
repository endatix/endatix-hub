"use client";

import { Info, Link2, TriangleAlert, Users } from "lucide-react";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AudienceLinksPreview } from "@/lib/endatix-api/audience/types";
import {
  useGenerateLinks,
  type GenerateLinks,
  type GenerateLinksSetup,
} from "../use-generate-links.hook";
import {
  blocksGenerate,
  type LinksPreviewState,
} from "../use-links-preview.hook";
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

type RecipientsProps = GenerateLinksSetup & { preview: LinksPreviewState };

/** Search, when there is one, and the preview answers: an older API ignores it. */
const isSearching = ({ search, preview }: RecipientsProps) =>
  search.trim() !== "" && preview.kind !== "older";

function recipientsDescription(props: RecipientsProps): string {
  if (isSearching(props))
    return `Participants whose identifier contains "${props.search.trim()}" and who have no link yet. Test participants, and participants who already have a link, are left out.`;
  return props.totalPeople === 0
    ? "This form has no participants yet. Add or import participants first."
    : "Every participant on this form who has no link yet. Participants who already have one keep it.";
}

/** "{withoutLink} of {matching} matching participants get a new link", from the preview. */
function linksCount(preview: AudienceLinksPreview, searching: boolean) {
  const who = searching ? "matching participants" : "participants";
  return `${preview.withoutLink.toLocaleString()} of ${preview.matching.toLocaleString()} ${who} get a new link`;
}

function OverCap({ withoutLink, cap }: Readonly<AudienceLinksPreview>) {
  return (
    <Alert variant="warning">
      <TriangleAlert />
      <AlertTitle>Too many links for one batch</AlertTitle>
      <AlertDescription>
        {withoutLink.toLocaleString()} participants would get a link; the limit
        is {cap.toLocaleString()} per batch. Search for fewer participants.
      </AlertDescription>
    </Alert>
  );
}

/** An API before link batches sends a link to everyone; said only when a search is on. */
function OlderApiNote() {
  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>
        Sending links to a filtered set needs a newer Endatix API
      </AlertTitle>
      <AlertDescription>
        Generate gives a link to every participant on this form who has none,
        whatever the search.
      </AlertDescription>
    </Alert>
  );
}

function RecipientsCount(props: Readonly<RecipientsProps>) {
  const { preview } = props;
  if (preview.kind === "loading")
    return <Skeleton className="h-5 w-64" aria-label="Counting participants" />;
  if (preview.kind === "ready")
    return (
      <p className="text-sm font-medium">
        {linksCount(preview.preview, isSearching(props))}
      </p>
    );
  return (
    <dl className="grid gap-3">
      <SummaryRow
        label="Participants on this form"
        value={props.totalPeople.toLocaleString()}
      />
    </dl>
  );
}

function RecipientsSection(props: Readonly<RecipientsProps>) {
  const { preview, search } = props;
  return (
    <PanelSection
      icon={Users}
      title="Who gets a link"
      description={recipientsDescription(props)}
    >
      <div className="grid gap-3">
        <RecipientsCount {...props} />
        {preview.kind === "ready" &&
        preview.preview.withoutLink > preview.preview.cap ? (
          <OverCap {...preview.preview} />
        ) : null}
        {preview.kind === "older" && search.trim() ? <OlderApiNote /> : null}
      </div>
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
    : "Nothing new to send: everyone it was for already has a link.";
}

/** Nothing to generate yet: no one on the form, the count still loading, none or too many to send. */
function waitsToGenerate(run: GenerateLinks, setup: GenerateLinksSetup) {
  if (blocksGenerate(run.preview)) return true;
  return run.preview.kind !== "ready" && setup.totalPeople === 0;
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
    submitDisabled: !done && waitsToGenerate(run, setup),
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
          <RecipientsSection {...setup} preview={run.preview} />
          <OnlyCopyNote />
        </>
      )}
    </PanelForm>
  );
}

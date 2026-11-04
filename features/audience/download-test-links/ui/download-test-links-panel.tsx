"use client";

import { Download, Link2, Users } from "lucide-react";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSection } from "@/components/common/panel-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TestLinkExpirySelect } from "../../ui/test-link-expiry-select";
import { TestLinkRunsSelect } from "../../ui/test-link-runs-select";
import {
  useDownloadTestLinks,
  type DownloadTestLinks,
  type DownloadTestLinksSetup,
  type TestLinksScope,
} from "../use-download-test-links.hook";
import { TestLinksDownloaded, TestLinksTotal } from "./test-links-notes";

const TRIGGER = (
  <Button variant="outline">
    <Download />
    Download test links
  </Button>
);

const PANEL = {
  desktopType: "complex",
  trigger: TRIGGER,
  title: "Download test links",
  errorTitle: "Test links not created",
  pendingLabel: "Creating…",
} as const;

const RUNS_ID = "test-links-runs";
const EXPIRY_ID = "test-links-expiry";

type StepProps = { run: DownloadTestLinks; setup: DownloadTestLinksSetup };

type ScopeOption = { value: TestLinksScope; label: string; count: number };

const scopeOptions = (setup: DownloadTestLinksSetup): ScopeOption[] => [
  {
    value: "all",
    label: "All test participants",
    count: setup.testParticipants,
  },
  { value: "selected", label: "Selected", count: setup.selectedIds.length },
];

function ScopeItem({ value, label, count }: Readonly<ScopeOption>) {
  const id = `test-links-${value}`;
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} disabled={count === 0} />
      <Label htmlFor={id} className="font-normal">
        {label} ({count.toLocaleString()})
      </Label>
    </div>
  );
}

const scopeDescription = (setup: DownloadTestLinksSetup) =>
  setup.selectedIds.length > 0
    ? "Starts on the test participants ticked in the list."
    : "Test participants only. Tick some in the list to download theirs.";

function ScopeChoice({ run, setup }: Readonly<StepProps>) {
  const choose = (scope: string) =>
    run.choose({ scope: scope as TestLinksScope });
  const { scope } = run.choices;
  return (
    <RadioGroup value={scope} onValueChange={choose} className="gap-2">
      {scopeOptions(setup).map((option) => (
        <ScopeItem key={option.value} {...option} />
      ))}
    </RadioGroup>
  );
}

function ParticipantsSection(props: Readonly<StepProps>) {
  const description = scopeDescription(props.setup);
  return (
    <PanelSection icon={Users} title="Participants" description={description}>
      <ScopeChoice {...props} />
    </PanelSection>
  );
}

const LINKS_DESCRIPTION = "Each run is a new test submission.";

function LinksSection({ run }: Readonly<Pick<StepProps, "run">>) {
  const { runsEach, expiryMinutes } = run.choices;
  const setRuns = (n: number) => run.choose({ runsEach: n });
  const setExpiry = (m: number) => run.choose({ expiryMinutes: m });
  return (
    <PanelSection icon={Link2} title="Links" description={LINKS_DESCRIPTION}>
      <div className="flex flex-col gap-3">
        <TestLinkRunsSelect id={RUNS_ID} value={runsEach} onChange={setRuns} />
        <TestLinkExpirySelect
          id={EXPIRY_ID}
          value={expiryMinutes}
          onChange={setExpiry}
        />
      </div>
    </PanelSection>
  );
}

function stepProps(run: DownloadTestLinks) {
  const done = run.batch !== null;
  return {
    open: run.open,
    onOpenChange: run.openChange,
    pending: run.pending,
    error: run.error,
    description: done
      ? "Send the links from your own email or chat tool."
      : "Links that each open a new test submission as a test participant.",
    submitLabel: done ? "Done" : "Download",
    submitDisabled: !done && (run.total === 0 || run.overLimit),
    cancelable: !done,
    onSubmit: done ? () => run.openChange(false) : run.download,
  };
}

/**
 * Download test links (DESIGN.md §6 Configure and run, Hand over a file): who, how many runs and
 * how long, then the file saved at once and the outcome in place.
 */
export function DownloadTestLinksPanel(
  setup: Readonly<DownloadTestLinksSetup>,
) {
  const run = useDownloadTestLinks(setup);
  if (run.batch) {
    return (
      <PanelForm {...PANEL} {...stepProps(run)}>
        <TestLinksDownloaded run={run} batch={run.batch} />
      </PanelForm>
    );
  }
  return (
    <PanelForm {...PANEL} {...stepProps(run)}>
      <ParticipantsSection run={run} setup={setup} />
      <LinksSection run={run} />
      <TestLinksTotal run={run} />
    </PanelForm>
  );
}

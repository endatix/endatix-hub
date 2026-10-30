"use client";

import { CircleCheckBig, Download, Info, Users } from "lucide-react";
import { DownloadMenu } from "@/components/common/download-menu";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSection } from "@/components/common/panel-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ExpirySelect } from "../../copy-test-link/ui/expiry-select";
import { MAX_TEST_LINKS } from "../test-links-file";
import {
  useDownloadTestLinks,
  type DownloadTestLinks,
  type DownloadTestLinksSetup,
  type TestLinksBatch,
  type TestLinksScope,
} from "../use-download-test-links.hook";

const TRIGGER = (
  <Button variant="outline">
    <Download />
    Download test links
  </Button>
);

const PANEL = {
  desktopType: "simple",
  trigger: TRIGGER,
  title: "Download test links",
  errorTitle: "Test links not created",
  pendingLabel: "Creating…",
} as const;

const RUNS_ID = "test-links-runs";
const EXPIRY_ID = "test-links-expiry";
const MAX_RUNS = 10;

const linkCount = (count: number) =>
  count === 1 ? "1 link" : `${count.toLocaleString()} links`;

type StepProps = { run: DownloadTestLinks; setup: DownloadTestLinksSetup };

type ScopeOption = { value: TestLinksScope; label: string; count: number };

function scopeOptions(setup: DownloadTestLinksSetup): ScopeOption[] {
  return [
    {
      value: "all",
      label: "All test participants",
      count: setup.testParticipants,
    },
    { value: "selected", label: "Selected", count: setup.selectedIds.length },
  ];
}

function ScopeChoice({ run, setup }: Readonly<StepProps>) {
  return (
    <RadioGroup
      value={run.choices.scope}
      onValueChange={(scope) => run.choose({ scope: scope as TestLinksScope })}
      className="gap-2"
    >
      {scopeOptions(setup).map(({ value, label, count }) => (
        <div key={value} className="flex items-center gap-2">
          <RadioGroupItem
            id={`test-links-${value}`}
            value={value}
            disabled={count === 0}
          />
          <Label htmlFor={`test-links-${value}`} className="font-normal">
            {label} ({count.toLocaleString()})
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

const toRuns = (value: string) =>
  Math.min(MAX_RUNS, Math.max(1, Math.floor(Number(value)) || 1));

function RunsInput({ run }: Readonly<Pick<StepProps, "run">>) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
      <Label htmlFor={RUNS_ID} className="text-sm font-medium">
        Runs per participant
      </Label>
      <Input
        id={RUNS_ID}
        type="number"
        min={1}
        max={MAX_RUNS}
        value={run.choices.runsEach}
        onChange={(e) => run.choose({ runsEach: toRuns(e.target.value) })}
        className="h-9 w-full sm:w-40"
      />
    </div>
  );
}

/** How many links one download makes; above the API's limit, nothing can be asked for. */
function TotalNote({ run }: Readonly<Pick<StepProps, "run">>) {
  if (run.overLimit) {
    return (
      <Alert variant="warning">
        <Info />
        <AlertTitle>{linkCount(run.total)}: too many at once</AlertTitle>
        <AlertDescription>
          One download makes at most {MAX_TEST_LINKS} links. Choose fewer runs,
          or select fewer participants.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>{linkCount(run.total)}</AlertTitle>
      <AlertDescription>
        Each link opens one new test submission without a login, also on a
        private form. Anyone with the file can fill them in, so keep it safe.
      </AlertDescription>
    </Alert>
  );
}

function Choices(props: Readonly<StepProps>) {
  return (
    <>
      <PanelSection
        icon={Users}
        title="Who gets test links"
        description="Test participants only. Their test submissions stay out of exports."
      >
        <ScopeChoice {...props} />
      </PanelSection>
      <div className="flex flex-col gap-3">
        <RunsInput run={props.run} />
        <ExpirySelect
          id={EXPIRY_ID}
          value={props.run.choices.expiryMinutes}
          onChange={(expiryMinutes) => props.run.choose({ expiryMinutes })}
        />
      </div>
      <TotalNote run={props.run} />
    </>
  );
}

type DownloadedProps = { run: DownloadTestLinks; batch: TestLinksBatch };

/** What was produced, then a way to save the file again while the panel is open. */
function Downloaded({ run, batch }: Readonly<DownloadedProps>) {
  const formats = [{ kind: "csv" as const, onSelect: run.downloadAgain }];
  const count = batch.links.length;
  return (
    <div className="grid gap-3">
      <Alert variant="success">
        <CircleCheckBig />
        <AlertTitle>
          {count === 1 ? "1 test link" : `${count.toLocaleString()} test links`}{" "}
          downloaded
        </AlertTitle>
        <AlertDescription>
          {batch.fileName} has one row per run: the identifier, the run and the
          link. Downloading again from here saves the same links.
        </AlertDescription>
      </Alert>
      <div>
        <DownloadMenu pending={false} formats={formats} />
      </div>
    </div>
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
  return (
    <PanelForm {...PANEL} {...stepProps(run)}>
      {run.batch ? (
        <Downloaded run={run} batch={run.batch} />
      ) : (
        <Choices run={run} setup={setup} />
      )}
    </PanelForm>
  );
}

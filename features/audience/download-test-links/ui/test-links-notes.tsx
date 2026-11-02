"use client";

import { CircleCheckBig, Info } from "lucide-react";
import { DownloadMenu } from "@/components/common/download-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MAX_TEST_LINKS } from "../../shared/test-link-limits";
import type {
  DownloadTestLinks,
  TestLinksBatch,
} from "../use-download-test-links.hook";

const linkCount = (count: number) =>
  count === 1 ? "1 link" : `${count.toLocaleString()} links`;

type RunProps = Readonly<{ run: DownloadTestLinks }>;

function OverLimit({ run }: RunProps) {
  return (
    <Alert variant="warning">
      <Info />
      <AlertTitle>{linkCount(run.total)}: too many at once</AlertTitle>
      <AlertDescription>
        One download makes at most {MAX_TEST_LINKS} links. Choose fewer runs, or
        tick fewer participants.
      </AlertDescription>
    </Alert>
  );
}

/** How many links one download makes, and the consequence once (DESIGN.md §6 Hand over a file). */
export function TestLinksTotal({ run }: RunProps) {
  if (run.overLimit) return <OverLimit run={run} />;
  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>{linkCount(run.total)}</AlertTitle>
      <AlertDescription>
        Each link opens one new test submission without a login, also on a
        private form. The file is the only copy of the links, and anyone with it
        can fill them in, so keep it safe.
      </AlertDescription>
    </Alert>
  );
}

type DownloadedProps = Readonly<{
  run: DownloadTestLinks;
  batch: TestLinksBatch;
}>;

const testLinkCount = (count: number) =>
  count === 1 ? "1 test link" : `${count.toLocaleString()} test links`;

const downloadedTitle = (count: number) => `${testLinkCount(count)} downloaded`;

/** What was produced, then a way to save the same file again while the panel is open. */
export function TestLinksDownloaded({ run, batch }: DownloadedProps) {
  const formats = [{ kind: "csv" as const, onSelect: run.downloadAgain }];
  return (
    <div className="grid gap-3">
      <Alert variant="success">
        <CircleCheckBig />
        <AlertTitle>{downloadedTitle(batch.links.length)}</AlertTitle>
        <AlertDescription>
          {batch.fileName} has one row per run: the identifier, the run and the
          link. It is the only copy, so keep it until the links are sent.
        </AlertDescription>
      </Alert>
      <div>
        <DownloadMenu pending={false} formats={formats} />
      </div>
    </div>
  );
}

"use client";

import { CircleCheckBig, Info, Link2 } from "lucide-react";
import { DownloadMenu } from "@/components/common/download-menu";
import { PanelSection } from "@/components/common/panel-section";
import CopyToClipboard from "@/components/copy-to-clipboard";
import {
  StaticDataTable,
  StaticDataTableRow,
  dataTableCell,
} from "@/components/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { identifierKindLabel } from "../../utils";
import { personalLinkUrl, type PersonalLink } from "../personal-links";
import type {
  GenerateLinks,
  GenerateLinksSetup,
  LinksBatch,
} from "../use-generate-links.hook";

type OutcomeProps = {
  run: GenerateLinks;
  batch: LinksBatch;
  setup: GenerateLinksSetup;
};

const PREVIEW_ROWS = 5;

const linkCount = (count: number) =>
  count === 1 ? "1 link" : `${count.toLocaleString()} links`;

function NothingNew() {
  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>Everyone already has a link</AlertTitle>
      <AlertDescription>
        Links are shown once, when they are made, so there is nothing new to
        download. Participants added later get theirs the next time you generate
        links.
      </AlertDescription>
    </Alert>
  );
}

function DownloadedAlert({ batch, setup }: Readonly<OutcomeProps>) {
  const kind = identifierKindLabel(setup.identifierKind).toLowerCase();
  return (
    <Alert variant="success">
      <CircleCheckBig />
      <AlertTitle>{linkCount(batch.links.length)} downloaded</AlertTitle>
      <AlertDescription>
        {batch.fileName} has one row per person: their {kind} and their link. It
        is the only copy, so keep it until the links are sent.
      </AlertDescription>
    </Alert>
  );
}

/** What was produced, then a way to save the file again while the panel is open. */
function Downloaded(props: Readonly<OutcomeProps>) {
  const formats = [{ kind: "csv" as const, onSelect: props.run.downloadAgain }];
  return (
    <div className="grid gap-3">
      <DownloadedAlert {...props} />
      <div>
        <DownloadMenu pending={false} formats={formats} />
      </div>
    </div>
  );
}

function linkCells(link: PersonalLink, url: string) {
  return [
    dataTableCell("identifier", link.identifier || "—", "break-all"),
    dataTableCell(
      "link",
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-xs" title={url}>
          {url}
        </span>
        <CopyToClipboard
          copyValue={url}
          layout="inline"
          label={`Copy the link for ${link.identifier}`}
        />
      </span>,
      "max-w-0 w-full",
    ),
  ];
}

function PreviewRows({ batch, setup }: Readonly<OutcomeProps>) {
  const origin = globalThis.location?.origin ?? "";
  return batch.links
    .slice(0, PREVIEW_ROWS)
    .map((link, index) => (
      <StaticDataTableRow
        key={link.token}
        index={index}
        cells={linkCells(
          link,
          personalLinkUrl(origin, setup.formId, link.token),
        )}
      />
    ));
}

/** A few rows to try a link before sending the file; the file holds them all. */
function LinksPreview(props: Readonly<OutcomeProps>) {
  const { batch, setup } = props;
  const shown = Math.min(PREVIEW_ROWS, batch.links.length);
  const columns = [
    { key: "identifier", label: identifierKindLabel(setup.identifierKind) },
    { key: "link", label: "Link" },
  ];
  return (
    <PanelSection
      icon={Link2}
      title="Links"
      description={`The first ${shown} of ${batch.links.length.toLocaleString()}, to try one before sending. The file has them all.`}
    >
      <StaticDataTable columns={columns}>
        <PreviewRows {...props} />
      </StaticDataTable>
    </PanelSection>
  );
}

/** The outcome in place: the file already saved, a way to save it again, and a few links to try. */
export function LinksOutcome(props: Readonly<OutcomeProps>) {
  if (props.batch.links.length === 0) return <NothingNew />;
  return (
    <>
      <Downloaded {...props} />
      <LinksPreview {...props} />
    </>
  );
}

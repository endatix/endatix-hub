"use client";

import { ChevronDown, Download } from "lucide-react";
import { FileKindLabel } from "@/components/common/file-kind-icon";
import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILE_KINDS, type FileKindKey } from "@/lib/file-kinds";

export type DownloadFormat = { kind: FileKindKey; onSelect: () => void };

type DownloadMenuProps = {
  formats: readonly DownloadFormat[];
  pending: boolean;
};

function DownloadMark({ pending }: Readonly<{ pending: boolean }>) {
  return pending ? <Spinner className="size-4" /> : <Download />;
}

/** One format: the button names it, with the file's own mark. */
function SingleDownload({
  format,
  pending,
}: Readonly<{ format: DownloadFormat; pending: boolean }>) {
  const { label } = FILE_KINDS[format.kind];
  return (
    <Button variant="outline" disabled={pending} onClick={format.onSelect}>
      <DownloadMark pending={pending} />
      {pending ? "Downloading…" : `Download ${label}`}
    </Button>
  );
}

function MenuTrigger({ pending }: Readonly<{ pending: boolean }>) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="outline" disabled={pending}>
        <DownloadMark pending={pending} />
        {pending ? "Downloading…" : "Download"}
        <ChevronDown />
      </Button>
    </DropdownMenuTrigger>
  );
}

function FormatItem({ format }: Readonly<{ format: DownloadFormat }>) {
  const { label } = FILE_KINDS[format.kind];
  return (
    <DropdownMenuItem textValue={label} onSelect={format.onSelect}>
      <FileKindLabel kind={format.kind}>{label}</FileKindLabel>
    </DropdownMenuItem>
  );
}

/**
 * The one Download control (DESIGN.md §6 Hand over a file): an `outline` button for one format,
 * a menu of formats otherwise, each with its `FileKindLabel`. Spins while a file is fetched.
 */
export function DownloadMenu({
  formats,
  pending,
}: Readonly<DownloadMenuProps>) {
  if (formats.length === 1) {
    return <SingleDownload format={formats[0]} pending={pending} />;
  }
  return (
    <DropdownMenu>
      <MenuTrigger pending={pending} />
      <DropdownMenuContent align="end">
        {formats.map((format) => (
          <FormatItem key={format.kind} format={format} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { downloadText } from "@/lib/utils/files-download";
import { usePanelOpen } from "../use-panel-state.hook";
import { generateAudienceLinksAction } from "./generate-audience-links.action";
import { batchSearch, useLinksPreview } from "./use-links-preview.hook";
import {
  LINKS_FILE_MIME,
  linksCsv,
  linksFileName,
  type PersonalLink,
} from "./personal-links";

export type GenerateLinksSetup = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  totalPeople: number;
  /** The list's search (`q`); blank sends a link to every real participant without one. */
  search: string;
};

/** What one run produced: the links and the name of the file that holds them. */
export type LinksBatch = { links: PersonalLink[]; fileName: string };

const REJECTED = "Something went wrong. Try again.";

async function generateOrFailure(formId: string, search: string) {
  try {
    return await generateAudienceLinksAction(formId, search);
  } catch {
    return Result.error<PersonalLink[]>(REJECTED);
  }
}

function saveBatch(setup: GenerateLinksSetup, batch: LinksBatch): void {
  const origin = globalThis.location?.origin ?? "";
  const csv = linksCsv({ ...setup, origin, links: batch.links });
  downloadText(csv, batch.fileName, LINKS_FILE_MIME);
}

type WriteOutcome = { error: string | null; batch: LinksBatch | null };
const NOT_RUN: WriteOutcome = { error: null, batch: null };

/** The one write; a batch is saved as a file the moment it arrives. */
function useLinksWrite(setup: GenerateLinksSetup) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<WriteOutcome>(NOT_RUN);
  const generate = (search: string) =>
    startTransition(async () => {
      setOutcome(NOT_RUN);
      const issued = await generateOrFailure(setup.formId, search);
      if (Result.isError(issued))
        return setOutcome({ error: issued.message, batch: null });
      const batch = {
        links: issued.value,
        fileName: linksFileName(setup.formId),
      };
      setOutcome({ error: null, batch });
      if (batch.links.length > 0) saveBatch(setup, batch);
      router.refresh();
    });
  return { pending, ...outcome, generate, reset: () => setOutcome(NOT_RUN) };
}

/** Opening resets the last run and counts again. */
function usePanelWithPreview(
  setup: GenerateLinksSetup,
  write: ReturnType<typeof useLinksWrite>,
) {
  const panel = usePanelOpen(() => {
    write.reset();
    count.reset();
  }, write.pending);
  const count = useLinksPreview(setup.formId, setup.search, panel.open);
  return { ...panel, preview: count.preview };
}

/**
 * Count who gets a link, generate them, then hand the file over at once: the tokens exist only
 * in this answer, so the file is saved as soon as it arrives and can be saved again while the
 * panel is open (DESIGN.md §6 Hand over a file).
 */
export function useGenerateLinks(setup: GenerateLinksSetup) {
  const write = useLinksWrite(setup);
  const panel = usePanelWithPreview(setup, write);
  const generate = () =>
    write.generate(batchSearch(panel.preview, setup.search));
  const downloadAgain = () => write.batch && saveBatch(setup, write.batch);
  return { ...panel, ...write, generate, downloadAgain };
}

export type GenerateLinks = ReturnType<typeof useGenerateLinks>;

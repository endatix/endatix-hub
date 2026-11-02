"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_EXPIRY_MINUTES } from "@/lib/share-links/share-link-expiry";
import { Result } from "@/lib/result";
import { downloadText } from "@/lib/utils/files-download";
import { MAX_TEST_LINKS } from "../shared/test-link-limits";
import { usePanelOpen } from "../use-panel-state.hook";
import { downloadTestLinksAction } from "./download-test-links.action";
import {
  TEST_LINKS_FILE_MIME,
  testLinksCsv,
  testLinksFileName,
  type TestLinkRow,
} from "./test-links-file";

export type DownloadTestLinksSetup = {
  formId: string;
  /** Test participants on the form. */
  testParticipants: number;
  /** Membership ids of the test participants ticked in the list. */
  selectedIds: readonly string[];
};

export type TestLinksScope = "all" | "selected";

/** What one run produced: the links and the name of the file that holds them. */
export type TestLinksBatch = { links: TestLinkRow[]; fileName: string };

type Choices = {
  scope: TestLinksScope;
  runsEach: number;
  expiryMinutes: number;
};

/** Opened with ticks in the list, the panel starts on them (DESIGN.md §6 Configure and run). */
const firstChoices = (setup: DownloadTestLinksSetup): Choices => ({
  scope: setup.selectedIds.length > 0 ? "selected" : "all",
  runsEach: 1,
  expiryMinutes: DEFAULT_EXPIRY_MINUTES,
});

const REJECTED = "Something went wrong. Try again.";

function saveBatch(formId: string, batch: TestLinksBatch) {
  const origin = globalThis.location?.origin ?? "";
  const csv = testLinksCsv({ origin, formId, links: batch.links });
  downloadText(csv, batch.fileName, TEST_LINKS_FILE_MIME);
}

const participantsIn = (
  setup: DownloadTestLinksSetup,
  scope: TestLinksScope,
) => (scope === "selected" ? setup.selectedIds.length : setup.testParticipants);

async function mintOrFailure(setup: DownloadTestLinksSetup, choices: Choices) {
  const { scope, ...counts } = choices;
  const membershipIds = scope === "selected" ? [...setup.selectedIds] : null;
  try {
    return await downloadTestLinksAction(setup.formId, {
      membershipIds,
      ...counts,
    });
  } catch {
    return Result.error<TestLinkRow[]>(REJECTED);
  }
}

type WriteOutcome = { error: string | null; batch: TestLinksBatch | null };
const NOT_RUN: WriteOutcome = { error: null, batch: null };

/** The one write; the batch is saved as a file the moment it arrives. */
function useTestLinksWrite(setup: DownloadTestLinksSetup, choices: Choices) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<WriteOutcome>(NOT_RUN);
  const download = () =>
    startTransition(async () => {
      setOutcome(NOT_RUN);
      const minted = await mintOrFailure(setup, choices);
      if (Result.isError(minted))
        return setOutcome({ error: minted.message, batch: null });
      const fileName = testLinksFileName(setup.formId);
      const batch = { links: minted.value, fileName };
      setOutcome({ error: null, batch });
      saveBatch(setup.formId, batch);
      router.refresh();
    });
  return { pending, ...outcome, download, reset: () => setOutcome(NOT_RUN) };
}

function useChoices(setup: DownloadTestLinksSetup) {
  const [choices, setChoices] = useState<Choices>(() => firstChoices(setup));
  const choose = (next: Partial<Choices>) =>
    setChoices((current) => ({ ...current, ...next }));
  const restart = () => setChoices(firstChoices(setup));
  const total = participantsIn(setup, choices.scope) * choices.runsEach;
  return { choices, choose, restart, total };
}

/**
 * Download test links: who, how many runs each and how long they last, then the file saved at
 * once. Each link opens a new test submission, so a second download opens a second set.
 */
export function useDownloadTestLinks(setup: DownloadTestLinksSetup) {
  const { restart, ...picked } = useChoices(setup);
  const { reset, ...write } = useTestLinksWrite(setup, picked.choices);
  const panel = usePanelOpen(() => {
    reset();
    restart();
  }, write.pending);
  const { batch } = write;
  const downloadAgain = () => batch && saveBatch(setup.formId, batch);
  const overLimit = picked.total > MAX_TEST_LINKS;
  return { ...panel, ...write, ...picked, overLimit, downloadAgain };
}

export type DownloadTestLinks = ReturnType<typeof useDownloadTestLinks>;

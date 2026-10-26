import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceImportLimits,
  type AudienceImportView,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import {
  getAudienceImportAction,
  moveAudienceImportAction,
  sendAudienceImportChunkAction,
  startAudienceImportAction,
} from "../audience-import.action";
import { ImportCsvPanel } from "../ui/import-csv-panel";

/**
 * Shared by the Import CSV panel tests. Each test file mocks `../audience-import.action`, `next/navigation`
 * and the media query itself (`vi.mock` is per file); these helpers drive the mocked actions.
 */

export const AGE: AudienceProperty = {
  id: "7",
  formId: "1",
  variableName: "age",
  name: "Age",
  dataType: AudienceDataType.Number,
  sortOrder: 0,
  dataListId: null,
  choicesJson: null,
  allowsOther: false,
};

const CITY: AudienceProperty = {
  ...AGE,
  id: "8",
  variableName: "city",
  name: "City",
  dataType: AudienceDataType.Text,
  sortOrder: 1,
};

export const BACKGROUND: AudienceImportLimits = {
  maxRows: 100_000,
  maxBytes: 50 * 1024 * 1024,
  runsInBackground: true,
};

export const CSV = "external_id,age,city\nCG-1,65,Columbus\nCG-2,79,Dayton\n";

export const NO_CURRENT = Result.error<AudienceImportView>(
  "The form has no unfinished import.",
  undefined,
  undefined,
  { statusCode: 404 },
);

export function view(
  overrides: Partial<AudienceImportView> = {},
): AudienceImportView {
  return {
    importId: "9",
    status: "uploading",
    fileName: "panel.csv",
    isTest: false,
    upload: { rowCount: 2, chunkSize: 1_000, missingChunks: [0] },
    runsInBackground: true,
    checkedRowCount: 0,
    check: null,
    written: {
      writtenRowCount: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      rejectedCount: 0,
    },
    rejections: [],
    failure: null,
    canResume: false,
    createdAt: "2026-10-26T10:00:00Z",
    finishedAt: null,
    ...overrides,
  };
}

export const CHECKED = view({
  status: "checked",
  upload: { rowCount: 2, chunkSize: 1_000, missingChunks: [] },
  checkedRowCount: 2,
  check: { newCount: 1, existingCount: 0, rejectedCount: 1 },
  rejections: [{ rowNumber: 3, reason: "Age must be a number." }],
});

/** `current` answers `onCurrent`; reads by id answer the queued views, then the last one again. */
export function serveReads(
  onCurrent: Result<AudienceImportView>,
  ...byId: AudienceImportView[]
) {
  vi.mocked(getAudienceImportAction).mockImplementation(
    async ({ importId }) => {
      if (importId === "current") return onCurrent;
      const next = byId.length > 1 ? byId.shift()! : byId[0];
      return Result.success(next);
    },
  );
}

export function renderPanel(
  limits: AudienceImportLimits = BACKGROUND,
  properties: AudienceProperty[] = [AGE, CITY],
) {
  render(
    <ImportCsvPanel
      formId="1"
      identifierKind={AudienceIdentifierKind.ExternalId}
      properties={properties}
      importLimits={limits}
    />,
  );
}

export function chooseFile(content = CSV, name = "panel.csv") {
  const file = new File([content], name, { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("CSV file"), {
    target: { files: [file] },
  });
}

export const button = (name: string | RegExp) =>
  screen.getByRole("button", { name });
export const continueButton = () => button("Continue");

export async function openWithFile(limits?: AudienceImportLimits) {
  renderPanel(limits);
  await waitFor(() => expect(getAudienceImportAction).toHaveBeenCalled());
  fireEvent.click(button("Import CSV"));
  chooseFile();
}

/** File → Columns → Continue, which starts the import. */
export async function startImport() {
  await screen.findByText(/panel\.csv: 2 rows/);
  fireEvent.click(continueButton());
  fireEvent.click(continueButton());
}

/** Lets the 2-second poll run once. */
export async function nextPoll() {
  await act(() => vi.advanceTimersByTimeAsync(2_000));
}

export function setHidden(hidden: boolean) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

// Radix Checkbox measures with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** Fake timers (polling), no unfinished import, every action reset. */
export function resetPanelMocks() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.mocked(startAudienceImportAction).mockReset();
  vi.mocked(sendAudienceImportChunkAction).mockReset();
  vi.mocked(moveAudienceImportAction).mockReset();
  vi.mocked(getAudienceImportAction).mockReset();
  serveReads(NO_CURRENT);
  setHidden(false);
}

/** Starts an import whose upload lands in the Check. */
export async function startToChecking() {
  vi.mocked(startAudienceImportAction).mockResolvedValue(
    Result.success(view()),
  );
  vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
    Result.success(view({ status: "checking" })),
  );
  await openWithFile();
  await startImport();
  await screen.findByText(/Checking/);
}

export function writtenSoFar(
  written: number,
  rows: number,
): Partial<AudienceImportView> {
  return {
    upload: { rowCount: rows, chunkSize: 1_000, missingChunks: [] },
    checkedRowCount: rows,
    check: { newCount: rows, existingCount: 0, rejectedCount: 0 },
    written: {
      writtenRowCount: written,
      createdCount: written,
      updatedCount: 0,
      skippedCount: 0,
      rejectedCount: 0,
    },
  };
}

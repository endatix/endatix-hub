import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock("../audience-import.action", () => ({
  startAudienceImportAction: vi.fn(),
  sendAudienceImportChunkAction: vi.fn(),
  getAudienceImportAction: vi.fn(),
  moveAudienceImportAction: vi.fn(),
}));

const AGE: AudienceProperty = {
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

const BACKGROUND: AudienceImportLimits = {
  maxRows: 100_000,
  maxBytes: 50 * 1024 * 1024,
  runsInBackground: true,
};

const CSV = "external_id,age,city\nCG-1,65,Columbus\nCG-2,79,Dayton\n";

const NO_CURRENT = Result.error<AudienceImportView>(
  "The form has no unfinished import.",
  undefined,
  undefined,
  { statusCode: 404 },
);

function view(overrides: Partial<AudienceImportView> = {}): AudienceImportView {
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

const CHECKED = view({
  status: "checked",
  upload: { rowCount: 2, chunkSize: 1_000, missingChunks: [] },
  checkedRowCount: 2,
  check: { newCount: 1, existingCount: 0, rejectedCount: 1 },
  rejections: [{ rowNumber: 3, reason: "Age must be a number." }],
});

/** `current` answers `onCurrent`; reads by id answer the queued views, then the last one again. */
function serveReads(onCurrent: Result<AudienceImportView>, ...byId: AudienceImportView[]) {
  vi.mocked(getAudienceImportAction).mockImplementation(async ({ importId }) => {
    if (importId === "current") return onCurrent;
    const next = byId.length > 1 ? byId.shift()! : byId[0];
    return Result.success(next);
  });
}

function renderPanel(limits: AudienceImportLimits = BACKGROUND) {
  render(
    <ImportCsvPanel
      formId="1"
      identifierKind={AudienceIdentifierKind.ExternalId}
      properties={[AGE]}
      importLimits={limits}
    />,
  );
}

function chooseFile(content = CSV, name = "panel.csv") {
  const file = new File([content], name, { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("CSV file"), {
    target: { files: [file] },
  });
}

async function openWithFile(limits?: AudienceImportLimits) {
  renderPanel(limits);
  await waitFor(() => expect(getAudienceImportAction).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Import CSV" }));
  chooseFile();
}

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const continueButton = () => button("Continue");

async function startImport() {
  await screen.findByText(/panel\.csv: 2 rows/);
  fireEvent.click(continueButton());
  fireEvent.click(continueButton());
}

/** Lets the 2-second poll run once. */
async function nextPoll() {
  await act(() => vi.advanceTimersByTimeAsync(2_000));
}

function setHidden(hidden: boolean) {
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

describe("ImportCsvPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(startAudienceImportAction).mockReset();
    vi.mocked(sendAudienceImportChunkAction).mockReset();
    vi.mocked(moveAudienceImportAction).mockReset();
    vi.mocked(getAudienceImportAction).mockReset();
    serveReads(NO_CURRENT);
    refresh.mockReset();
    setHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("states this host's limits before a file, then what it read", async () => {
    // Arrange
    renderPanel();
    fireEvent.click(button("Import CSV"));

    // Act & Assert
    expect(
      screen.getByText(
        "Up to 100,000 rows and 50 MB. The first row names the columns.",
      ),
    ).toBeTruthy();
    chooseFile();
    expect(
      await screen.findByText("panel.csv: 2 rows, 3 columns."),
    ).toBeTruthy();
  });

  it("refuses a file larger than the host takes, naming the limit", async () => {
    // Arrange
    renderPanel({ ...BACKGROUND, maxBytes: 1024 * 1024 });
    fireEvent.click(button("Import CSV"));

    // Act
    chooseFile("x".repeat(2 * 1024 * 1024));

    // Assert
    expect(
      await screen.findByText("The file is 2 MB. Import files up to 1 MB."),
    ).toBeTruthy();
    expect((continueButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("refuses a file with more rows than the host takes, naming the limit", async () => {
    // Arrange
    renderPanel({ maxRows: 1, maxBytes: 1024, runsInBackground: false });
    fireEvent.click(button("Import CSV"));

    // Act
    chooseFile();

    // Assert
    expect(
      await screen.findByText(
        "The file has 2 rows. Import up to 1 at a time, so split it into smaller files.",
      ),
    ).toBeTruthy();
  });

  it("uploads after the columns, checks, and writes only when confirmed", async () => {
    // Arrange
    vi.mocked(startAudienceImportAction).mockResolvedValue(Result.success(view()));
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
      Result.success(view({ status: "checking", checkedRowCount: 0 })),
    );
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success({ ...CHECKED, status: "writing" }),
    );
    await openWithFile();

    // Act: start and upload
    await startImport();

    // Assert
    await screen.findByText(/Checking/);
    expect(startAudienceImportAction).toHaveBeenCalledWith({
      formId: "1",
      fileName: "panel.csv",
      headers: ["external_id", "age", "city"],
      rowCount: 2,
      identifierColumn: "external_id",
      propertyColumns: { age: "age" },
      isTest: false,
    });
    expect(sendAudienceImportChunkAction).toHaveBeenCalledWith({
      formId: "1",
      importId: "9",
      index: 0,
      chunk: {
        firstRowNumber: 2,
        rows: [
          { cells: ["CG-1", "65", "Columbus"], malformed: false },
          { cells: ["CG-2", "79", "Dayton"], malformed: false },
        ],
      },
    });
    expect(moveAudienceImportAction).not.toHaveBeenCalled();

    // Act: the Check finishes
    serveReads(NO_CURRENT, CHECKED);
    await nextPoll();

    // Assert
    expect(
      await screen.findByText("1 new participant, 1 rejected"),
    ).toBeTruthy();
    expect(screen.getByText("Age must be a number.")).toBeTruthy();
    expect(button("Cancel import")).toBeTruthy();

    // Act: confirm, then the write finishes
    serveReads(
      NO_CURRENT,
      view({
        ...CHECKED,
        status: "completed",
        written: {
          writtenRowCount: 1,
          createdCount: 1,
          updatedCount: 0,
          skippedCount: 0,
          rejectedCount: 1,
        },
      }),
    );
    fireEvent.click(button("Import 1 participant"));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cancel import" })).toBeNull(),
    );
    await nextPoll();

    // Assert
    expect(
      await screen.findByText("Import finished with rejected rows"),
    ).toBeTruthy();
    expect(moveAudienceImportAction).toHaveBeenCalledWith({
      formId: "1",
      importId: "9",
      to: "writing",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("chooses test participants on the Columns step and says existing ones are skipped", async () => {
    // Arrange
    vi.mocked(startAudienceImportAction).mockResolvedValue(
      Result.success(view({ isTest: true })),
    );
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
      Result.success({ ...CHECKED, isTest: true }),
    );
    await openWithFile();
    await screen.findByText(/panel\.csv: 2 rows/);
    fireEvent.click(continueButton());

    // Act
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Import as test participants" }),
    );
    fireEvent.click(continueButton());

    // Assert
    expect(
      await screen.findByText("Existing participants are skipped"),
    ).toBeTruthy();
    expect(startAudienceImportAction).toHaveBeenCalledWith(
      expect.objectContaining({ isTest: true }),
    );
  });

  it("cancels during the Check, and writes nothing", async () => {
    // Arrange
    vi.mocked(startAudienceImportAction).mockResolvedValue(Result.success(view()));
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
      Result.success(view({ status: "checking" })),
    );
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success(view({ status: "canceled" })),
    );
    await openWithFile();
    await startImport();
    await screen.findByText(/Checking/);

    // Act
    fireEvent.click(button("Cancel import"));

    // Assert
    expect(await screen.findByText("Import canceled")).toBeTruthy();
    expect(moveAudienceImportAction).toHaveBeenCalledWith({
      formId: "1",
      importId: "9",
      to: "canceled",
    });
    expect(screen.queryByRole("button", { name: "Cancel import" })).toBeNull();
  });

  it("opens on the form's unfinished import, at its current step and counts", async () => {
    // Arrange
    serveReads(
      Result.success(view({ status: "writing", ...writtenSoFar(1_200, 60_000) })),
    );

    // Act
    renderPanel();

    // Assert
    expect(
      await screen.findByText("1,200 of 60,000 rows written"),
    ).toBeTruthy();
    // The open panel hides the page behind it, trigger included.
    expect(
      screen.getByRole("button", { name: "Import in progress", hidden: true }),
    ).toBeTruthy();
  });

  it("offers Resume for a stopped write, and resumes it", async () => {
    // Arrange
    serveReads(
      Result.success(
        view({
          ...CHECKED,
          status: "failed",
          canResume: true,
          failure: "The write stopped. Resume continues from where it stopped.",
        }),
      ),
    );
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success({ ...CHECKED, status: "writing" }),
    );
    renderPanel();

    // Act
    fireEvent.click(await screen.findByRole("button", { name: "Resume import" }));

    // Assert
    await waitFor(() =>
      expect(moveAudienceImportAction).toHaveBeenCalledWith({
        formId: "1",
        importId: "9",
        to: "writing",
      }),
    );
  });

  it("continues a cut-off upload only with the same file", async () => {
    // Arrange
    serveReads(Result.success(view()), view());
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
      Result.success(view({ status: "checking" })),
    );
    renderPanel();
    await screen.findByText(/Choose panel\.csv again/);

    // Act: another file
    chooseFile("external_id\nCG-1\n", "panel.csv");

    // Assert
    expect(
      await screen.findByText(
        "This file has 1 row, but the import has 2. Choose panel.csv again.",
      ),
    ).toBeTruthy();
    expect(sendAudienceImportChunkAction).not.toHaveBeenCalled();

    // Act: the same file
    chooseFile();

    // Assert
    await waitFor(() => expect(sendAudienceImportChunkAction).toHaveBeenCalled());
  });

  it("refuses a re-chosen file whose columns differ, when the API names them", async () => {
    // Arrange
    const withHeaders = view({ headers: ["external_id", "age", "town"] });
    serveReads(Result.success(withHeaders), withHeaders);
    renderPanel();
    await screen.findByText(/Choose panel\.csv again/);

    // Act
    chooseFile();

    // Assert
    expect(
      await screen.findByText(
        "This file's columns differ from the import's. Choose panel.csv again.",
      ),
    ).toBeTruthy();
    expect(sendAudienceImportChunkAction).not.toHaveBeenCalled();
  });

  it("shows the running import when the form already has one", async () => {
    // Arrange
    vi.mocked(startAudienceImportAction).mockResolvedValue(
      Result.error("This form already has an import in progress.", undefined, undefined, {
        statusCode: 409,
      }),
    );
    await openWithFile();
    serveReads(
      Result.success(view({ fileName: "other.csv", status: "checking" })),
      view({ fileName: "other.csv", status: "checking" }),
    );

    // Act
    await startImport();

    // Assert
    expect(
      await screen.findByText(
        "An import of this form is already running, so it is shown instead of your file.",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/other\.csv/)).toBeTruthy();
  });

  it("reads the import every 2 seconds while it checks, and not while the tab is hidden", async () => {
    // Arrange
    serveReads(Result.success(view({ status: "checking" })), view({ status: "checking" }));
    renderPanel();
    await screen.findByText(/Checking/);
    const readsById = () =>
      vi.mocked(getAudienceImportAction).mock.calls.filter(
        ([input]) => input.importId === "9",
      ).length;

    // Act & Assert
    await nextPoll();
    expect(readsById()).toBe(1);
    setHidden(true);
    await nextPoll();
    await nextPoll();
    expect(readsById()).toBe(1);
    setHidden(false);
    await waitFor(() => expect(readsById()).toBe(2));
  });
});

function writtenSoFar(written: number, rows: number): Partial<AudienceImportView> {
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

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import {
  moveAudienceImportAction,
  sendAudienceImportChunkAction,
  startAudienceImportAction,
} from "../audience-import.action";
import {
  BACKGROUND,
  button,
  CHECKED,
  chooseFile,
  continueButton,
  NO_CURRENT,
  nextPoll,
  openWithFile,
  renderPanel,
  resetPanelMocks,
  serveReads,
  startImport,
  startToChecking,
  view,
} from "./import-panel-fixtures";

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

const COMPLETED = view({
  ...CHECKED,
  status: "completed",
  written: {
    writtenRowCount: 1,
    createdCount: 1,
    updatedCount: 0,
    skippedCount: 0,
    rejectedCount: 1,
  },
});

describe("ImportCsvPanel: file, columns and start", () => {
  beforeEach(() => {
    resetPanelMocks();
    refresh.mockReset();
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

  it("starts the import after the Columns step and uploads the mapped rows, writing nothing", async () => {
    // Act
    await startToChecking();

    // Assert
    expect(startAudienceImportAction).toHaveBeenCalledWith({
      formId: "1",
      fileName: "panel.csv",
      headers: ["external_id", "age", "city"],
      rowCount: 2,
      identifierColumn: "external_id",
      propertyColumns: { age: "age", city: "city" },
      isTest: false,
    });
    expect(sendAudienceImportChunkAction).toHaveBeenCalledWith({
      formId: "1",
      importId: "9",
      chunk: {
        index: 0,
        firstRowNumber: 2,
        rows: [
          { cells: ["CG-1", "65", "Columbus"], malformed: false },
          { cells: ["CG-2", "79", "Dayton"], malformed: false },
        ],
      },
    });
    expect(moveAudienceImportAction).not.toHaveBeenCalled();
  });

  it("shows the Check's counts and rejections, then writes only when confirmed", async () => {
    // Arrange
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success({ ...CHECKED, status: "writing" }),
    );
    await startToChecking();

    // Act
    serveReads(NO_CURRENT, CHECKED);
    await nextPoll();

    // Assert
    expect(
      await screen.findByText("1 new participant, 1 rejected"),
    ).toBeTruthy();
    expect(screen.getByText("Age must be a number.")).toBeTruthy();
    expect(button("Cancel import")).toBeTruthy();
    expect(moveAudienceImportAction).not.toHaveBeenCalled();

    // Act
    fireEvent.click(button("Import 1 participant"));

    // Assert
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Cancel import" }),
      ).toBeNull(),
    );
    expect(moveAudienceImportAction).toHaveBeenCalledWith({
      formId: "1",
      importId: "9",
      to: "writing",
    });
  });

  it("follows the write to the outcome and refreshes the People list", async () => {
    // Arrange
    vi.mocked(startAudienceImportAction).mockResolvedValue(
      Result.success(view()),
    );
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
      Result.success(CHECKED),
    );
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success({ ...CHECKED, status: "writing" }),
    );
    await openWithFile();
    await startImport();
    serveReads(NO_CURRENT, COMPLETED);

    // Act
    fireEvent.click(
      await screen.findByRole("button", { name: "Import 1 participant" }),
    );
    await screen.findByText(/rows written/);
    await nextPoll();

    // Assert
    expect(
      await screen.findByText("Import finished with rejected rows"),
    ).toBeTruthy();
    expect(screen.getByText(/1 added, 1 rejected/)).toBeTruthy();
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

  it("shows the running import when the form already has one", async () => {
    // Arrange
    vi.mocked(startAudienceImportAction).mockResolvedValue(
      Result.error(
        "This form already has an import in progress.",
        undefined,
        undefined,
        {
          statusCode: 409,
        },
      ),
    );
    await openWithFile();
    const running = view({ fileName: "other.csv", status: "checking" });
    serveReads(Result.success(running), running);

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
});

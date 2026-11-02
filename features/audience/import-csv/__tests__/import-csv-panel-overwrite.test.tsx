import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { Result } from "@/lib/result";
import { readCsvRecords } from "@/lib/utils/csv";
import { downloadText } from "@/lib/utils/files-download";
import {
  listAudienceImportRejectionsAction,
  moveAudienceImportAction,
  sendAudienceImportChunkAction,
  startAudienceImportAction,
} from "../audience-import.action";
import {
  button,
  continueButton,
  openWithFile,
  resetPanelMocks,
  serveReads,
  view,
} from "./import-panel-fixtures";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/utils/files-download", () => ({ downloadText: vi.fn() }));
vi.mock("../audience-import.action", () => ({
  startAudienceImportAction: vi.fn(),
  sendAudienceImportChunkAction: vi.fn(),
  getAudienceImportAction: vi.fn(),
  moveAudienceImportAction: vi.fn(),
  listAudienceImportRejectionsAction: vi.fn(),
}));

const UPDATES = view({
  status: "checked",
  emptyCells: "clear",
  missingProperties: "keep",
  upload: { rowCount: 3, chunkSize: 1_000, missingChunks: [] },
  checkedRowCount: 3,
  check: { newCount: 1, existingCount: 2, rejectedCount: 0 },
});

const ACKNOWLEDGE =
  "I understand 2 records will be updated and this cannot be undone";

/** File → Columns, where the overwrite choices are made before Continue starts the import. */
async function toColumns() {
  vi.mocked(startAudienceImportAction).mockResolvedValue(
    Result.success(view()),
  );
  await openWithFile();
  await screen.findByText(/panel\.csv: 2 rows/);
  fireEvent.click(continueButton());
}

/** Columns → Continue, with the upload landing in the given Check. */
async function startTo(checked = UPDATES) {
  vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
    Result.success(checked),
  );
  serveReads(Result.success(checked), checked);
  fireEvent.click(continueButton());
  await screen.findByText(/This is what the import will do/);
}

const COMPLETED_WITH_REJECTIONS = view({
  status: "completed",
  headers: ["external_id", "age"],
  upload: { rowCount: 5_002, chunkSize: 1_000, missingChunks: [] },
  written: {
    writtenRowCount: 5_000,
    createdCount: 5_000,
    updatedCount: 0,
    skippedCount: 0,
    rejectedCount: 2,
  },
  rejections: [{ rowNumber: 3, reason: "Age must be a number." }],
});

/** Page `page` of two, holding the one rejected row at `rowNumber`. */
const rejectionsPage = (page: number, rowNumber: number) =>
  Result.success(
    normalizePagedResponse({
      page,
      pageSize: 5_000,
      totalRecords: 2,
      totalPages: 2,
      items: [
        { rowNumber, reason: "Age must be a number.", cells: ["CG", "x"] },
      ],
    }),
  );

/** Start → Check → Import, landing on the outcome with two rejected rows. */
async function importToCompleted() {
  await toColumns();
  await startTo({
    ...UPDATES,
    check: { newCount: 5_000, existingCount: 0, rejectedCount: 2 },
  });
  vi.mocked(moveAudienceImportAction).mockResolvedValue(
    Result.success(COMPLETED_WITH_REJECTIONS),
  );
  fireEvent.click(button("Import 5,000 rows"));
}

const startRequest = (call = 0) =>
  vi.mocked(startAudienceImportAction).mock.calls[call][0];

describe("ImportCsvPanel: overwrite rules", () => {
  beforeEach(() => {
    resetPanelMocks();
    vi.mocked(listAudienceImportRejectionsAction).mockReset();
    vi.mocked(downloadText).mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("keeps values by default and sends the choices made on Columns with the start", async () => {
    await toColumns();

    expect(
      screen
        .getByRole("radio", { name: "Keep the current value (recommended)" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen
        .getByRole("radio", { name: "Leave them (recommended)" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Clear the value" }));
    await startTo();

    expect(startRequest()).toMatchObject({
      emptyCells: "clear",
      missingProperties: "keep",
    });
  });

  it("offers no overwrite choice for a test import, which keeps every value", async () => {
    await toColumns();
    fireEvent.click(screen.getByRole("radio", { name: "Clear the value" }));

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Import as test participants" }),
    );

    expect(screen.queryByRole("radio", { name: "Clear the value" })).toBeNull();
    await startTo({ ...UPDATES, isTest: true });
    expect(startRequest()).toMatchObject({
      isTest: true,
      emptyCells: "keep",
      missingProperties: "keep",
    });
  });

  it("shows the choices read-only before Import, and holds Import until the update count is acknowledged", async () => {
    await toColumns();
    await startTo();

    const choices = screen
      .getByRole("heading", { name: "Before you import" })
      .closest("section")!;
    expect(within(choices).getByText("Clear the value")).toBeTruthy();
    expect(within(choices).getByText("Leave them")).toBeTruthy();
    expect(within(choices).queryByRole("radio")).toBeNull();

    const importRows = button("Import 3 rows");
    expect(importRows).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("checkbox", { name: ACKNOWLEDGE }));
    expect(importRows).toHaveProperty("disabled", false);

    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success({ ...UPDATES, status: "writing" }),
    );
    fireEvent.click(importRows);
    await waitFor(() =>
      expect(moveAudienceImportAction).toHaveBeenCalledWith({
        formId: "1",
        importId: "9",
        to: "writing",
      }),
    );
  });

  it("asks for no acknowledgement when no participant is updated", async () => {
    await toColumns();
    await startTo({
      ...UPDATES,
      check: { newCount: 3, existingCount: 0, rejectedCount: 0 },
    });

    expect(screen.queryByRole("checkbox", { name: /I understand/ })).toBeNull();
    expect(button("Import 3 rows")).toHaveProperty("disabled", false);
  });

  it("goes back to change the choices, canceling the checked import, and starts a new one with them", async () => {
    await toColumns();
    await startTo();
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success({ ...UPDATES, status: "canceled" }),
    );

    fireEvent.click(button("Back to change"));

    await waitFor(() =>
      expect(moveAudienceImportAction).toHaveBeenCalledWith({
        formId: "1",
        importId: "9",
        to: "canceled",
      }),
    );
    const keep = await screen.findByRole("radio", {
      name: "Keep the current value (recommended)",
    });
    fireEvent.click(keep);
    fireEvent.click(screen.getByRole("radio", { name: "Clear them" }));
    await startTo();

    expect(startAudienceImportAction).toHaveBeenCalledTimes(2);
    expect(startRequest(1)).toMatchObject({
      emptyCells: "keep",
      missingProperties: "clear",
    });
  });

  it("downloads every rejected row with its line, reason and the file's cells", async () => {
    vi.mocked(listAudienceImportRejectionsAction)
      .mockResolvedValueOnce(rejectionsPage(1, 3))
      .mockResolvedValueOnce(rejectionsPage(2, 5_003));
    await importToCompleted();

    fireEvent.click(
      await screen.findByRole("button", { name: "Download rejected rows" }),
    );

    await waitFor(() => expect(downloadText).toHaveBeenCalled());
    expect(listAudienceImportRejectionsAction).toHaveBeenLastCalledWith({
      formId: "1",
      importId: "9",
      page: 2,
    });
    const [csv, fileName] = vi.mocked(downloadText).mock.calls[0];
    expect(fileName).toBe("panel-rejected-rows.csv");
    expect(readCsvRecords(csv)).toEqual([
      ["Line", "Reason", "external_id", "age"],
      ["3", "Age must be a number.", "CG", "x"],
      ["5003", "Age must be a number.", "CG", "x"],
    ]);
  });
});

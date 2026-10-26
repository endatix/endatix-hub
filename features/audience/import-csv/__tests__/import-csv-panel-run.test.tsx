import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudienceImportView } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import {
  getAudienceImportAction,
  moveAudienceImportAction,
  sendAudienceImportChunkAction,
  startAudienceImportAction,
} from "../audience-import.action";
import {
  button,
  CHECKED,
  chooseFile,
  NO_CURRENT,
  openWithFile,
  nextPoll,
  renderPanel,
  resetPanelMocks,
  serveReads,
  setHidden,
  startImport,
  startToChecking,
  view,
  writtenSoFar,
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

const readsOf = (importId: string) =>
  vi
    .mocked(getAudienceImportAction)
    .mock.calls.filter(([input]) => input.importId === importId).length;

describe("ImportCsvPanel: a running import", () => {
  beforeEach(() => {
    resetPanelMocks();
    refresh.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cancels during the Check, and writes nothing", async () => {
    // Arrange
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success(view({ status: "canceled" })),
    );
    await startToChecking();

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
      Result.success(
        view({ status: "writing", ...writtenSoFar(1_200, 60_000) }),
      ),
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
    const stopped = view({
      ...CHECKED,
      status: "failed",
      canResume: true,
      failure: "The write stopped.",
    });
    serveReads(Result.success(stopped));
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success({ ...CHECKED, status: "writing" }),
    );
    renderPanel();

    // Act
    fireEvent.click(
      await screen.findByRole("button", { name: "Resume import" }),
    );

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
        "This file has 1 row, but the import has 2 rows. Choose panel.csv again.",
      ),
    ).toBeTruthy();
    expect(sendAudienceImportChunkAction).not.toHaveBeenCalled();

    // Act: the same file
    chooseFile();

    // Assert
    await waitFor(() =>
      expect(sendAudienceImportChunkAction).toHaveBeenCalled(),
    );
  });

  it("refuses a re-chosen file whose columns differ from the import's", async () => {
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

  it("reads the import every 2 seconds while it checks, and not while the tab is hidden", async () => {
    // Arrange
    const checking = view({ status: "checking" });
    serveReads(Result.success(checking), checking);
    renderPanel();
    await screen.findByText(/Checking/);

    // Act & Assert
    await nextPoll();
    expect(readsOf("9")).toBe(1);
    setHidden(true);
    await nextPoll();
    await nextPoll();
    expect(readsOf("9")).toBe(1);
    setHidden(false);
    await waitFor(() => expect(readsOf("9")).toBe(2));
  });

  it("follows an upload another tab is sending into the Check", async () => {
    // Arrange
    serveReads(Result.success(view()), view({ status: "checking" }));
    renderPanel();
    await screen.findByText(/Choose panel\.csv again/);

    // Act
    await nextPoll();

    // Assert
    expect(await screen.findByText(/rows checked/)).toBeTruthy();
  });

  it("keeps a canceled import canceled when an older read lands after it", async () => {
    // Arrange
    let landLate: (read: Result<AudienceImportView>) => void = () => undefined;
    const checking = view({ status: "checking" });
    serveReads(Result.success(checking), checking);
    renderPanel();
    await screen.findByText(/rows checked/);
    vi.mocked(getAudienceImportAction).mockImplementation(
      () => new Promise((resolve) => (landLate = resolve)),
    );
    await nextPoll();
    vi.mocked(moveAudienceImportAction).mockResolvedValue(
      Result.success(view({ status: "canceled" })),
    );
    fireEvent.click(button("Cancel import"));
    await screen.findByText("Import canceled");

    // Act
    await act(async () => landLate(Result.success(checking)));

    // Assert
    expect(screen.getByText("Import canceled")).toBeTruthy();
    expect(screen.queryByText(/rows checked/)).toBeNull();
  });

  it("shows the written counts while the write runs", async () => {
    // Arrange
    const writing = view({ status: "writing", ...writtenSoFar(1_200, 60_000) });
    serveReads(Result.success(writing));

    // Act
    renderPanel();

    // Assert
    expect(await screen.findByText("1,200 added so far")).toBeTruthy();
  });

  it("refreshes the People list when a write stops partway", async () => {
    // Arrange
    const writing = view({ status: "writing", ...writtenSoFar(1_200, 60_000) });
    serveReads(Result.success(writing), {
      ...writing,
      status: "failed",
      failure: "The form was deleted.",
    });
    renderPanel();
    await screen.findByText(/rows written/);

    // Act
    await nextPoll();

    // Assert
    expect(await screen.findByText("Import failed")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("counts only new participants for a test import, and offers no import of nothing", async () => {
    // Arrange
    const testCheck = {
      ...CHECKED,
      isTest: true,
      check: { newCount: 0, existingCount: 4, rejectedCount: 0 },
    };
    serveReads(Result.success(testCheck));

    // Act
    renderPanel();

    // Assert
    const confirm = (await screen.findByRole("button", {
      name: "Import 0 participants",
    })) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(button("Cancel import")).toBeTruthy();
  });

  it("keeps the rows after a failed upload and sends the rest on request", async () => {
    // Arrange
    const busy = Result.error<AudienceImportView>(
      "The form's audience is busy.",
      undefined,
      undefined,
      { statusCode: 503 },
    );
    vi.mocked(startAudienceImportAction).mockResolvedValue(
      Result.success(view()),
    );
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(busy);
    serveReads(NO_CURRENT, view());
    await openWithFile();
    await startImport();
    await screen.findByText("The form's audience is busy.");
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
      Result.success(view({ status: "checking" })),
    );

    // Act
    fireEvent.click(
      await screen.findByRole("button", { name: "Send the rest of the file" }),
    );

    // Assert
    expect(await screen.findByText(/rows checked/)).toBeTruthy();
    expect(sendAudienceImportChunkAction).toHaveBeenCalledTimes(3);
  });
});

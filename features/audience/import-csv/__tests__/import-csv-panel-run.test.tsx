import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import {
  getAudienceImportAction,
  moveAudienceImportAction,
  sendAudienceImportChunkAction,
} from "../audience-import.action";
import {
  button,
  CHECKED,
  chooseFile,
  nextPoll,
  renderPanel,
  resetPanelMocks,
  serveReads,
  setHidden,
  startToChecking,
  view,
  writtenSoFar,
} from "./import-panel-fixtures";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
        "This file has 1 row, but the import has 2. Choose panel.csv again.",
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
});

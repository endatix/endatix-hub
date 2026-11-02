import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  button,
  chooseFile,
  continueButton,
  renderPanel,
  resetPanelMocks,
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
// A body limit the fixture's two short rows fit under and one long row does not.
vi.mock("../import-chunk-payload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../import-chunk-payload")>()),
  IMPORT_CHUNK_BODY_BYTES: 400,
}));

describe("ImportCsvPanel: a chunk over the request limit", () => {
  beforeEach(() => {
    resetPanelMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses the file on the File step, naming the limit and the rows", async () => {
    // Arrange
    renderPanel();
    fireEvent.click(button("Import CSV"));

    // Act
    chooseFile(`external_id,age,city\nCG-1,65,${"x".repeat(600)}\n`);

    // Assert
    expect(
      await screen.findByText(
        "Rows 2 to 2 are too long to send together: over 400 B in one request. Shorten the longest cells, or split the file.",
      ),
    ).toBeTruthy();
    expect((continueButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("takes a file whose every chunk fits", async () => {
    // Arrange
    renderPanel();
    fireEvent.click(button("Import CSV"));

    // Act
    chooseFile();

    // Assert
    expect(
      await screen.findByText("panel.csv: 2 rows, 3 columns."),
    ).toBeTruthy();
  });
});

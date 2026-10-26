import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { importAudienceCsvAction } from "../import-audience-csv.action";
import { ImportCsvPanel } from "../ui/import-csv-panel";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../import-audience-csv.action", () => ({
  importAudienceCsvAction: vi.fn(),
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

const CSV = "external_id,age,city\nCG-1,65,Columbus\nCG-2,79,Dayton\n";

function openWithFile() {
  render(
    <ImportCsvPanel
      formId="1"
      identifierKind={AudienceIdentifierKind.ExternalId}
      properties={[AGE]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Import CSV" }));
  const file = new File([CSV], "panel.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("CSV file"), {
    target: { files: [file] },
  });
}

const continueButton = () => screen.getByRole("button", { name: "Continue" });

// Radix Checkbox measures with ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("ImportCsvPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    vi.mocked(importAudienceCsvAction).mockReset();
  });

  it("states the limits before a file, then what it read", async () => {
    openWithFile();

    expect(
      await screen.findByText("panel.csv: 2 rows, 3 columns."),
    ).toBeTruthy();
    expect((continueButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("suggests the identifier and the columns, and writes nothing before Import", async () => {
    openWithFile();
    await screen.findByText(/panel\.csv/);
    fireEvent.click(continueButton());

    expect(screen.getByText(/Suggested from its name/)).toBeTruthy();
    expect(screen.getByText("1 of 2 imported")).toBeTruthy();
    fireEvent.click(continueButton());

    expect(screen.getByText("Identifier column")).toBeTruthy();
    expect(importAudienceCsvAction).not.toHaveBeenCalled();
  });

  it("imports the mapped columns and shows rejected rows in place", async () => {
    vi.mocked(importAudienceCsvAction).mockResolvedValue(
      Result.success({
        importId: "9",
        createdCount: 1,
        updatedCount: 0,
        skippedCount: 0,
        rejectedCount: 1,
        rejections: [{ rowNumber: 3, reason: "Age must be a number." }],
      }),
    );
    openWithFile();
    await screen.findByText(/panel\.csv/);
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole("button", { name: "Import 2 rows" }));

    expect(
      await screen.findByText("Import finished with rejected rows"),
    ).toBeTruthy();
    expect(screen.getByText("Age must be a number.")).toBeTruthy();
    expect(importAudienceCsvAction).toHaveBeenCalledWith(
      expect.objectContaining({
        identifierColumn: "external_id",
        fileName: "panel.csv",
        propertyColumns: { age: "age" },
        isTest: false,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull(),
    );
  });
  it("keeps a failed import on the review step and clears it on Back", async () => {
    vi.mocked(importAudienceCsvAction).mockResolvedValue(
      Result.validationError("The CSV has no 'age' column."),
    );
    openWithFile();
    await screen.findByText(/panel\.csv/);
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole("button", { name: "Import 2 rows" }));

    expect(
      await screen.findByText("The CSV has no 'age' column."),
    ).toBeTruthy();
    // The message can land a tick before the import stops pending; Back is disabled until then.
    const back = screen.getByRole("button", {
      name: "Back",
    }) as HTMLButtonElement;
    await waitFor(() => expect(back.disabled).toBe(false));
    fireEvent.click(back);

    expect(screen.queryByText("The CSV has no 'age' column.")).toBeNull();
    expect(screen.getByText("Identifier column")).toBeTruthy();
  });

  it("imports as test people, and the review says existing people are skipped", async () => {
    vi.mocked(importAudienceCsvAction).mockResolvedValue(
      Result.success({
        importId: "9",
        createdCount: 1,
        updatedCount: 0,
        skippedCount: 1,
        rejectedCount: 0,
        rejections: [],
      }),
    );
    openWithFile();
    await screen.findByText(/panel\.csv/);
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());

    expect(screen.getByText("Existing people are updated")).toBeTruthy();
    expect(
      screen.getByText(
        "Test participants are never sent a personalized link. Use them to try the form with Test as this participant.",
      ),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Import as test participants" }),
    );
    expect(screen.getByText("Existing people are skipped")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Import 2 rows" }));

    await screen.findByText("Import finished");
    expect(importAudienceCsvAction).toHaveBeenCalledWith(
      expect.objectContaining({ isTest: true }),
    );
  });
});

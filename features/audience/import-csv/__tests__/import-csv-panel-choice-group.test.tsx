import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { createAudiencePropertyAction } from "../../create-property/create-audience-property.action";
import {
  getAudienceImportAction,
  sendAudienceImportChunkAction,
  startAudienceImportAction,
} from "../audience-import.action";
import { checkPropertyNamesAction } from "../check-property-names.action";
import {
  AGE,
  BACKGROUND,
  button,
  chooseFile,
  continueButton,
  renderPanel,
  resetPanelMocks,
  view,
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
vi.mock("../check-property-names.action", () => ({
  checkPropertyNamesAction: vi.fn(),
}));
vi.mock("../../create-property/create-audience-property.action", () => ({
  createAudiencePropertyAction: vi.fn(),
}));
// A native select, so a test picks an option by its label the way a reader does.
vi.mock("../../ui/options-select", () => ({
  OptionsSelect: (props: {
    id: string;
    value: string;
    options: { value: string; label: string }[];
    disabled: boolean;
    describedBy?: string;
    onChange: (value: string) => void;
  }) => (
    <select
      id={props.id}
      value={props.value}
      disabled={props.disabled}
      aria-describedby={props.describedBy}
      onChange={(event) => props.onChange(event.target.value)}
    >
      <option value="">Choose</option>
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

function created(name: string, variableName: string): AudienceProperty {
  return { ...AGE, id: variableName, name, variableName };
}

function pick(field: string | RegExp, option: string) {
  const select = screen.getByLabelText(field) as HTMLSelectElement;
  const match = Array.from(select.options).find((o) => o.text === option);
  fireEvent.change(select, { target: { value: match?.value } });
}

const BRANDS_CSV =
  "external_id,brands__nike,brands__puma,brands__adidas,brands__other,brands__other_text\n" +
  "CG-1,1,0,1,0,\nCG-2,0,1,0,1,Reebok\n";

const BRANDS = "Columns brands__";

async function openGroupOnColumns(csv = BRANDS_CSV) {
  renderPanel(BACKGROUND, [AGE]);
  await waitFor(() => expect(getAudienceImportAction).toHaveBeenCalled());
  fireEvent.click(button("Import CSV"));
  chooseFile(csv);
  await screen.findByText(/panel\.csv: 2 rows/);
  fireEvent.click(continueButton());
}

describe("ImportCsvPanel: a new multiple-choice property from a __ column group", () => {
  beforeEach(() => {
    resetPanelMocks();
    vi.mocked(checkPropertyNamesAction).mockReset();
    vi.mocked(checkPropertyNamesAction).mockResolvedValue(Result.success([]));
    vi.mocked(createAudiencePropertyAction).mockReset();
    vi.mocked(createAudiencePropertyAction).mockResolvedValue(
      Result.success({
        ...created("Brands", "brands"),
        dataType: AudienceDataType.MultipleChoice,
        choicesJson: '["nike","puma","adidas"]',
        allowsOther: true,
      }),
    );
    vi.mocked(startAudienceImportAction).mockResolvedValue(
      Result.success(
        view({ upload: { rowCount: 2, chunkSize: 1_000, missingChunks: [0] } }),
      ),
    );
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
      Result.success(view({ status: "checking" })),
    );
  });

  it("shows the group as one row with its column count and choices, counted once", async () => {
    // Act
    await openGroupOnColumns();

    // Assert
    const select = screen.getByLabelText(BRANDS) as HTMLSelectElement;
    expect(select.selectedOptions[0]?.text).toBe(
      "Create 'Brands' (multiple choice)",
    );
    expect(
      screen.getByText("5 columns: nike · puma · adidas, and Other."),
    ).toBeTruthy();
    expect(screen.getByText("0 mapped, 1 to create, 0 ignored")).toBeTruthy();
    expect(screen.queryByLabelText("brands__nike")).toBeNull();
  });

  it("creates the property with the suffixes as choices and Other allowed, then imports the columns by name", async () => {
    // Arrange
    await openGroupOnColumns();
    fireEvent.click(continueButton());
    await screen.findByLabelText(`Name for ${BRANDS}`);

    // Assert
    expect(
      (screen.getByLabelText(`Name for ${BRANDS}`) as HTMLInputElement).value,
    ).toBe("Brands");
    expect(
      screen.getByText("Multiple choice: nike · puma · adidas, and Other."),
    ).toBeTruthy();

    // Act
    fireEvent.click(button("Create 1 property"));

    // Assert
    await waitFor(() => expect(startAudienceImportAction).toHaveBeenCalled());
    expect(createAudiencePropertyAction).toHaveBeenCalledWith({
      formId: "1",
      name: "Brands",
      dataType: AudienceDataType.MultipleChoice,
      choicesJson: '["nike","puma","adidas"]',
      allowsOther: true,
    });
    expect(startAudienceImportAction).toHaveBeenCalledWith(
      expect.objectContaining({ propertyColumns: {} }),
    );
  });

  it("does not allow Other when the file has no __other columns", async () => {
    // Arrange
    await openGroupOnColumns(
      "external_id,brands__nike,brands__puma,brands__adidas\nCG-1,1,0,1\nCG-2,0,1,0\n",
    );

    // Assert
    expect(screen.getByText("3 columns: nike · puma · adidas.")).toBeTruthy();

    // Act
    fireEvent.click(continueButton());
    await screen.findByLabelText(`Name for ${BRANDS}`);
    fireEvent.click(button("Create 1 property"));

    // Assert
    await waitFor(() =>
      expect(createAudiencePropertyAction).toHaveBeenCalled(),
    );
    expect(createAudiencePropertyAction).toHaveBeenCalledWith(
      expect.objectContaining({
        choicesJson: '["nike","puma","adidas"]',
        allowsOther: false,
      }),
    );
  });

  it("imports none of the group's columns when it is not imported", async () => {
    // Arrange
    await openGroupOnColumns();

    // Act
    pick(BRANDS, "Don't import");

    // Assert
    expect(screen.getByText("0 mapped, 0 to create, 1 ignored")).toBeTruthy();
    fireEvent.click(continueButton());
    await waitFor(() => expect(startAudienceImportAction).toHaveBeenCalled());
    expect(createAudiencePropertyAction).not.toHaveBeenCalled();
  });

  it("keeps the name to one whose variable reads the columns", async () => {
    // Arrange
    await openGroupOnColumns();
    fireEvent.click(continueButton());
    const name = await screen.findByLabelText(`Name for ${BRANDS}`);

    // Act
    fireEvent.change(name, { target: { value: "Brand list" } });

    // Assert
    expect(
      screen.getByText(
        "The columns are read by Variable brands, so keep a name that gives brands.",
      ),
    ).toBeTruthy();
    expect((button("Create 1 property") as HTMLButtonElement).disabled).toBe(
      true,
    );

    // Act
    fireEvent.change(name, { target: { value: "BRANDS!" } });

    // Assert
    expect((button("Create 1 property") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("says a group's name stays when the form already writes its variable, and still creates it", async () => {
    // Arrange
    vi.mocked(checkPropertyNamesAction).mockResolvedValue(
      Result.success([{ variable: "brands", declaredBy: "question" }]),
    );
    await openGroupOnColumns();
    fireEvent.click(continueButton());

    // Assert
    expect(
      await screen.findByText(
        "A question in this form already writes brands: the property would replace its answers. These columns are read as brands, so the name stays; to leave them out, go Back and choose Don't import.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Use / })).toBeNull();
    expect((button("Create 1 property") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("creates the group before a plain column of the same name, so a refusal lands on the column", async () => {
    // Arrange
    await openGroupOnColumns(
      "external_id,brands,brands__nike,brands__puma\nCG-1,x,1,0\nCG-2,y,0,1\n",
    );
    fireEvent.click(continueButton());
    await screen.findByLabelText(`Name for ${BRANDS}`);

    // Act
    fireEvent.click(button("Create 2 properties"));

    // Assert
    await waitFor(() =>
      expect(createAudiencePropertyAction).toHaveBeenCalledTimes(2),
    );
    expect(
      vi
        .mocked(createAudiencePropertyAction)
        .mock.calls.map(([input]) => input.dataType),
    ).toEqual([AudienceDataType.MultipleChoice, AudienceDataType.SingleChoice]);
  });
});

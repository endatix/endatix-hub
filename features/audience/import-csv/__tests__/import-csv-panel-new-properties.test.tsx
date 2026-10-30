import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

const CSV =
  "external_id,age,segment,region\nCG-1,65,A,North\nCG-2,79,B,South\nCG-3,70,A,East\n";

function created(name: string, variableName: string): AudienceProperty {
  return { ...AGE, id: variableName, name, variableName };
}

function pick(field: string | RegExp, option: string) {
  const select = screen.getByLabelText(field) as HTMLSelectElement;
  const match = Array.from(select.options).find((o) => o.text === option);
  fireEvent.change(select, { target: { value: match?.value } });
}

const track = () => screen.getByRole("list");
const nameInput = (column: string) =>
  screen.getByLabelText(`Name for ${column}`) as HTMLInputElement;

async function openOnColumns() {
  renderPanel(BACKGROUND, [AGE]);
  await waitFor(() => expect(getAudienceImportAction).toHaveBeenCalled());
  fireEvent.click(button("Import CSV"));
  chooseFile(CSV);
  await screen.findByText(/panel\.csv: 3 rows/);
  fireEvent.click(continueButton());
}

async function openOnNewProperties() {
  await openOnColumns();
  pick("region", "Don't import");
  fireEvent.click(continueButton());
  await screen.findByLabelText("Name for segment");
}

describe("ImportCsvPanel: new properties from the file's columns", () => {
  beforeEach(() => {
    resetPanelMocks();
    vi.mocked(checkPropertyNamesAction).mockReset();
    vi.mocked(checkPropertyNamesAction).mockResolvedValue(Result.success([]));
    vi.mocked(createAudiencePropertyAction).mockReset();
    vi.mocked(startAudienceImportAction).mockResolvedValue(
      Result.success(
        view({ upload: { rowCount: 3, chunkSize: 1_000, missingChunks: [0] } }),
      ),
    );
    vi.mocked(sendAudienceImportChunkAction).mockResolvedValue(
      Result.success(view({ status: "checking" })),
    );
  });

  it("queues a column no property is named like, and the tally and steps show it", async () => {
    // Act
    await openOnColumns();

    // Assert
    expect(screen.getByText("1 mapped, 2 to create, 0 ignored")).toBeTruthy();
    expect(within(track()).getByText("New properties")).toBeTruthy();
    expect(
      screen.getByText(/Continue goes on to the new properties/),
    ).toBeTruthy();

    // Act
    pick("segment", "Don't import");
    pick("region", "Don't import");

    // Assert
    expect(screen.getByText("1 mapped, 0 to create, 2 ignored")).toBeTruthy();
    expect(within(track()).queryByText("New properties")).toBeNull();
    expect(
      screen.getByText(/Continue sends the file and checks it/),
    ).toBeTruthy();
    fireEvent.click(continueButton());
    await waitFor(() => expect(startAudienceImportAction).toHaveBeenCalled());
    expect(startAudienceImportAction).toHaveBeenCalledWith(
      expect.objectContaining({ propertyColumns: { age: "age" } }),
    );
    expect(createAudiencePropertyAction).not.toHaveBeenCalled();
  });

  it("suggests a name and a type with its evidence, and creates the type chosen before the import starts", async () => {
    // Arrange
    vi.mocked(createAudiencePropertyAction).mockResolvedValue(
      Result.success(created("Segment", "segment")),
    );
    await openOnNewProperties();

    // Assert
    expect(nameInput("segment").value).toBe("Segment");
    expect(
      (screen.getByLabelText("Type for segment") as HTMLSelectElement).value,
    ).toBe(AudienceDataType.SingleChoice);
    expect(
      screen.getByText("Suggested from values like A · B: 2 distinct values."),
    ).toBeTruthy();

    // Act
    pick("Type for segment", "Text");
    fireEvent.click(button("Create 1 property"));

    // Assert
    await waitFor(() => expect(startAudienceImportAction).toHaveBeenCalled());
    expect(createAudiencePropertyAction).toHaveBeenCalledWith({
      formId: "1",
      name: "Segment",
      dataType: AudienceDataType.Text,
      choicesJson: null,
    });
    expect(startAudienceImportAction).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyColumns: { age: "age", segment: "segment" },
      }),
    );
    expect(
      vi.mocked(createAudiencePropertyAction).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(startAudienceImportAction).mock.invocationCallOrder[0],
    );
  });

  it("creates a suggested single choice with the column's values as its choices", async () => {
    // Arrange
    vi.mocked(createAudiencePropertyAction).mockResolvedValue(
      Result.success(created("Segment", "segment")),
    );
    await openOnNewProperties();

    // Act
    fireEvent.click(button("Create 1 property"));

    // Assert
    await waitFor(() =>
      expect(createAudiencePropertyAction).toHaveBeenCalled(),
    );
    expect(createAudiencePropertyAction).toHaveBeenCalledWith({
      formId: "1",
      name: "Segment",
      dataType: AudienceDataType.SingleChoice,
      choicesJson: '["A","B"]',
    });
  });

  it("warns when a form question already writes the name and offers a free one, without blocking", async () => {
    // Arrange
    vi.mocked(checkPropertyNamesAction).mockResolvedValue(
      Result.success([{ variable: "segment", declaredBy: "question" }]),
    );

    // Act
    await openOnNewProperties();

    // Assert
    expect(
      await screen.findByText(/A question in this form already writes segment/),
    ).toBeTruthy();
    expect(checkPropertyNamesAction).toHaveBeenCalledWith(
      "1",
      expect.arrayContaining(["segment", "segment_2"]),
    );
    expect((button("Create 1 property") as HTMLButtonElement).disabled).toBe(
      false,
    );

    // Act
    fireEvent.click(button("Use Segment 2"));

    // Assert
    expect(nameInput("segment").value).toBe("Segment 2");
    expect(screen.queryByText(/already writes/)).toBeNull();
  });

  it("disables Create while the name check for Continue is still running", async () => {
    // Arrange
    vi.mocked(createAudiencePropertyAction).mockResolvedValue(
      Result.success(created("Segment", "segment")),
    );
    let answer: (
      value: Result<{ variable: string; declaredBy: "question" }[]>,
    ) => void = () => undefined;
    vi.mocked(checkPropertyNamesAction).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    await openOnNewProperties();

    // Act
    fireEvent.click(button("Create 1 property"));

    // Assert
    expect((button("Creating…") as HTMLButtonElement).disabled).toBe(true);
    answer(Result.success([]));
    await waitFor(() =>
      expect(createAudiencePropertyAction).toHaveBeenCalled(),
    );
  });

  it("waits for the form check still running before it creates anything", async () => {
    // Arrange
    let answer: (
      value: Result<{ variable: string; declaredBy: "question" }[]>,
    ) => void = () => undefined;
    vi.mocked(checkPropertyNamesAction).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    await openOnNewProperties();

    // Act
    fireEvent.click(button("Create 1 property"));
    answer(Result.success([{ variable: "segment", declaredBy: "question" }]));

    // Assert
    expect(
      await screen.findByText(/A question in this form already writes segment/),
    ).toBeTruthy();
    expect(createAudiencePropertyAction).not.toHaveBeenCalled();
  });

  it("does not create when the name check fails, and Retry asks again", async () => {
    // Arrange
    vi.mocked(checkPropertyNamesAction)
      .mockResolvedValueOnce(Result.error("The form could not be read."))
      .mockResolvedValueOnce(Result.error("The form could not be read."))
      .mockResolvedValue(Result.success([]));
    vi.mocked(createAudiencePropertyAction).mockResolvedValue(
      Result.success(created("Segment", "segment")),
    );
    await openOnNewProperties();

    // Act
    fireEvent.click(button("Create 1 property"));

    // Assert
    expect(
      await screen.findByText("Couldn't check the names. Try again."),
    ).toBeTruthy();
    expect(createAudiencePropertyAction).not.toHaveBeenCalled();

    // Act
    fireEvent.click(button("Retry"));

    // Assert
    await waitFor(() =>
      expect(createAudiencePropertyAction).toHaveBeenCalled(),
    );
  });

  it("asks the form again after a check that failed", async () => {
    // Arrange
    vi.mocked(checkPropertyNamesAction)
      .mockResolvedValueOnce(Result.error("The form could not be read."))
      .mockResolvedValue(
        Result.success([{ variable: "segment", declaredBy: "question" }]),
      );
    await openOnNewProperties();
    await waitFor(() =>
      expect(checkPropertyNamesAction).toHaveBeenCalledTimes(1),
    );

    // Act
    fireEvent.blur(nameInput("segment"));

    // Assert
    expect(
      await screen.findByText(/A question in this form already writes segment/),
    ).toBeTruthy();
  });

  it("keeps a created single choice mapped to its column after Back", async () => {
    // Arrange
    vi.mocked(createAudiencePropertyAction).mockResolvedValue(
      Result.success({
        ...created("Segment", "segment"),
        dataType: AudienceDataType.SingleChoice,
        choicesJson: '["A","B"]',
      }),
    );
    vi.mocked(startAudienceImportAction).mockResolvedValue(
      Result.validationError("The import could not start."),
    );
    await openOnNewProperties();
    fireEvent.click(button("Create 1 property"));
    await screen.findByText("The import could not start.");

    // Act
    fireEvent.click(button("Back"));

    // Assert
    const select = (await screen.findByLabelText(
      "segment",
    )) as HTMLSelectElement;
    expect(select.value).toBe("segment");
    expect(screen.queryByText(/fill only from columns named like/)).toBeNull();
  });

  it("warns when an existing property already has the name", async () => {
    // Arrange
    await openOnNewProperties();

    // Act
    fireEvent.change(nameInput("segment"), { target: { value: "Age" } });
    fireEvent.blur(nameInput("segment"));

    // Assert
    expect(
      await screen.findByText(/A property of this form already has age/),
    ).toBeTruthy();
    expect(button("Use Age 2")).toBeTruthy();
  });

  it("holds Continue while a new property's name cannot become a variable name", async () => {
    // Arrange
    await openOnNewProperties();

    // Act
    fireEvent.change(nameInput("segment"), { target: { value: "  " } });

    // Assert
    expect((button("Create 1 property") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("creates nothing when the scripter goes back before confirming", async () => {
    // Arrange
    await openOnNewProperties();

    // Act
    fireEvent.click(button("Back"));

    // Assert
    expect(await screen.findByText("Identifier column")).toBeTruthy();
    expect(createAudiencePropertyAction).not.toHaveBeenCalled();
    expect(startAudienceImportAction).not.toHaveBeenCalled();
  });

  it("stops before the import starts when a create fails, and a retry creates each property once", async () => {
    // Arrange
    vi.mocked(createAudiencePropertyAction)
      .mockResolvedValueOnce(Result.success(created("Segment", "segment")))
      .mockResolvedValueOnce(Result.validationError("Region is not allowed."))
      .mockResolvedValueOnce(Result.success(created("Region", "region")));
    await openOnColumns();
    fireEvent.click(continueButton());
    await screen.findByLabelText("Name for region");

    // Act
    fireEvent.click(button("Create 2 properties"));

    // Assert
    expect(await screen.findByText("Region is not allowed.")).toBeTruthy();
    expect(startAudienceImportAction).not.toHaveBeenCalled();

    // Act
    fireEvent.click(button("Create 1 property"));

    // Assert
    await waitFor(() => expect(startAudienceImportAction).toHaveBeenCalled());
    expect(createAudiencePropertyAction).toHaveBeenCalledTimes(3);
    expect(startAudienceImportAction).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyColumns: { age: "age", segment: "segment", region: "region" },
      }),
    );
  });
});

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
    expect(screen.getByText("3 columns: nike · puma · adidas.")).toBeTruthy();
    fireEvent.click(continueButton());
    await screen.findByLabelText(`Name for ${BRANDS}`);

    // Act
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
});

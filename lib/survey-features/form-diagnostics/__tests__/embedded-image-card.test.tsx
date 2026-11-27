import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import { DesignerRuntimeProvider } from "@/lib/designer-runtime";
import { DesignSurveyProvider } from "../../designer/design-survey.context";
import {
  OriginalImageUploadContext,
  type StoreImage,
} from "../../rich-text/ui/image-upload-context";
import { bindConversionSource } from "../conversion-session";
import { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";
import { FormDiagnosticsView } from "../ui/form-diagnostics-tab";
import { convertChoicesToDataListAction } from "@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action";
vi.mock("@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action", () => ({
  convertChoicesToDataListAction: vi.fn(),
}));

function open(canEdit: boolean, store: StoreImage | null) {
  const creator = new SurveyCreatorModel();
  const source = {
    logo: "data:image/png;base64,iVBORw0KGgo=",
    elements: [{ type: "text", name: "one" }],
  };
  creator.JSON = source;
  bindConversionSource(creator, source);
  render(
    <DesignerRuntimeProvider initialState={{ canConvertImages: canEdit }}>
      <DesignSurveyProvider>
        <OriginalImageUploadContext.Provider value={store}>
          <FormDiagnosticsView model={new FormDiagnosticsPlugin(creator)} />
        </OriginalImageUploadContext.Provider>
      </DesignSurveyProvider>
    </DesignerRuntimeProvider>,
  );
  const region = within(
    screen.getByRole("region", { name: "Embedded images" }),
  );
  fireEvent.click(region.getByRole("button", { name: "Review images" }));
  return region;
}

it("opens checks on a no-action form and distinguishes settings from successful checks", () => {
  const creator = new SurveyCreatorModel();
  const source = { elements: [{ type: "text", name: "comment" }] };
  creator.JSON = source;
  bindConversionSource(creator, source);
  render(<FormDiagnosticsView model={new FormDiagnosticsPlugin(creator)} />);
  expect(screen.getByRole("heading", { name: "No action needed" })).toBeTruthy();
  const details = screen.getByText("All checks and settings").closest("section")!;
  expect(within(details).getByRole("button").getAttribute("aria-expanded")).toBe("true");
  expect(details.textContent).toContain("Checked · none embedded");
  expect(details.textContent).toContain("Not available");
  expect(details.textContent).toContain("Disabled");
});

it("offers a custom threshold for small dropdowns only after inspection, without creating a data list", () => {
  const creator = new SurveyCreatorModel();
  const source = { elements: [{ type: "dropdown", name: "region", choices: ["East", "West"] }] };
  creator.JSON = source;
  bindConversionSource(creator, source);
  const plugin = new FormDiagnosticsPlugin(creator);
  plugin.formId = "12";
  render(<DesignerRuntimeProvider initialState={{canCreateListCopy:true}}><FormDiagnosticsView model={plugin} /></DesignerRuntimeProvider>);
  expect(screen.queryByLabelText("Minimum choices required for conversion")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"Review choice lists"}));
  fireEvent.change(screen.getByLabelText("Minimum choices required for conversion"), { target: { value: "2" } });
  expect(screen.getByText("region")).toBeTruthy();
  expect(convertChoicesToDataListAction).not.toHaveBeenCalled();
});

it("reviews a single placement without making an upload", () => {
  // Arrange & Act
  const store = vi.fn();
  const view = open(true, store);

  // Assert
  expect(
    view.getByRole("button", { name: "Convert 1 placement" }),
  ).toBeTruthy();
  expect(store).not.toHaveBeenCalled();
  expect(document.activeElement?.textContent).toBe("What will change");
});

it("reports a finding with storage disabled and omits conversion without edit access", () => {
  // Arrange & Act
  const view = open(false, null);
  expect(view.getByText(/Benefit if converted/)).toBeTruthy();
  expect(document.activeElement?.textContent).toBe("Placement details");

  // Assert
  expect(view.getByText(/storage is disabled/)).toBeTruthy();
  expect(
    view.queryByRole("button", { name: "Convert 1 placement" }),
  ).toBeNull();
});

it("omits conversion for a read-only author even with storage enabled", () => {
  // Arrange & Act
  const view = open(false, vi.fn());
  expect(view.getByText("Needs edit access")).toBeTruthy();
  expect(view.getByText(/Benefit if converted/)).toBeTruthy();

  // Assert
  expect(
    view.queryByRole("button", { name: "Convert 1 placement" }),
  ).toBeNull();
});

it("identifies the failed placement, retries it, and shows the converted placement for review", async () => {
  // Arrange
  const store = vi.fn().mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce("https://storage.example/content/f/1/logo.png");
  const view = open(true, store);

  // Act
  fireEvent.click(view.getByRole("button", { name: "Convert 1 placement" }));
  await view.findByText(/Upload failed at Survey · logo\. No changes applied/);
  fireEvent.click(view.getByRole("button", { name: "Retry conversion" }));
  fireEvent.click(await view.findByRole("button", { name: "View changes" }));

  // Assert
  expect(view.getByRole("status").textContent).toContain("1 placement converted using 1 stored image. 0 skipped.");
  expect(view.getByText("Measured definition size")).toBeTruthy();
  expect(view.queryByText(/Estimate/i)).toBeNull();
  expect(view.getByRole("list", { name: "Image placements" }).textContent).toContain("logo · File 1");
  expect(view.queryByRole("button", { name: "Retry conversion" })).toBeNull();
  expect(store).toHaveBeenCalledTimes(2);
});

it("cancels a pending transfer and lets the editor reuse the confirmed upload", async () => {
  // Arrange
  const pending = Promise.withResolvers<string>();
  const store = vi.fn(() => pending.promise);
  const view = open(true, store);

  // Act
  const convert = view.getByRole<HTMLButtonElement>("button", { name: "Convert 1 placement" });
  fireEvent.click(convert);
  expect(convert.disabled).toBe(true);
  fireEvent.click(view.getByRole("button", { name: "Cancel" }));
  await act(async () => pending.resolve("https://storage.example/content/f/1/logo.png"));

  // Assert
  expect(view.getByRole("status").textContent).toContain("Cancelled. No changes applied.");
  fireEvent.click(view.getByRole("button", { name: "Close" }));
  fireEvent.click(view.getByRole("button", { name: "Review images" }));
  fireEvent.click(view.getByRole("button", { name: "Convert 1 placement" }));
  await view.findByRole("button", { name: "View changes" });
  expect(store).toHaveBeenCalledTimes(1);
});

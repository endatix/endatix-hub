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
import { EmbeddedImageCard } from "../ui/embedded-image-card";

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
          <EmbeddedImageCard model={new FormDiagnosticsPlugin(creator)} />
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

it("reviews a single placement without making an upload", () => {
  // Arrange & Act
  const store = vi.fn();
  const view = open(true, store);

  // Assert
  expect(
    view.getByRole("button", { name: "Convert 1 placement" }),
  ).toBeTruthy();
  expect(store).not.toHaveBeenCalled();
});

it("reports a finding with storage disabled and omits conversion without edit access", () => {
  // Arrange & Act
  const view = open(false, null);

  // Assert
  expect(view.getByText(/storage is disabled/)).toBeTruthy();
  expect(
    view.queryByRole("button", { name: "Convert 1 placement" }),
  ).toBeNull();
});

it("omits conversion for a read-only author even with storage enabled", () => {
  // Arrange & Act
  const view = open(false, vi.fn());

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
  expect(view.getByRole("list", { name: "Image placements" }).textContent).toContain("Survey · logo");
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

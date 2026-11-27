import { fireEvent, render, screen, within } from "@testing-library/react";
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

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConvertLargeChoiceLists } from "../ui/convert-large-choice-lists";
import type { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";

vi.mock("@/features/data-lists/search-data-lists-for-picker", () => ({
  searchDataListNamesForPicker: vi.fn(() =>
    Promise.reject(new Error("Network error")),
  ),
}));

vi.mock(
  "@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action",
  () => ({ convertChoicesToDataListAction: vi.fn() }),
);

vi.mock("@/features/forms/application/actions/create-form.action", () => ({
  createFormAction: vi.fn(),
}));

const surveyWithLargeDropdown = {
  pages: [
    {
      name: "page1",
      elements: [
        {
          type: "dropdown",
          name: "country",
          choices: Array.from({ length: 12 }, (_, i) => `Choice ${i + 1}`),
        },
      ],
    },
  ],
};

function pluginFor(survey: object): FormDiagnosticsPlugin {
  return {
    creator: { text: JSON.stringify(survey) },
    availableDataListNames: [],
    formName: "Survey",
  } as unknown as FormDiagnosticsPlugin;
}

describe("ConvertLargeChoiceLists", () => {
  it("shows the error when the conversion run fails", async () => {
    render(
      <ConvertLargeChoiceLists model={pluginFor(surveyWithLargeDropdown)} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /convert with confirmation/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start conversion" }));

    expect(await screen.findByText("Network error")).toBeTruthy();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { surveyLocalization } from "survey-core";
import { Survey } from "survey-react-ui";
import { expect, it } from "vitest";
import { createLocalizedModel } from "@/lib/localization/create-localized-model";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import { initializeRespondentLanguage } from "../../application/use-language-selection.hook";
import { LanguageSelector } from "../language-selector";

it("renders Chinese controls and the authored zh-CN title on first display and reselection", async () => {
  // Arrange
  stubResizeObserver();
  expect(Object.keys(surveyLocalization.locales)).toEqual(["en"]);
  const model = await createLocalizedModel({
    locale: "zh-CN",
    elements: [
      {
        type: "text",
        name: "name",
        title: { default: "Name", "zh-CN": "姓名" },
      },
    ],
  });
  expect(model.completeText).toBe("提交问卷");

  // Act
  initializeRespondentLanguage(model);
  const view = render(<Survey model={model} />);

  // Assert
  expect(screen.getByText("姓名")).toBeTruthy();
  expect(screen.getByRole("button", { name: "提交问卷" })).toBeTruthy();
  view.rerender(
    <>
      <LanguageSelector
        surveyModel={model}
        availableLocales={model.getUsedLocales()}
      />
      <Survey model={model} />
    </>,
  );
  selectLanguage("english");
  expect(screen.getByText("Name")).toBeTruthy();
  selectLanguage("简体中文");
  expect(screen.getByText("姓名")).toBeTruthy();
  expect(screen.getByRole("button", { name: "提交问卷" })).toBeTruthy();
});

function selectLanguage(name: string) {
  fireEvent.click(screen.getByPlaceholderText("Select language"));
  fireEvent.click(screen.getByRole("option", { name }));
}

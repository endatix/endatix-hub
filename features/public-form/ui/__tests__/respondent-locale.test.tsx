import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { surveyLocalization } from "survey-core";
import { Survey } from "survey-react-ui";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createLocalizedModel } from "@/lib/localization/create-localized-model";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import { initializeRespondentLanguage } from "../../application/use-language-selection.hook";
import { LanguageSelector } from "../language-selector";

beforeEach(() => {
  localStorage.clear();
  stubResizeObserver();
});
afterEach(cleanup);

it("renders Chinese controls and the authored zh-CN title on first display and reselection", async () => {
  // Arrange
  expect(surveyLocalization.locales["zh-cn"]).toBeUndefined();
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

it("switches authored AR text to RTL on an LTR host and restores LTR for English", async () => {
  // Arrange
  const model = await createLocalizedModel({
    elements: [
      { type: "text", name: "name", title: { default: "Name", AR: "الاسم" } },
    ],
  });
  render(
    <div dir="ltr">
      <LanguageSelector
        surveyModel={model}
        availableLocales={model.getUsedLocales()}
      />
      <Survey model={model} />
    </div>,
  );

  // Act
  selectLanguage("العربية");

  // Assert
  expect(screen.getByText("الاسم").closest("[dir]")?.getAttribute("dir")).toBe(
    "rtl",
  );
  expect(screen.getByRole("button", { name: "إرسال البيانات" })).toBeTruthy();
  selectLanguage("english");
  expect(screen.getByText("Name").closest("[dir]")?.getAttribute("dir")).toBe(
    "ltr",
  );
});

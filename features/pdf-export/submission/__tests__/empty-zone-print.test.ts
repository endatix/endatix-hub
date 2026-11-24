import { createElement } from "react";
import { Model } from "survey-core";
import { expect, it, vi } from "vitest";
import { Document, Page, pdf } from "@react-pdf/renderer";
import PdfDragCategorizeAnswer from "@/lib/questions/drag-categorize/drag-categorize.pdf-answer";
import { registerDragCategorizeModel } from "@/lib/questions/drag-categorize/drag-categorize.registry";
import { contrastRatio, parseCssColor } from "@/lib/branding/color";
import { currentPdfStyles, withPdfStyles } from "../../theme/pdf-theme-context";
import "../submission-details-pdf";
import { printedInk } from "./printed-ink";

it.each([undefined, "#888888"])("prints an empty zone legibly beside an answered zone on %s paper", async (paper) => {
  // Arrange
  registerDragCategorizeModel();
  const surveyModel = new Model({ elements: [{
    type: "dragcategorize", name: "sort", choices: ["Pear"], zones: ["Filled", "Empty"],
  }] });
  surveyModel.data = { sort: { Filled: ["Pear"] } };
  const themeModel = paper && JSON.stringify({ cssVariables: { "--sjs-general-backcolor": paper } });
  const question = surveyModel.getQuestionByName("sort");
  const onRender = vi.fn();
  // Act
  await withPdfStyles({ themeModel }, () => pdf(createElement(Document, { onRender },
    createElement(Page, { style: currentPdfStyles().page },
      createElement(PdfDragCategorizeAnswer, { question })),
  )).toBlob());
  // Assert
  const ink = new Map(printedInk(onRender.mock.lastCall![0]._INTERNAL__LAYOUT__DATA_));
  expect(ink.has("Pear")).toBe(true);
  expect(contrastRatio(parseCssColor(ink.get("No items")!)!, parseCssColor(paper ?? "#ffffff")!)).toBeGreaterThanOrEqual(4.5);
});

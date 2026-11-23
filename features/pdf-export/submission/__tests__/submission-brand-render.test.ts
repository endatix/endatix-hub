import { createElement, type JSX } from "react";
import { pdf } from "@react-pdf/renderer";
import sharp from "sharp";
import { Model } from "survey-core";
import { expect, it } from "vitest";
import type { Submission } from "@/lib/endatix-api";
import type { PdfBrandIdentity } from "@/lib/branding/pdf.server";
import { SubmissionDetailsPdf } from "../submission-details-pdf";

const submission: Submission = {
  id: "42",
  formId: "7",
  formDefinitionId: "8",
  isComplete: false,
  status: "draft",
  currentPage: 0,
  createdAt: new Date("2026-01-01"),
  token: "",
  metadata: "{}",
  jsonData: JSON.stringify({ question: "Example answer" }),
};

async function render(identity?: PdfBrandIdentity) {
  const surveyModel = new Model({
    elements: [{ type: "text", name: "question" }],
  });
  surveyModel.data = JSON.parse(submission.jsonData);
  const document: JSX.Element = createElement(SubmissionDetailsPdf, {
    submission,
    surveyModel,
    identity,
  });
  return (await pdf(document).toBlob()).text();
}

it("embeds a real image only in the concurrent export that has a logo", async () => {
  // Arrange
  const png = await sharp({
    create: { width: 5, height: 3, channels: 3, background: "#224488" },
  })
    .png()
    .toBuffer();
  const nameOnly = { productName: "Fieldwork", footerText: "Fieldwork Ltd." };
  const withLogo = {
    ...nameOnly,
    accentBar: "#aa1144",
    logo: `data:image/png;base64,${png.toString("base64")}`,
  };

  // Act
  const [branded, plain, minimal] = await Promise.all([
    render(withLogo),
    render(),
    render(nameOnly),
  ]);

  // Assert: inspect the PDF image objects, not the props passed to the renderer.
  expect(branded).toContain("/Subtype /Image");
  expect(branded).toContain("/Width 5");
  for (const other of [plain, minimal]) {
    expect(other).toMatch(/^%PDF-/);
    expect(other).not.toContain("/Subtype /Image");
  }
});

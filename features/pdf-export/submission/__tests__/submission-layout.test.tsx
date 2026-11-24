import type { PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
import { Model } from "survey-core";
import { it, expect, vi } from "vitest";
import { submission } from "./submission-fixture";
import type { PdfBrandIdentity } from "@/lib/branding/pdf.server";
import { PdfBrandHeader } from "../pdf-brand-chrome";
import { SubmissionDetailsPdf } from "../submission-details-pdf";

vi.mock("@react-pdf/renderer", async (original) => {
  const pdf = await original<typeof import("@react-pdf/renderer")>();
  const box = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    ...pdf,
    Document: box,
    Page: box,
    View: box,
    Text: box,
    Image: () => <span data-testid="image" />,
  };
});

it("prints the page and panel headings once before their answered questions", () => {
  // Arrange
  const surveyModel = new Model({
    pages: [
      {
        name: "visit",
        title: "Visit overview",
        elements: [
          {
            type: "panel",
            name: "notes",
            title: "Field notes",
            elements: [
              { type: "text", name: "site" },
              { type: "text", name: "area" },
            ],
          },
        ],
      },
    ],
  });
  surveyModel.data = { site: "Oak", area: "North" };

  // Act
  render(
    <SubmissionDetailsPdf surveyModel={surveyModel} submission={submission} />,
  );

  // Assert
  for (const text of ["Visit overview", "Field notes", "Oak", "North"]) {
    expect(screen.queryAllByText(text)).toHaveLength(1);
  }
});

it.each(["icon", "wordmark", "form"] as const)(
  "uses the %s without doubling a wordmark",
  (kind) => {
    // Arrange
    const identity: PdfBrandIdentity = {
      productName: "Fieldwork",
      footerText: "Fieldwork Ltd.",
      logo: { kind, src: "mark.png" },
    };

    // Act
    render(<PdfBrandHeader identity={identity} />);

    // Assert
    expect(screen.queryAllByTestId("image")).toHaveLength(1);
    expect(screen.queryAllByText("Fieldwork")).toHaveLength(
      kind === "wordmark" ? 0 : 1,
    );
  },
);

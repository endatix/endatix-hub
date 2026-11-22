import { render } from "@testing-library/react";
import { Model, PanelModel } from "survey-core";
import { RichTextImagePolicy } from "@/components/common/rich-text";
import { describe, expect, it } from "vitest";
import { PipedText } from "../piped-text";

const ALLOWED_HOSTS = ["cdn.example.com"];
const renderWithPolicy = (ui: React.ReactElement) =>
  render(
    <RichTextImagePolicy allowedHosts={ALLOWED_HOSTS}>
      {ui}
    </RichTextImagePolicy>,
  );

const AUTHOR_HTML = '<img src="https://cdn.example.com/acme.png"><p>ACME</p>';
const RESPONDENT_HTML =
  '<a href="https://phish.example" target="_top">ACME</a><img src="https://track.example/p.gif">';

function panelWithBrand(brand: string): PanelModel {
  const model = new Model({
    elements: [
      {
        type: "checkbox",
        name: "brands",
        choices: [{ value: "acme", text: AUTHOR_HTML }],
      },
      {
        type: "paneldynamic",
        name: "loop",
        templateTitle: "Brand: {panel.brand}",
        templateElements: [{ type: "text", name: "brand" }],
      },
    ],
  });
  model.data = { loop: [{ brand }] };
  const loop = model.getQuestionByName("loop") as unknown as {
    panels: PanelModel[];
  };
  return loop.panels[0];
}

describe("PipedText", () => {
  it("renders an author choice text piped into a panel header as rich text", () => {
    const { container } = renderWithPolicy(
      <PipedText source={panelWithBrand(AUTHOR_HTML)} />,
    );

    expect(container.querySelector("img[loading=lazy]")).not.toBeNull();
    expect(container.textContent).toBe("Brand: ACME");
  });

  it("renders a respondent answer piped into a panel header as plain text", () => {
    const { container } = renderWithPolicy(
      <PipedText source={panelWithBrand(RESPONDENT_HTML)} />,
    );

    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("Brand: ACME");
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Model, type Question } from "survey-core";
import type { PrefillSource } from "../../coverage/prefill-match";
import {
  mountPrefillMark,
  repaintPrefillMarks,
} from "../prefill-canvas";

const STYLESHEET = "features/forms/ui/editor/prefill-canvas.css";
const ICON_HEAD = "M12 3.8a3.2 3.2 0 1 0 .02 0z";

const CITY: PrefillSource = {
  type: "text",
  variable: "city",
  title: "City",
  prefillTargets: [{ type: "text" }],
};
const RENEWS: PrefillSource = {
  type: "text",
  variable: "renews_at",
  title: "Renews at",
  prefillTargets: [
    { type: "text" },
    { type: "text", inputType: "datetime-local" },
  ],
};

const models: Model[] = [];

function question(expression: string): Question {
  const model = new Model({
    elements: [
      { type: "text", name: "q", defaultValueExpression: expression },
    ],
  });
  models.push(model);
  const found = model.getQuestionByName("q");
  if (!found) throw new Error("missing question");
  return found;
}

function canvas(): { host: HTMLElement; inner: HTMLElement } {
  const host = document.createElement("div");
  host.className = "svc-question__content";
  const inner = document.createElement("div");
  host.append(inner);
  document.body.append(host);
  return { host, inner };
}

afterEach(() => {
  document.body.replaceChildren();
  models.splice(0).forEach((model) => model.dispose());
});

describe("prefill canvas mark", () => {
  it("rings a question whose expression names a known Property", () => {
    // Arrange
    const { host, inner } = canvas();
    const asked = question("{city}");

    // Act
    mountPrefillMark(inner, asked, () => [CITY, RENEWS], "42");

    // Assert
    expect(host.classList.contains("edx-prefilled")).toBe(true);
    const button = host.querySelector("button");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.getAttribute("aria-label")).toBe("Prefilled from City");
    expect(button?.innerHTML).toContain(ICON_HEAD);
    const pop = host.querySelector(".edx-prefill-pop");
    expect(pop?.querySelector("strong")?.textContent).toBe("Prefilled from City");
    expect(pop?.querySelector("span")?.textContent).toBe("Property on this form");
    const link = pop?.querySelector("a");
    expect(link?.textContent).toBe("Properties");
    expect(link?.getAttribute("href")).toBe(
      "/forms/42/audience?view=properties",
    );
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener");
    const selectQuestion = vi.fn();
    host.addEventListener("click", selectQuestion);
    link?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(selectQuestion).not.toHaveBeenCalled();
  });

  it("rings a date-time prefill and drops the ring when the expression becomes a calculation", () => {
    // Arrange
    const { host, inner } = canvas();
    const asked = question("edxLocalDateTime({renews_at})");
    mountPrefillMark(inner, asked, () => [CITY, RENEWS], "42");
    expect(host.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Prefilled from Renews at",
    );

    // Act
    asked.defaultValueExpression = "{age} * 12";

    // Assert
    expect(host.classList.contains("edx-prefilled")).toBe(false);
    expect(host.querySelector("button")).toBeNull();
  });

  it("leaves a calculation and an unknown Property unmarked", () => {
    // Arrange
    const calculated = canvas();
    const unknown = canvas();

    // Act
    mountPrefillMark(
      calculated.inner,
      question("{age} * 12"),
      () => [CITY],
      "42",
    );
    mountPrefillMark(unknown.inner, question("{missing}"), () => [CITY], "42");

    // Assert
    expect(calculated.host.classList.contains("edx-prefilled")).toBe(false);
    expect(unknown.host.classList.contains("edx-prefilled")).toBe(false);
  });

  it("uses the Property's current title when the variables are read again", () => {
    // Arrange
    const { host, inner } = canvas();
    const sources = [CITY];
    mountPrefillMark(inner, question("{city}"), () => sources, "42");

    // Act
    sources[0] = { ...CITY, title: "Home city" };
    repaintPrefillMarks();

    // Assert
    expect(host.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Prefilled from Home city",
    );
  });
});

describe("prefill canvas mark styles", () => {
  const css = readFileSync(path.join(process.cwd(), STYLESHEET), "utf8");
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("draws the clinic emerald ring outside the designer selection", () => {
    // Act & Assert
    expect(rules).toMatch(
      /\.svc-creator \.svc-question__content\.edx-prefilled\s*\{[^}]*outline:\s*2px dashed oklch\(0\.55 0\.14 163\)/,
    );
    expect(rules).toMatch(/outline-offset:\s*3px/);
    expect(rules).not.toMatch(/animation/);
    expect(rules).not.toMatch(/--primary/);
  });

  it("shows the title on hover and keyboard focus, from a 22px button", () => {
    // Act & Assert
    expect(rules).toMatch(/width:\s*22px/);
    expect(rules).toMatch(/height:\s*22px/);
    expect(rules).toMatch(/background:\s*oklch\(0\.55 0\.14 163\)/);
    expect(rules).toMatch(
      /\.edx-prefill-mark:hover \.edx-prefill-pop[\s\S]*\.edx-prefill-mark:focus-within \.edx-prefill-pop/,
    );
  });

  it("is loaded by the form designer", () => {
    // Act & Assert
    expect(
      readFileSync(
        path.join(
          process.cwd(),
          "features/forms/ui/editor/form-editor-container.tsx",
        ),
        "utf8",
      ),
    ).toContain("./prefill-canvas.css");
  });
});

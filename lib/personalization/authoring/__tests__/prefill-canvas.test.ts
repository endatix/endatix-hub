import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Model, type Question } from "survey-core";
import type { PrefillSource } from "../../coverage/prefill-match";
import {
  clearPrefillMarks,
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

function question(expression: string, type = "text"): Question {
  const model = new Model({
    elements: [{ type, name: "q", defaultValueExpression: expression }],
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
  clearPrefillMarks();
  document.body.replaceChildren();
  models.splice(0).forEach((model) => model.dispose());
});

describe("prefill canvas chip", () => {
  it("labels a prefilled question with its Property and links to Properties", () => {
    // Arrange
    const { host, inner } = canvas();

    // Act
    mountPrefillMark(inner, question("{city}"), () => [CITY, RENEWS], "42");

    // Assert
    const chip = host.querySelector<HTMLAnchorElement>(
      ":scope > a.edx-prefill-chip",
    );
    expect(chip?.textContent).toBe("Prefilled from City");
    expect(chip?.getAttribute("aria-label")).toBe(
      "Prefilled from City. Opens the form's Properties in a new tab",
    );
    expect(chip?.title).toBe("Open the form's Properties in a new tab");
    expect(chip?.getAttribute("href")).toBe(
      "/forms/42/audience?view=properties",
    );
    expect(chip?.target).toBe("_blank");
    expect(chip?.rel).toBe("noopener");
    expect(chip?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(chip?.innerHTML).toContain(ICON_HEAD);
    expect(chip?.classList.contains("edx-prefill-chip--mismatch")).toBe(false);
    expect(host.classList.contains("edx-prefilled")).toBe(false);
  });

  it("keeps the designer from selecting the question when the chip is clicked", () => {
    // Arrange
    const { host, inner } = canvas();
    mountPrefillMark(inner, question("{city}"), () => [CITY], "42");
    const selectQuestion = vi.fn();
    host.addEventListener("pointerdown", selectQuestion);
    host.addEventListener("click", selectQuestion);
    const chip = host.querySelector("a");

    // Act
    chip?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    chip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Assert
    expect(selectQuestion).not.toHaveBeenCalled();
  });

  it("says the question no longer fits when its type is not a prefill target", () => {
    // Arrange
    const { host, inner } = canvas();

    // Act
    mountPrefillMark(inner, question("{city}", "comment"), () => [CITY], "42");

    // Assert
    const chip = host.querySelector("a.edx-prefill-chip");
    expect(chip?.classList.contains("edx-prefill-chip--mismatch")).toBe(true);
    expect(chip?.textContent).toBe("Prefilled from City · does not fit");
    expect(chip?.getAttribute("aria-label")).toBe(
      "Prefilled from City, which does not fit this question. See Diagnostics. Opens the form's Properties in a new tab",
    );
  });

  it("labels a date-time prefill and drops the chip when the expression becomes a calculation", () => {
    // Arrange
    const { host, inner } = canvas();
    const asked = question("edxLocalDateTime({renews_at})");
    mountPrefillMark(inner, asked, () => [CITY, RENEWS], "42");
    expect(host.querySelector("a")?.textContent).toBe(
      "Prefilled from Renews at",
    );

    // Act
    asked.defaultValueExpression = "{age} * 12";

    // Assert
    expect(host.querySelector("a")).toBeNull();
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
    expect(calculated.host.querySelector("a")).toBeNull();
    expect(unknown.host.querySelector("a")).toBeNull();
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
    expect(host.querySelector("a")?.textContent).toBe(
      "Prefilled from Home city",
    );
  });

  it("stops following a question once the designer is gone", () => {
    // Arrange
    const { host, inner } = canvas();
    const asked = question("{city}");
    mountPrefillMark(inner, asked, () => [CITY], "42");

    // Act
    clearPrefillMarks();
    host.querySelector("a")?.remove();
    asked.defaultValueExpression = "{renews_at}";
    repaintPrefillMarks();

    // Assert
    expect(host.querySelector("a")).toBeNull();
  });
});

describe("prefill canvas chip styles", () => {
  const css = readFileSync(path.join(process.cwd(), STYLESHEET), "utf8");
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

  it("names SurveyJS tokens only, with no literal colour or fallback", () => {
    // Act & Assert
    expect(rules).not.toMatch(/#[0-9a-f]{3,8}\b|oklch|rgb|hsl/i);
    expect(rules).not.toMatch(/var\(--[a-z0-9-]+,/);
    expect(rules).not.toMatch(/var\(--(?!sjs2-)/);
    expect(rules).not.toMatch(/outline:\s*2px dashed/);
  });

  it("shows a keyboard focus ring and a warning tone for a mismatch", () => {
    // Act & Assert
    expect(rules).toMatch(
      /\.edx-prefill-chip:focus-visible\s*\{[^}]*var\(--sjs2-color-utility-a11y\)/,
    );
    expect(rules).toMatch(
      /\.edx-prefill-chip--mismatch\s*\{[^}]*var\(--sjs2-color-bg-warning-secondary\)/,
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

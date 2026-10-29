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

function question(
  expression: string,
  type = "text",
  inputType?: string,
): Question {
  const model = new Model({
    elements: [
      { type, inputType, name: "q", defaultValueExpression: expression },
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
  clearPrefillMarks();
  document.body.replaceChildren();
  models.splice(0).forEach((model) => model.dispose());
});

const AGE: PrefillSource = {
  type: "text",
  inputType: "number",
  variable: "age",
  title: "Age",
  prefillTargets: [{ type: "text", inputType: "number" }],
};

const chipIn = (host: HTMLElement) =>
  host.querySelector<HTMLAnchorElement>(":scope a.edx-prefill-chip");
const cardIn = (host: HTMLElement) =>
  host.querySelector<HTMLElement>(":scope .edx-prefill-card");

describe("prefill canvas chip", () => {
  it("names the Property on the chip and explains it on a hover card", () => {
    // Arrange
    const { host, inner } = canvas();

    // Act
    mountPrefillMark(
      inner,
      question("{age}", "text", "number"),
      () => [CITY, AGE],
      "42",
    );

    // Assert
    const chip = chipIn(host);
    const card = cardIn(host);
    expect(chip?.textContent).toBe("Age");
    expect(chip?.getAttribute("aria-label")).toBe("Prefilled from Age");
    expect(chip?.getAttribute("aria-describedby")).toBe(card?.id);
    expect(card?.getAttribute("role")).toBe("tooltip");
    expect(card?.textContent).toBe(
      "Prefilled from Age" +
        "Starts this answer with the participant's Age, a number Property. Respondents can change it." +
        "Click to open Properties in a new tab",
    );
    expect(chip?.getAttribute("href")).toBe(
      "/forms/42/audience?view=properties",
    );
    expect(chip?.target).toBe("_blank");
    expect(chip?.rel).toBe("noopener");
    expect(chip?.hasAttribute("title")).toBe(false);
    expect(chip?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(chip?.innerHTML).toContain(ICON_HEAD);
    expect(chip?.classList.contains("edx-prefill-chip--mismatch")).toBe(false);
  });

  it("says a read-only prefill cannot be changed", () => {
    // Arrange
    const { host, inner } = canvas();
    const asked = question("{city}");
    asked.readOnly = true;

    // Act
    mountPrefillMark(inner, asked, () => [CITY], "42");

    // Assert
    expect(cardIn(host)?.textContent).toContain(
      "a text Property. Respondents can't change it.",
    );
  });

  it("keeps the designer from selecting the question when the chip is clicked", () => {
    // Arrange
    const { host, inner } = canvas();
    mountPrefillMark(inner, question("{city}"), () => [CITY], "42");
    const selectQuestion = vi.fn();
    host.addEventListener("pointerdown", selectQuestion);
    host.addEventListener("click", selectQuestion);
    const chip = chipIn(host);

    // Act
    chip?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    chip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Assert
    expect(selectQuestion).not.toHaveBeenCalled();
  });

  it("says which questions fit when the Property does not fit this one", () => {
    // Arrange
    const { host, inner } = canvas();

    // Act
    mountPrefillMark(inner, question("{age}", "boolean"), () => [AGE], "42");

    // Assert
    const chip = chipIn(host);
    expect(chip?.classList.contains("edx-prefill-chip--mismatch")).toBe(true);
    expect(chip?.textContent).toBe("Age");
    expect(chip?.getAttribute("aria-label")).toBe(
      "Prefilled from Age, which does not fit this question",
    );
    expect(cardIn(host)?.textContent).toBe(
      "Age does not fit this question" +
        "A number Property prefills a Number question. Clear it from Diagnostics." +
        "Click to open Properties in a new tab",
    );
  });

  it("marks a calculation that reads a Property and shows its expression", () => {
    // Arrange
    const { host, inner } = canvas();

    // Act
    mountPrefillMark(inner, question("{age} * 12"), () => [CITY, AGE], "42");

    // Assert
    const chip = chipIn(host);
    expect(chip?.textContent).toBe("Ageƒx");
    expect(chip?.classList.contains("edx-prefill-chip--calculated")).toBe(true);
    expect(chip?.getAttribute("aria-label")).toBe("Calculated from Age");
    expect(cardIn(host)?.querySelector("code")?.textContent).toBe("{age} * 12");
    expect(cardIn(host)?.textContent).toContain(
      "Starts this answer with a value worked out from the participant's Age.",
    );
  });

  it("names every Property a calculation reads, once each", () => {
    // Arrange
    const { host, inner } = canvas();

    // Act
    mountPrefillMark(
      inner,
      question("{city} + ' ' + {Age} + {age} + {missing}"),
      () => [CITY, AGE],
      "42",
    );

    // Assert
    expect(chipIn(host)?.getAttribute("aria-label")).toBe(
      "Calculated from City and Age",
    );
  });

  it("follows an expression edit from a prefill to a calculation", () => {
    // Arrange
    const { host, inner } = canvas();
    const asked = question("edxLocalDateTime({renews_at})");
    mountPrefillMark(inner, asked, () => [CITY, RENEWS, AGE], "42");
    expect(chipIn(host)?.textContent).toBe("Renews at");

    // Act
    asked.defaultValueExpression = "{age} * 12";

    // Assert
    expect(chipIn(host)?.getAttribute("aria-label")).toBe(
      "Calculated from Age",
    );
    expect(host.querySelectorAll(".edx-prefill-chip")).toHaveLength(1);
  });

  it("leaves an expression that reads no known Property unmarked", () => {
    // Arrange
    const plain = canvas();
    const unknown = canvas();

    // Act
    mountPrefillMark(plain.inner, question("today()"), () => [CITY], "42");
    mountPrefillMark(unknown.inner, question("{missing}"), () => [CITY], "42");

    // Assert
    expect(plain.host.querySelector(".edx-prefill-chip")).toBeNull();
    expect(unknown.host.querySelector(".edx-prefill-chip")).toBeNull();
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
    expect(chipIn(host)?.textContent).toBe("Home city");
  });

  it("stops following a question once the designer is gone", () => {
    // Arrange
    const { host, inner } = canvas();
    const asked = question("{city}");
    mountPrefillMark(inner, asked, () => [CITY], "42");

    // Act
    clearPrefillMarks();
    host.querySelector(".edx-prefill")?.remove();
    asked.defaultValueExpression = "{renews_at}";
    repaintPrefillMarks();

    // Assert
    expect(host.querySelector(".edx-prefill-chip")).toBeNull();
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

  it("shows the card on hover and keyboard focus only", () => {
    // Act & Assert
    expect(rules).toMatch(/\.edx-prefill-card\s*\{[^}]*display:\s*none/);
    expect(rules).toMatch(/\.edx-prefill:hover\s*>\s*\.edx-prefill-card/);
    expect(rules).toMatch(
      /\.edx-prefill:focus-within\s*>\s*\.edx-prefill-card/,
    );
  });

  it("lifts the card above SurveyJS's inline title editors (z-index 12)", () => {
    // Act
    const layer = /\.edx-prefill\s*\{[^}]*z-index:\s*(\d+)/.exec(rules);

    // Assert
    expect(Number(layer?.[1])).toBeGreaterThan(12);
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

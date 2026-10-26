import { describe, expect, it } from "vitest";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { reviewAudience } from "../review";
import { usageVerdicts } from "../audience-usage";
import { audienceUsage } from "../usage";

function variables(
  definition: object[] = [
    { type: "dropdown", name: "tier", title: "Tier", choices: ["gold"] },
    { type: "text", name: "seats", title: "Seats", inputType: "number" },
  ],
): AudienceVariables {
  return {
    variablePresets: {
      definition: { elements: definition },
      presets: [],
      totalPresets: 0,
    },
    coverage: { participants: { test: 0, real: 0 }, properties: [] },
    editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    readOnlyPresets: [],
  };
}

const form = (...elements: object[]) => ({ elements });
const usesBoth = { type: "text", name: "both", title: "{tier} {seats}" };

describe("reviewAudience", () => {
  it("suggests the variable a misspelled reference meant, with a fix", () => {
    const json = form(usesBoth, {
      type: "text",
      name: "plan",
      title: "Your plan is {tierr}",
    });

    const { findings } = reviewAudience(json, variables());

    expect(findings).toEqual([
      expect.objectContaining({
        kind: "unknown-variable",
        variable: "tierr",
        elementName: "plan",
        suggestion: "tier",
        fix: expect.objectContaining({
          edits: [expect.objectContaining({ value: "Your plan is {tier}" })],
        }),
      }),
    ]);
  });

  it("reports a reference nothing declares, without a suggestion", () => {
    const json = form(usesBoth, { type: "html", name: "hi", html: "{city}" });

    const { findings } = reviewAudience(json, variables());

    expect(findings).toEqual([
      expect.objectContaining({
        kind: "unknown-variable",
        variable: "city",
        suggestion: undefined,
        fix: undefined,
      }),
    ]);
  });

  // The API names a Property's variable by lower-casing its name and joining ASCII letter and digit
  // runs with `_`; only a name that survives that unchanged is declared by adding it.
  it("offers Add as Audience property only for a name a Property would keep", () => {
    // Arrange
    const json = form(usesBoth, {
      type: "html",
      name: "hi",
      html: "{City_2} {_region}",
    });

    // Act
    const { findings } = reviewAudience(json, variables());

    // Assert
    expect(
      findings.map((f) =>
        f.kind === "unknown-variable" ? [f.variable, f.canAddProperty] : f,
      ),
    ).toEqual([
      ["City_2", true],
      ["_region", false],
    ]);
  });

  // OSS caps a Property name at 100 characters, so a longer {name} can't be declared by adding one.
  it("offers Add as Audience property only up to the API's 100-character name", () => {
    // Arrange
    const longest = "a".repeat(100);
    const tooLong = "b".repeat(101);
    const json = form(usesBoth, {
      type: "html",
      name: "hi",
      html: `{${longest}} {${tooLong}}`,
    });

    // Act
    const { findings } = reviewAudience(json, variables());

    // Assert
    expect(
      findings.map((f) =>
        f.kind === "unknown-variable" ? [f.variable, f.canAddProperty] : f,
      ),
    ).toEqual([
      [longest, true],
      [tooLong, false],
    ]);
  });

  it("does not warn about custom variables", () => {
    const json = {
      calculatedValues: [{ name: "campaign" }],
      ...form(usesBoth, { type: "text", name: "c", title: "{campaign}" }),
    };

    expect(reviewAudience(json, variables()).findings).toEqual([]);
  });

  it("warns when a question's name collides with a variable", () => {
    const json = form(usesBoth, { type: "text", name: "seats" });

    expect(reviewAudience(json, variables()).findings).toContainEqual(
      expect.objectContaining({
        kind: "variable-collision",
        variable: "seats",
        elementName: "seats",
        declaredBy: "question",
      }),
    );
  });

  it("says when a calculated value collides with a variable", () => {
    const json = {
      calculatedValues: [{ name: "seats", expression: "1" }],
      ...form(usesBoth),
    };

    expect(reviewAudience(json, variables()).findings).toContainEqual(
      expect.objectContaining({
        kind: "variable-collision",
        variable: "seats",
        declaredBy: "calculatedValue",
      }),
    );
  });

  it("leaves an unknown segment inside a question to the linter", () => {
    const json = form(usesBoth, {
      type: "html",
      name: "hi",
      html: "{both.nope}",
    });

    expect(reviewAudience(json, variables()).findings).toEqual([]);
  });

  it("names a property the form never reads", () => {
    const json = form({
      type: "text",
      name: "q",
      visibleIf: "{tier} = 'gold'",
    });

    expect(reviewAudience(json, variables()).findings).toEqual([
      { kind: "unused-property", variableName: "seats" },
    ]);
  });

  it.each([
    ["piped text", { type: "text", name: "q", title: "Hi {Seats}" }],
    ["a condition", { type: "text", name: "q", enableIf: "{seats} > 2" }],
    [
      "a default",
      { type: "text", name: "q", defaultValueExpression: "{seats} * 2" },
    ],
    [
      "choice text",
      {
        type: "radiogroup",
        name: "q",
        choices: [{ value: "a", text: "Seats: {seats}" }],
      },
    ],
  ])("counts a property read in %s as used", (_, element) => {
    const json = form({ type: "text", name: "t", title: "{tier}" }, element);

    expect(reviewAudience(json, variables()).findings).toEqual([]);
  });

  it("counts a property read by a trigger as used", () => {
    const json = {
      ...form({ type: "text", name: "t", title: "{tier}" }),
      triggers: [{ type: "complete", expression: "{seats} > 100" }],
    };

    expect(reviewAudience(json, variables()).findings).toEqual([]);
  });

  it("reads a question type only the browser registers, with no finding about it", () => {
    const json = form(
      { type: "tenant-rating", name: "rating", visibleIf: "{tier} = 'gold'" },
      { type: "tenant-rating", name: "count", title: "{seats} seats" },
    );

    const { findings } = reviewAudience(json, variables());

    expect(findings).toEqual([]);
  });

  it("reviews nothing when the form has no properties", () => {
    const none = { ...variables(), variablePresets: null };

    const json = form({ type: "html", name: "h", html: "{x}" });

    expect(reviewAudience(json, none).findings).toEqual([]);
  });
});

describe("Audience coverage", () => {
  const counted = (
    real: number,
    properties: { variableName: string; filledReal: number }[],
  ): AudienceVariables => ({
    ...variables(),
    coverage: {
      participants: { test: 1, real },
      properties: properties.map((p) => ({ ...p, filledTest: 1 })),
    },
  });
  const readsTier = form({ type: "text", name: "q", title: "{tier}" });
  const verdicts = (json: object, read: AudienceVariables) => {
    const usage = audienceUsage(json, read);
    if (!usage) throw new Error("expected Properties");
    return usageVerdicts(usage);
  };

  it("says whether the form reads a property, and how many filled it in", () => {
    const review = verdicts(
      readsTier,
      counted(40, [
        { variableName: "tier", filledReal: 38 },
        { variableName: "seats", filledReal: 40 },
      ]),
    );

    expect(review.forProperty("tier")).toEqual({
      used: true,
      filledReal: 38,
      real: 40,
    });
    expect(review.forProperty("Seats")).toEqual({
      used: false,
      filledReal: 40,
      real: 40,
    });
  });

  it("warns when real participants have not filled in a property the form reads", () => {
    const review = reviewAudience(
      readsTier,
      counted(40, [{ variableName: "tier", filledReal: 38 }]),
    );

    expect(review.findings).toContainEqual({
      kind: "not-filled-in",
      variableName: "tier",
      filledReal: 38,
      real: 40,
    });
  });

  it("does not warn about a property every participant filled in, or one the form never reads", () => {
    const review = reviewAudience(
      readsTier,
      counted(40, [
        { variableName: "tier", filledReal: 40 },
        { variableName: "seats", filledReal: 0 },
      ]),
    );

    expect(review.findings.map((f) => f.kind)).not.toContain("not-filled-in");
  });

  it("counts a property a question also names as used", () => {
    const json = form(
      { type: "text", name: "seats" },
      { type: "text", name: "q", title: "{tier}" },
    );
    const read = counted(40, [{ variableName: "seats", filledReal: 40 }]);

    const review = reviewAudience(json, read);

    expect(review.findings.map((f) => f.kind)).not.toContain("unused-property");
    expect(verdicts(json, read).forProperty("seats").used).toBe(true);
  });

  it("lists what one participant has not filled in, among what the form reads", () => {
    const review = verdicts(
      form({ type: "text", name: "q", title: "{tier} {seats}" }),
      variables(),
    );

    expect(review.notFilledIn(["seats"])).toEqual(["tier"]);
    expect(review.notFilledIn(["TIER", "seats"])).toEqual([]);
  });

  it("sends only the Property names the form reads", () => {
    const usage = audienceUsage(
      form({ type: "text", name: "q", title: "{Tier} {city} {seats}" }),
      variables(),
    );

    expect(usage?.read).toEqual(["tier", "seats"]);
  });

  it("knows nothing without properties", () => {
    expect(
      audienceUsage(readsTier, { ...variables(), variablePresets: null }),
    ).toBeNull();
  });
});

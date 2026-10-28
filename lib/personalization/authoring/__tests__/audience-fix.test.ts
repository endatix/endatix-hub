import { describe, expect, it } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { bindAudienceToCreator } from "..";

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

describe("Audience fix in the designer", () => {
  it("offers no fix for a translated text the canvas cannot take", async () => {
    const creator = new SurveyCreatorModel({});
    creator.JSON = form(usesBoth, {
      type: "text",
      name: "plan",
      title: { default: "Your plan is {tierr}", de: "Ihr Plan: {tierr}" },
    });
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: () => Promise.resolve(Result.success(variables())),
    });

    const { findings } = await binding.review();
    const fixes = findings.map((finding) =>
      "fix" in finding ? finding.fix : undefined,
    );

    expect(fixes.every((fix) => fix === undefined)).toBe(true);
  });

  it("keeps an earlier fix when a second one comes from the same review", async () => {
    // Arrange
    const creator = new SurveyCreatorModel({});
    creator.JSON = form(usesBoth, {
      type: "text",
      name: "plan",
      title: "{tierr} for {seatz}",
    });
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: () => Promise.resolve(Result.success(variables())),
    });
    const { findings } = await binding.review();

    // Act
    findings.forEach((finding) => binding.applyFix(finding));

    // Assert
    expect(creator.survey.getQuestionByName("plan").title).toBe(
      "{tier} for {seats}",
    );
  });

  it("clears a prefill whose question type no longer fits, and leaves read-only", async () => {
    // Arrange
    const read = variables([
      {
        type: "text",
        name: "age",
        title: "Age",
        inputType: "number",
        prefillTargets: [{ type: "text", inputType: "number" }],
      },
      {
        type: "text",
        name: "renews_at",
        title: "Renews at",
        prefillTargets: [{ type: "text", inputType: "datetime-local" }],
      },
    ]);
    const creator = new SurveyCreatorModel({});
    creator.JSON = form(
      {
        type: "text",
        name: "city",
        defaultValueExpression: "{age}",
        readOnly: true,
      },
      {
        type: "comment",
        name: "note",
        defaultValueExpression: "edxLocalDateTime({renews_at})",
        readOnly: false,
      },
    );
    const binding = bindAudienceToCreator(creator, {
      variables: read,
      refresh: () => Promise.resolve(Result.success(read)),
    });
    const mismatches = (await binding.review()).findings.filter(
      (finding) => finding.kind === "prefill-type-mismatch",
    );

    // Act
    mismatches.forEach((finding) => binding.applyFix(finding));

    // Assert
    const city = creator.survey.getQuestionByName("city");
    const note = creator.survey.getQuestionByName("note");
    expect(city.defaultValueExpression).toBeUndefined();
    expect(city.readOnly).toBe(true);
    expect(note.defaultValueExpression).toBeUndefined();
    expect(note.readOnly).toBe(false);
    expect(
      (await binding.review()).findings.filter(
        (finding) => finding.kind === "prefill-type-mismatch",
      ),
    ).toEqual([]);
    creator.undo();
    creator.undo();
    expect(creator.survey.getQuestionByName("city").defaultValueExpression).toBe(
      "{age}",
    );
    expect(
      creator.survey.getQuestionByName("note").defaultValueExpression,
    ).toBe("edxLocalDateTime({renews_at})");
  });

  it("respells the reference on the canvas, as one undoable edit", async () => {
    const creator = new SurveyCreatorModel({});
    creator.JSON = form(usesBoth, {
      type: "text",
      name: "plan",
      title: "Your plan is {tierr}",
    });
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: () => Promise.resolve(Result.success(variables())),
    });
    const [finding] = (await binding.review()).findings;

    binding.applyFix(finding);

    expect(creator.survey.getQuestionByName("plan").title).toBe(
      "Your plan is {tier}",
    );
    expect((await binding.review()).findings).toEqual([]);
    creator.undo();
    expect(creator.survey.getQuestionByName("plan").title).toBe(
      "Your plan is {tierr}",
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { type BoundAudience, bindAudienceToCreator } from "..";

function variables(...names: string[]): AudienceVariables {
  return {
    variablePresets: {
      definition: { elements: names.map((name) => ({ type: "text", name })) },
      presets: [],
      totalPresets: 0,
    },
    coverage: { participants: { test: 0, real: 0 }, properties: [] },
    editing: { allowAdd: true, allowEdit: true, allowDelete: false },
    readOnlyPresets: [],
  };
}

type AddProperty = NonNullable<BoundAudience["addProperty"]>;

function designer() {
  const creator = new SurveyCreatorModel({});
  creator.JSON = {
    elements: [{ type: "text", name: "plan", title: "{tier} in {city}" }],
  };
  return creator;
}

const unknownNames = async (binding: { review: () => Promise<unknown> }) => {
  const { findings } = (await binding.review()) as {
    findings: { kind: string; variable?: string; canAddProperty?: boolean }[];
  };
  return findings
    .filter((f) => f.kind === "unknown-variable")
    .map((f) => [f.variable, f.canAddProperty]);
};

describe("Add as Audience property", () => {
  it("adds a Property named after the variable, and the warning clears", async () => {
    // Arrange
    const creator = designer();
    const addProperty = vi.fn<AddProperty>(() =>
      Promise.resolve(Result.success(undefined)),
    );
    const binding = bindAudienceToCreator(creator, {
      variables: variables("tier"),
      refresh: () => Promise.resolve(Result.success(variables("tier", "city"))),
      addProperty,
    });
    const [finding] = (await binding.review()).findings;

    // Act
    await binding.addProperty(finding);

    // Assert
    expect(addProperty).toHaveBeenCalledWith("city");
    expect(await unknownNames(binding)).toEqual([]);
  });

  it("is not offered when the designer cannot add Properties", async () => {
    // Arrange
    const binding = bindAudienceToCreator(designer(), {
      variables: variables("tier"),
      refresh: () => Promise.resolve(Result.success(variables("tier"))),
    });

    // Act & Assert
    expect(await unknownNames(binding)).toEqual([["city", false]]);
  });

  it("keeps the warning and shows an error when adding fails", async () => {
    // Arrange
    const creator = designer();
    const notify = vi.spyOn(creator, "notify");
    const refresh = vi.fn(() =>
      Promise.resolve(Result.success(variables("tier"))),
    );
    const binding = bindAudienceToCreator(creator, {
      variables: variables("tier"),
      refresh,
      addProperty: () =>
        Promise.resolve(
          Result.validationError(
            "An audience property with variable name 'city' already exists on this form.",
          ),
        ),
    });
    const [finding] = (await binding.review()).findings;

    // Act
    await binding.addProperty(finding);

    // Assert
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("already exists on this form."),
      "error",
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(await unknownNames(binding)).toEqual([["city", true]]);
  });

  it("adds once when the author clicks twice", async () => {
    // Arrange
    const addProperty = vi.fn<AddProperty>(() =>
      Promise.resolve(Result.success(undefined)),
    );
    const binding = bindAudienceToCreator(designer(), {
      variables: variables("tier"),
      refresh: () => Promise.resolve(Result.success(variables("tier", "city"))),
      addProperty,
    });
    const [finding] = (await binding.review()).findings;

    // Act
    await Promise.all([
      binding.addProperty(finding),
      binding.addProperty(finding),
    ]);

    // Assert
    expect(addProperty).toHaveBeenCalledTimes(1);
  });

  it("adds nothing for a finding that does not offer it", async () => {
    // Arrange
    const addProperty = vi.fn<AddProperty>();
    const binding = bindAudienceToCreator(designer(), {
      variables: variables("tier"),
      refresh: () => Promise.resolve(Result.success(variables("tier"))),
      addProperty,
    });

    // Act
    await binding.addProperty({
      kind: "unused-property",
      variableName: "tier",
    });

    // Assert
    expect(addProperty).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import type { ISurveyVariablePreset } from "survey-core";
import { SurveyCreatorModel, type TabTestPlugin } from "survey-creator-core";
import {
  AudienceIdentifierKind,
  type AudienceVariablePreset,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { type BoundAudience, bindAudienceToCreator } from "..";

const MARIA = "maria@acme.test";
const BOB = "bob@acme.test";
const ANA = "ana@acme.test";

const FORM_JSON = {
  elements: [{ type: "text", name: "plan", title: "Your plan is {tier}" }],
};

function variables(
  presets: AudienceVariablePreset[] = [
    { name: MARIA, variables: { tier: "gold" } },
    { name: BOB, variables: { tier: "silver" } },
  ],
  readOnlyPresets: string[] = [BOB],
): AudienceVariables {
  return {
    variablePresets: {
      definition: { elements: [{ type: "text", name: "tier" }] },
      presets,
      totalPresets: presets.length,
    },
    coverage: { participants: { test: 1, real: 1 }, properties: [] },
    editing: { allowAdd: true, allowEdit: true, allowDelete: false },
    readOnlyPresets,
  };
}

type Save = NonNullable<BoundAudience["testParticipants"]>["save"];

function designer() {
  const creator = new SurveyCreatorModel({ showPreview: true });
  creator.JSON = FORM_JSON;
  return creator;
}

function bind(
  creator: SurveyCreatorModel,
  overrides: Partial<BoundAudience> & { save?: Save } = {},
) {
  const { save, ...rest } = overrides;
  return bindAudienceToCreator(creator, {
    variables: variables(),
    refresh: () => Promise.resolve(Result.success(variables())),
    testParticipants: {
      identifierKind: AudienceIdentifierKind.Email,
      save:
        save ?? vi.fn<Save>(() => Promise.resolve(Result.success(variables()))),
    },
    ...rest,
  });
}

function presetManager(creator: SurveyCreatorModel) {
  return (creator.getPlugin("preview") as TabTestPlugin).variablePresets;
}

function operations(creator: SurveyCreatorModel, name: string) {
  const preset = creator.variablePresets.presets?.find((p) => p.name === name);
  return presetManager(creator).getPresetOperations(
    preset as ISurveyVariablePreset,
  );
}

/** What the editor's Apply does: the whole edited list back into the container. */
function applyEdit(
  creator: SurveyCreatorModel,
  edit: (presets: ISurveyVariablePreset[]) => ISurveyVariablePreset[],
) {
  const presets = structuredClone(creator.variablePresets.presets ?? []);
  presetManager(creator).setPresets(edit(presets));
}

function withTier(name: string, tier: string) {
  return (presets: ISurveyVariablePreset[]) =>
    presets.map((p) => (p.name === name ? { ...p, variables: { tier } } : p));
}

const names = (creator: SurveyCreatorModel) =>
  creator.variablePresets.presets?.map((p) => p.name);

const tierOf = (creator: SurveyCreatorModel, name: string) =>
  creator.variablePresets.presets?.find((p) => p.name === name)?.variables
    ?.tier;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Test participant values editor", () => {
  it("lets the author add and edit Test participants, and never delete one", () => {
    // Arrange
    const creator = designer();

    // Act
    bind(creator);

    // Assert
    expect(presetManager(creator)).toMatchObject({
      allowAdd: true,
      allowEdit: true,
      allowDelete: false,
    });
    expect(operations(creator, MARIA)).toEqual({
      allowEdit: true,
      allowDelete: false,
    });
  });

  it("locks a real participant, so they can't be renamed, edited or deleted", () => {
    // Arrange
    const creator = designer();

    // Act
    bind(creator);

    // Assert
    expect(operations(creator, BOB)).toEqual({
      allowEdit: false,
      allowDelete: false,
    });
  });

  it("keeps the editor read-only when the API allows no editing", () => {
    // Arrange
    const creator = designer();
    const readOnly = {
      ...variables(),
      editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    };

    // Act
    bind(creator, { variables: readOnly });

    // Assert
    expect(presetManager(creator)).toMatchObject({
      allowAdd: false,
      allowEdit: false,
      allowDelete: false,
    });
  });

  it("keeps the editor read-only when the designer cannot save", () => {
    // Arrange
    const creator = designer();

    // Act
    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: () => Promise.resolve(Result.success(variables())),
    });

    // Assert
    expect(presetManager(creator).canEdit).toBe(false);
  });

  it("locks whoever the latest read lists as real", async () => {
    // Arrange
    const creator = designer();
    const fresh = variables(
      [
        { name: MARIA, variables: { tier: "gold" } },
        { name: BOB, variables: { tier: "silver" } },
      ],
      [MARIA],
    );
    const binding = bind(creator, {
      refresh: () => Promise.resolve(Result.success(fresh)),
    });

    // Act
    await binding.refresh();

    // Assert
    expect(binding.readOnlyPresets()).toEqual([MARIA]);
    expect(operations(creator, MARIA).allowEdit).toBe(false);
    expect(operations(creator, BOB).allowEdit).toBe(true);
  });
});

describe("Saving Test participant values", () => {
  it("saves the whole edited list of Test participants in one call", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables())),
    );
    bind(creator, { save });

    // Act
    applyEdit(creator, (presets) => [
      ...withTier(MARIA, "platinum")(presets),
      { name: ANA, variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith([
      { name: MARIA, variables: { tier: "platinum" } },
      { name: ANA, variables: { tier: "bronze" } },
    ]);
  });

  it("leaves out a real participant whose email the author typed with other capitals", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables())),
    );
    bind(creator, { save });

    // Act
    applyEdit(creator, (presets) => [
      ...presets,
      { name: BOB.toUpperCase(), variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(save.mock.calls[0][0].map((p) => p.name)).toEqual([MARIA]);
  });

  it("matches external ids exactly, so another case is a new Test participant", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables())),
    );
    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: () => Promise.resolve(Result.success(variables())),
      testParticipants: {
        identifierKind: AudienceIdentifierKind.ExternalId,
        save,
      },
    });

    // Act
    applyEdit(creator, (presets) => [
      ...presets,
      { name: BOB.toUpperCase(), variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(save.mock.calls[0][0].map((p) => p.name)).toEqual([
      MARIA,
      BOB.toUpperCase(),
    ]);
  });

  it("does not save when the author only picks who to preview as", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>();
    bind(creator, { save });

    // Act
    creator.activeTab = "preview";
    presetManager(creator).active = MARIA;
    await flush();

    // Assert
    expect(save).not.toHaveBeenCalled();
  });

  it("shows the saved values the API read back", async () => {
    // Arrange
    const creator = designer();
    const saved = variables([
      { name: MARIA, variables: { tier: "platinum" } },
      { name: ANA, variables: { tier: "bronze" } },
      { name: BOB, variables: { tier: "silver" } },
    ]);
    bind(creator, { save: () => Promise.resolve(Result.success(saved)) });

    // Act
    applyEdit(creator, (presets) => [
      ...withTier(MARIA, "platinum")(presets),
      { name: ANA, variables: { tier: "bronze" } },
    ]);
    await flush();

    // Assert
    expect(names(creator)).toEqual([MARIA, ANA, BOB]);
  });

  it("keeps the author's edit and shows an error when the save fails", async () => {
    // Arrange
    const creator = designer();
    const notify = vi.spyOn(creator, "notify");
    bind(creator, {
      save: () =>
        Promise.resolve(
          Result.validationError(`${ANA}: 'Tier' must be one of the choices.`),
        ),
    });

    // Act
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("'Tier' must be one of the choices."),
      "error",
    );
  });

  it("shows an error, and keeps the edit, when the save throws", async () => {
    // Arrange
    const creator = designer();
    const notify = vi.spyOn(creator, "notify");
    bind(creator, { save: () => Promise.reject(new Error("offline")) });

    // Act
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
    expect(notify).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("keeps an edit that failed to save when Preview reads the variables again", async () => {
    // Arrange
    const creator = designer();
    const changedOnPeople = variables([
      { name: MARIA, variables: { tier: "gold" } },
      { name: BOB, variables: { tier: "bronze" } },
    ]);
    const binding = bind(creator, {
      save: () => Promise.resolve(Result.error("Server unavailable")),
      refresh: () => Promise.resolve(Result.success(changedOnPeople)),
    });
    applyEdit(creator, (presets) => [
      ...withTier(MARIA, "platinum")(presets),
      { name: ANA, variables: { tier: "bronze" } },
    ]);
    await flush();

    // Act
    await binding.refresh();

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
    expect(tierOf(creator, BOB)).toBe("bronze");
    expect(names(creator)).toEqual([MARIA, BOB, ANA]);
  });

  it("drops a read that started before a save and lands after it", async () => {
    // Arrange
    const creator = designer();
    let landRead: (value: Result<AudienceVariables>) => void = () => {};
    const saved = variables([
      { name: MARIA, variables: { tier: "platinum" } },
      { name: BOB, variables: { tier: "silver" } },
    ]);
    const binding = bind(creator, {
      refresh: () => new Promise((resolve) => (landRead = resolve)),
      save: () => Promise.resolve(Result.success(saved)),
    });
    const staleRead = binding.refresh();

    // Act
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();
    landRead(Result.success(variables()));
    await staleRead;

    // Assert
    expect(tierOf(creator, MARIA)).toBe("platinum");
  });

  it("saves nothing once the designer lets go of the Creator", async () => {
    // Arrange
    const creator = designer();
    const save = vi.fn<Save>();
    const unbind = bind(creator, { save });

    // Act
    unbind();
    applyEdit(creator, withTier(MARIA, "platinum"));
    await flush();

    // Assert
    expect(save).not.toHaveBeenCalled();
  });
});

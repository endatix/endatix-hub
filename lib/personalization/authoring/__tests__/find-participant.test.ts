import { describe, expect, it, vi } from "vitest";
import type { Action, ListModel } from "survey-core";
import { SurveyCreatorModel, type TabTestPlugin } from "survey-creator-core";
import {
  AudienceIdentifierKind,
  type AudienceVariablePreset,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { bindAudienceToCreator, type PreviewAs } from "..";

const MARIA = "maria@acme.test";
const BOB = "bob@acme.test";
const ANA = { name: "ana@acme.test", variables: { tier: "platinum" } };
const FIND_ID = "endatix-find-participant";

const FORM_JSON = {
  elements: [
    {
      type: "text",
      name: "plan",
      title: "Your plan is {tier}",
      defaultValueExpression: "{tier}",
    },
  ],
};

/** A read with Maria (test) and Bob (real) out of `total` participants. */
function variables(total: number): AudienceVariables {
  const presets: AudienceVariablePreset[] = [
    { name: MARIA, variables: { tier: "gold" } },
    { name: BOB, variables: { tier: "silver" } },
  ];
  return {
    variablePresets: {
      definition: { elements: [{ type: "text", name: "tier" }] },
      presets,
      totalPresets: total,
    },
    coverage: { participants: { test: 1, real: total - 1 }, properties: [] },
    editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    readOnlyPresets: [BOB],
  };
}

function preview(creator: SurveyCreatorModel) {
  return creator.getPlugin("preview") as TabTestPlugin;
}

function findAction(creator: SurveyCreatorModel): Action | undefined {
  return preview(creator).model.pages.getActionById(FIND_ID);
}

function selectorTitles(creator: SurveyCreatorModel) {
  const list = preview(creator).model.selectVariablePresetAction.popupModel
    .contentComponentData.model as ListModel;
  return list.actions.map((item) => item.title);
}

type Opened = "after bind" | "before bind";

/** A designer bound with a read of `total` participants, Preview open; `pick` is what Find hands over. */
function designerWith(
  total: number,
  refreshed = variables(total),
  opened: Opened = "after bind",
) {
  const creator = new SurveyCreatorModel({ showPreview: true });
  creator.JSON = FORM_JSON;
  if (opened === "before bind") creator.activeTab = "preview";
  let previewAs: PreviewAs | undefined;
  const onFind = vi.fn((pick: PreviewAs) => (previewAs = pick));
  const binding = bindAudienceToCreator(
    creator,
    {
      variables: variables(total),
      refresh: () => Promise.resolve(Result.success(refreshed)),
    },
    onFind,
  );
  creator.activeTab = "preview";
  const pick = (preset: AudienceVariablePreset, isTest: boolean) => {
    findAction(creator)?.action?.();
    previewAs!(preset, isTest);
  };
  return { creator, binding, onFind, pick };
}

type Save = (
  presets: AudienceVariablePreset[],
) => Promise<Result<AudienceVariables>>;

/** As `designerWith(60)`, saving Test participant values with `save`, edits allowed. */
function designerSaving(save: Save) {
  const creator = new SurveyCreatorModel({ showPreview: true });
  creator.JSON = FORM_JSON;
  const read = {
    ...variables(60),
    editing: { allowAdd: true, allowEdit: true, allowDelete: false },
  };
  let previewAs: PreviewAs | undefined;
  bindAudienceToCreator(
    creator,
    {
      variables: read,
      refresh: () => Promise.resolve(Result.success(read)),
      testParticipants: { identifierKind: AudienceIdentifierKind.Email, save },
    },
    (pick) => (previewAs = pick),
  );
  creator.activeTab = "preview";
  const pick = (preset: AudienceVariablePreset, isTest: boolean) => {
    findAction(creator)?.action?.();
    previewAs!(preset, isTest);
  };
  /** What the editor's Apply does, with `rows` appended and Maria's tier changed. */
  const apply = (...rows: AudienceVariablePreset[]) => {
    const presets = structuredClone(creator.variablePresets.presets ?? []);
    const edited = presets.map((p) =>
      p.name === MARIA ? { ...p, variables: { tier: "platinum" } } : p,
    );
    preview(creator).variablePresets.setPresets([...edited, ...rows]);
  };
  return { creator, pick, apply };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function findActions(creator: SurveyCreatorModel) {
  return preview(creator).model.pages.actions.filter((a) => a.id === FIND_ID);
}

describe("Find participant in the designer's Preview", () => {
  // `?tab=preview`: the Creator is on Preview before the binding attaches.
  it("is offered when Preview was already open at bind time", () => {
    // Act
    const { creator } = designerWith(60, variables(60), "before bind");

    // Assert
    expect(findAction(creator)?.isVisible).toBe(true);
  });

  // The form arriving with Preview open rebuilds its toolbar (TabTestPlugin.update → buildActions).
  it("stays, once, when Preview rebuilds its toolbar", () => {
    // Arrange
    const { creator } = designerWith(60, variables(60), "before bind");

    // Act
    creator.JSON = { ...FORM_JSON, title: "Arrived after the tab" };
    preview(creator).update();

    // Assert
    expect(findActions(creator)).toHaveLength(1);
    expect(findAction(creator)?.isVisible).toBe(true);
  });

  // The screen-out extension calls updateLocalizedStrings, so Creator rebuilds the open tab with no tab change.
  it("comes back when Creator rebuilds the open Preview without a tab change", () => {
    // Arrange
    const { creator } = designerWith(60, variables(60), "before bind");

    // Act
    creator.updateLocalizedStrings();

    // Assert
    expect(findActions(creator)).toHaveLength(1);
    expect(findAction(creator)?.isVisible).toBe(true);
    expect(selectorTitles(creator)[0]).toBe("None");
  });

  it("is removed when the designer lets go of the Creator", () => {
    // Arrange
    const { creator, binding } = designerWith(60);

    // Act
    binding();

    // Assert
    expect(findActions(creator)).toHaveLength(0);
    expect(selectorTitles(creator)).not.toContain("None");
  });

  it("is offered when the form has more participants than the selector lists", () => {
    // Arrange
    const { creator, onFind } = designerWith(60);

    // Act
    findAction(creator)?.action?.();

    // Assert
    expect(findAction(creator)?.isVisible).toBe(true);
    expect(findAction(creator)?.title).toBe("Find participant");
    expect(onFind).toHaveBeenCalledOnce();
  });

  it("is not offered with 20 or fewer participants", () => {
    // Act
    const { creator } = designerWith(2);

    // Assert
    expect(findAction(creator)?.isVisible ?? false).toBe(false);
  });

  it("previews the picked participant with their values and adds them to the selector", () => {
    // Arrange
    const { creator, pick } = designerWith(60);

    // Act
    pick(ANA, false);

    // Assert
    expect(selectorTitles(creator)).toEqual(["None", MARIA, BOB, ANA.name]);
    expect(preview(creator).variablePresets.active).toBe(ANA.name);
    expect(preview(creator).model.survey.getQuestionByName("plan").value).toBe(
      "platinum",
    );
  });

  it("selects a participant already in the selector instead of adding them twice", () => {
    // Arrange
    const { creator, pick } = designerWith(60);

    // Act
    pick({ name: MARIA, variables: { tier: "gold" } }, true);

    // Assert
    expect(selectorTitles(creator)).toEqual(["None", MARIA, BOB]);
    expect(preview(creator).variablePresets.active).toBe(MARIA);
  });

  it("keeps the picked participant for the session when Preview reads again", async () => {
    // Arrange
    const changed = variables(61);
    changed.variablePresets!.presets[0].variables = { tier: "diamond" };
    const { creator, binding, pick } = designerWith(60, changed);
    pick(ANA, false);

    // Act
    await binding.refresh();

    // Assert
    expect(creator.variablePresets?.presets?.map((p) => p.name)).toEqual([
      MARIA,
      BOB,
      ANA.name,
    ]);
    expect(preview(creator).variablePresets.active).toBe(ANA.name);
  });

  it("keeps a picked real participant read-only, so a save leaves them out", async () => {
    // Arrange
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables(60))),
    );
    const { creator, pick, apply } = designerSaving(save);
    pick(ANA, false);

    // Act
    apply();
    await flush();

    // Assert
    expect(save.mock.calls[0][0].map((preset) => preset.name)).toEqual([MARIA]);
    const operations = preview(creator).variablePresets.getPresetOperations(
      creator.variablePresets.presets!.find((p) => p.name === ANA.name)!,
    );
    expect(operations.allowEdit).toBe(false);
  });

  it("leaves out a picked real participant's email written with other capitals", async () => {
    // Arrange
    const save = vi.fn<Save>(() =>
      Promise.resolve(Result.success(variables(60))),
    );
    const { pick, apply } = designerSaving(save);
    pick(ANA, false);

    // Act
    apply({ name: " Ana@ACME.test", variables: { tier: "x" } });
    await flush();

    // Assert
    expect(save.mock.calls[0][0].map((preset) => preset.name)).toEqual([MARIA]);
  });

  it("ignores a pick that lands after the designer let go of the Creator", () => {
    // Arrange
    const { creator, binding, onFind } = designerWith(60);
    findAction(creator)?.action?.();
    const previewAs = onFind.mock.calls[0][0];
    binding();

    // Act
    previewAs(ANA, false);

    // Assert
    expect(selectorTitles(creator)).toEqual([MARIA, BOB]);
    expect(binding.readOnlyPresets()).toEqual([BOB]);
  });

  it("does not make a picked Test participant read-only", () => {
    // Arrange
    const { binding, pick } = designerWith(60);

    // Act
    pick({ name: "tester@acme.test", variables: { tier: "gold" } }, true);

    // Assert
    expect(binding.readOnlyPresets()).toEqual([BOB]);
  });

  it("takes the fresh values when a picked participant is picked again", () => {
    // Arrange
    const { creator, pick } = designerWith(60);
    pick(ANA, false);

    // Act
    pick({ ...ANA, variables: { tier: "diamond" } }, false);

    // Assert
    expect(selectorTitles(creator)).toEqual(["None", MARIA, BOB, ANA.name]);
    expect(preview(creator).model.survey.getQuestionByName("plan").value).toBe(
      "diamond",
    );
  });
});

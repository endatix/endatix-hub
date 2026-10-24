import { describe, expect, it, vi } from "vitest";
import { type ListModel, Model, type SurveyModel } from "survey-core";
import {
  getLocaleStrings,
  SurveyCreatorModel,
  type TabTestPlugin,
} from "survey-creator-core";
import type {
  AudienceVariablePreset,
  AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { applyPersonalizationToModel } from "../../apply-personalization";
import { bindAudienceToCreator } from "..";

const MARIA = "maria@acme.test";
const BOB = "bob@acme.test";

const FORM_JSON = {
  elements: [
    {
      type: "text",
      name: "plan",
      title: "Your plan is {tier}",
      defaultValueExpression: "{tier}",
    },
    { type: "text", name: "seatsTwice", defaultValueExpression: "{seats} * 2" },
    { type: "text", name: "goldOnly", visibleIf: "{tier} = 'gold'" },
  ],
};

function variables(
  presets: AudienceVariablePreset[] = [
    { name: MARIA, variables: { tier: "gold", seats: 12 } },
    { name: BOB, variables: { tier: "silver", seats: 3 } },
  ],
): AudienceVariables {
  return {
    variablePresets: {
      definition: {
        elements: [
          { type: "text", name: "tier", title: "Tier" },
          { type: "text", name: "seats", title: "Seats", inputType: "number" },
        ],
      },
      presets,
      totalPresets: presets.length,
    },
    coverage: {
      participants: { test: presets.length, real: 0 },
      properties: [],
    },
    editing: { allowAdd: false, allowEdit: false, allowDelete: false },
  };
}

const noRefresh = () => Promise.resolve(Result.success(variables()));

function designer(json: object = FORM_JSON) {
  const creator = new SurveyCreatorModel({ showPreview: true });
  creator.JSON = json;
  return creator;
}

function presetManager(creator: SurveyCreatorModel) {
  return (creator.getPlugin("preview") as TabTestPlugin).variablePresets;
}

function previewAs(creator: SurveyCreatorModel, preset: string): SurveyModel {
  creator.activeTab = "preview";
  presetManager(creator).active = preset;
  return (creator.getPlugin("preview") as TabTestPlugin).model.survey;
}

function sharedFormAs(preset: Record<string, unknown>): SurveyModel {
  const model = new Model(FORM_JSON);
  applyPersonalizationToModel(model, { variables: preset });
  return model;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function selectorList(creator: SurveyCreatorModel) {
  const action = (creator.getPlugin("preview") as TabTestPlugin).model
    .selectVariablePresetAction;
  const list = action.popupModel.contentComponentData.model as ListModel;
  return { action, list, titles: () => list.actions.map((item) => item.title) };
}

describe("Preview as in the designer", () => {
  it("lists the form's test participants by identifier", () => {
    const creator = designer();

    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: noRefresh,
    });

    expect(creator.variablePresets?.presets?.map((p) => p.name)).toEqual([
      MARIA,
      BOB,
    ]);
  });

  it("names the selector Preview as, with None, and the editor Test participant values", () => {
    bindAudienceToCreator(designer(), {
      variables: variables(),
      refresh: noRefresh,
    });

    const vp = getLocaleStrings("en").vp;
    expect(vp.selectorTitle).toBe("Preview as");
    expect(vp.noPreset).toBe("None");
    expect(vp.editorTitle).toBe("Test participant values");
  });

  it("never says preset on screen", () => {
    bindAudienceToCreator(designer(), {
      variables: variables(),
      refresh: noRefresh,
    });

    const vp = getLocaleStrings("en").vp as Record<string, string>;
    expect(Object.values(vp).filter((text) => /preset/i.test(text))).toEqual(
      [],
    );
  });

  it("applies only the latest read when Preview opens twice", async () => {
    const creator = designer();
    const reads: ((value: Result<AudienceVariables>) => void)[] = [];
    const refresh = () =>
      new Promise<Result<AudienceVariables>>((resolve) => reads.push(resolve));
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh,
    });

    const first = binding.refresh();
    const second = binding.refresh();
    reads[1](Result.success(variables([{ name: BOB, variables: {} }])));
    reads[0](Result.success(variables([{ name: MARIA, variables: {} }])));
    await Promise.all([first, second]);

    expect(creator.variablePresets?.presets?.map((p) => p.name)).toEqual([BOB]);
  });

  // Edits made there would only reach the local container and vanish on the next Preview open.
  it("keeps the values editor read-only even when the API allows editing", () => {
    const creator = designer();
    const editable = {
      ...variables(),
      editing: { allowAdd: true, allowEdit: true, allowDelete: true },
    };

    bindAudienceToCreator(creator, { variables: editable, refresh: noRefresh });

    expect(presetManager(creator)).toMatchObject({
      allowAdd: false,
      allowEdit: false,
      allowDelete: false,
    });
  });

  it("says how many test participants the selector leaves out", () => {
    const creator = designer();
    const firstPage = variables();
    firstPage.variablePresets!.totalPresets = 35;
    bindAudienceToCreator(creator, {
      variables: firstPage,
      refresh: noRefresh,
    });

    creator.activeTab = "preview";

    const { list, titles } = selectorList(creator);
    expect(titles()).toEqual([
      "None",
      MARIA,
      BOB,
      "33 more in the Audience tab",
    ]);
    expect(list.actions.at(-1)?.enabled).toBe(false);
  });

  it("starts a {variable} default filled, as the shared form does", () => {
    const creator = designer();
    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: noRefresh,
    });

    const preview = previewAs(creator, MARIA);
    const shared = sharedFormAs({ tier: "gold", seats: 12 });

    expect(preview.getQuestionByName("plan").value).toBe("gold");
    expect(preview.getQuestionByName("seatsTwice").value).toBe(24);
    expect(preview.data).toEqual(shared.data);
  });

  it("pipes the participant's values into text and conditions", () => {
    const creator = designer();
    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: noRefresh,
    });

    const asMaria = previewAs(creator, MARIA);
    expect(asMaria.getQuestionByName("plan").locTitle.renderedHtml).toBe(
      "Your plan is gold",
    );
    expect(asMaria.getQuestionByName("goldOnly").isVisible).toBe(true);

    const asBob = previewAs(creator, BOB);
    expect(asBob.getQuestionByName("plan").value).toBe("silver");
    expect(asBob.getQuestionByName("goldOnly").isVisible).toBe(false);
  });

  it("offers None first, and picking it previews without values", () => {
    const creator = designer();
    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: noRefresh,
    });
    previewAs(creator, MARIA);
    const { list, titles } = selectorList(creator);

    expect(titles()).toEqual(["None", MARIA, BOB]);
    list.onItemClick(list.actions[0]);

    const survey = (creator.getPlugin("preview") as TabTestPlugin).model.survey;
    expect(presetManager(creator).active).toBe("");
    expect(survey.getQuestionByName("plan").value).toBeUndefined();
    expect(selectorList(creator).action.title).toBe("Preview as: None");
  });

  it("shows the selector for a form with one test participant", () => {
    const creator = designer();
    bindAudienceToCreator(creator, {
      variables: variables([{ name: MARIA, variables: { tier: "gold" } }]),
      refresh: noRefresh,
    });

    creator.activeTab = "preview";

    const { action, titles } = selectorList(creator);
    expect(action.isVisible).toBe(true);
    expect(titles()).toEqual(["None", MARIA]);
  });

  // The condition editor lists `creator.variablePresetsModel`'s names (it is not exported to test directly).
  it("declares the variables to the condition editor", () => {
    const creator = designer();
    bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: noRefresh,
    });

    expect(creator.variablePresetsModel.getVariableNames()).toEqual([
      "tier",
      "seats",
    ]);
  });

  it("does not read again when a participant is picked", async () => {
    const creator = designer();
    const refresh = vi.fn(noRefresh);
    bindAudienceToCreator(creator, { variables: variables(), refresh });
    creator.activeTab = "preview";
    await flush();
    refresh.mockClear();

    presetManager(creator).active = MARIA;
    await flush();

    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("Preview as refresh", () => {
  it("shows Preview as once a form loaded without properties gets them", async () => {
    const creator = designer();
    const refresh = vi.fn(noRefresh);
    bindAudienceToCreator(creator, {
      variables: { ...variables(), variablePresets: null },
      refresh,
    });
    expect(creator.variablePresets).toBeUndefined();

    creator.activeTab = "preview";
    await flush();

    expect(refresh).toHaveBeenCalledOnce();
    expect(creator.variablePresets?.presets).toHaveLength(2);
  });

  it("keeps what it has when the refresh rejects", async () => {
    const creator = designer();
    const refresh = () => Promise.reject(new Error("Failed to fetch"));
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh,
    });

    await expect(binding.refresh()).resolves.toBeUndefined();

    expect(creator.variablePresets?.presets).toHaveLength(2);
  });

  it("keeps what it has when the variables read cannot be applied", async () => {
    const creator = designer();
    const malformed = variables();
    Object.assign(malformed.variablePresets!, { presets: null });
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: () => Promise.resolve(Result.success(malformed)),
    });

    await expect(binding.refresh()).resolves.toBeUndefined();

    expect(creator.variablePresets?.presets).toHaveLength(2);
  });

  it("keeps the container when the refresh brings the same values", async () => {
    const creator = designer();
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh: noRefresh,
    });
    const before = creator.variablePresets;

    await binding.refresh();

    expect(creator.variablePresets).toBe(before);
  });

  it("reads the variables again when the Preview tab opens", async () => {
    const creator = designer();
    const carol = { name: "carol@acme.test", variables: { tier: "gold" } };
    const refresh = vi.fn(() =>
      Promise.resolve(Result.success(variables([carol]))),
    );
    bindAudienceToCreator(creator, { variables: variables(), refresh });

    creator.activeTab = "preview";
    await flush();

    expect(refresh).toHaveBeenCalledOnce();
    expect(creator.variablePresets?.presets?.map((p) => p.name)).toEqual([
      carol.name,
    ]);
  });

  it("keeps the participant chosen when the refresh still has them", async () => {
    const creator = designer();
    const refresh = vi.fn(() =>
      Promise.resolve(
        Result.success(
          variables([{ name: MARIA, variables: { tier: "platinum" } }]),
        ),
      ),
    );
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh,
    });
    previewAs(creator, MARIA);
    await flush();

    await binding.refresh();

    const survey = (creator.getPlugin("preview") as TabTestPlugin).model.survey;
    expect(presetManager(creator).active).toBe(MARIA);
    expect(survey.getQuestionByName("plan").value).toBe("platinum");
  });

  it("removes Preview as when the form no longer has properties", async () => {
    const creator = designer();
    const refresh = () =>
      Promise.resolve(
        Result.success({ ...variables(), variablePresets: null }),
      );
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh,
    });

    await binding.refresh();

    expect(creator.variablePresets).toBeUndefined();
  });

  it("keeps what it has when the refresh fails", async () => {
    const creator = designer();
    const refresh = () =>
      Promise.resolve(Result.error<AudienceVariables>("Network down"));
    const binding = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh,
    });

    await binding.refresh();

    expect(creator.variablePresets?.presets).toHaveLength(2);
  });

  it("stops reading once unbound", async () => {
    const creator = designer();
    const refresh = vi.fn(noRefresh);
    const unbind = bindAudienceToCreator(creator, {
      variables: variables(),
      refresh,
    });

    unbind();
    creator.activeTab = "preview";
    await flush();

    expect(refresh).not.toHaveBeenCalled();
  });
});

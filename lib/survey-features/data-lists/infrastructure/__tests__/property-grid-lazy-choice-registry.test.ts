import { beforeEach, describe, expect, it, vi } from "vitest";
import { Model, SurveyModel } from "survey-core";
import {
  clearPropertyGridLazyChoiceProvidersForTests,
  getPropertyGridLazyChoiceProvider,
  registerPropertyGridLazyChoiceProvider,
  refreshPropertyGridLazyChoices,
  refreshPropertyGridLazyChoicesForCreator,
} from "../property-grid-lazy-choice-registry";

describe("property-grid-lazy-choice-registry", () => {
  beforeEach(() => {
    clearPropertyGridLazyChoiceProvidersForTests();
  });

  it("enables lazy load on a registered property editor dropdown", () => {
    registerPropertyGridLazyChoiceProvider({
      propertyName: "edxDataListId",
      shouldEnable: () => true,
      loadPage: async () => ({ items: [], total: 0 }),
      resolveDisplayValues: async (_ctx, values) => values,
    });

    const propertyGridSurvey = new Model({
      elements: [{ type: "dropdown", name: "edxDataListId" }],
    });

    refreshPropertyGridLazyChoices({
      designerSurvey: new SurveyModel({ elements: [] }),
      propertyGridSurvey,
      editingObj: {},
    });

    const editor = propertyGridSurvey.getQuestionByName("edxDataListId");
    expect(editor?.choicesLazyLoadEnabled).toBe(true);
    expect(editor?.choicesLazyLoadPageSize).toBe(25);
  });

  it("enables lazy load on a registered property editor tagbox", () => {
    registerPropertyGridLazyChoiceProvider({
      propertyName: "edxCarryForwardPriorityItems",
      shouldEnable: () => true,
      loadPage: async () => ({ items: [], total: 0 }),
      resolveDisplayValues: async (_ctx, values) => values,
    });

    const designerSurvey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "src",
          edxDataListId: "list-1",
        },
        {
          type: "checkbox",
          name: "target",
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["src"],
        },
      ],
    });

    const propertyGridSurvey = new Model({
      elements: [
        {
          type: "tagbox",
          name: "edxCarryForwardPriorityItems",
        },
      ],
    });
    propertyGridSurvey.editingObj = designerSurvey.getQuestionByName("target");

    refreshPropertyGridLazyChoices({
      designerSurvey,
      propertyGridSurvey,
      editingObj: propertyGridSurvey.editingObj,
    });

    const editor = propertyGridSurvey.getQuestionByName(
      "edxCarryForwardPriorityItems",
    );
    expect(editor?.choicesLazyLoadEnabled).toBe(true);
    expect(editor?.choicesLazyLoadPageSize).toBe(25);
  });

  it("skips setup when provider shouldEnable returns false", () => {
    registerPropertyGridLazyChoiceProvider({
      propertyName: "edxCarryForwardPriorityItems",
      shouldEnable: () => false,
      getStaticChoices: () => [{ value: "A", text: "static: (A)" }],
      loadPage: async () => ({ items: [], total: 0 }),
      resolveDisplayValues: async (_ctx, values) => values,
    });

    const propertyGridSurvey = new Model({
      elements: [
        {
          type: "tagbox",
          name: "edxCarryForwardPriorityItems",
        },
      ],
    });

    refreshPropertyGridLazyChoices({
      designerSurvey: new SurveyModel({ elements: [] }),
      propertyGridSurvey,
      editingObj: {},
    });

    const editor = propertyGridSurvey.getQuestionByName(
      "edxCarryForwardPriorityItems",
    );
    expect(editor?.choicesLazyLoadEnabled).not.toBe(true);
    expect(editor?.choices).toHaveLength(1);
    expect(editor?.choices?.[0]?.value).toBe("A");
  });

  it("registers providers by property name", () => {
    registerPropertyGridLazyChoiceProvider({
      propertyName: "priorityItems",
      shouldEnable: () => true,
      loadPage: vi.fn(),
      resolveDisplayValues: vi.fn(),
    });

    expect(getPropertyGridLazyChoiceProvider("priorityItems")).toBeDefined();
  });

  it("enables lazy load on refresh after dependencies become available", () => {
    let hasDataListSource = false;

    registerPropertyGridLazyChoiceProvider({
      propertyName: "priorityItems",
      shouldEnable: () => hasDataListSource,
      getStaticChoices: () => [{ value: "A", text: "static: (A)" }],
      loadPage: async () => ({ items: [], total: 0 }),
      resolveDisplayValues: async (_ctx, values) => values,
    });

    const designerSurvey = new SurveyModel({ elements: [] });
    const propertyGridSurvey = new Model({
      elements: [{ type: "tagbox", name: "priorityItems" }],
    });
    const loopPanel = { loopSource: ["Cars"] };
    const ctx = {
      designerSurvey,
      propertyGridSurvey,
      editingObj: loopPanel,
    };

    refreshPropertyGridLazyChoices(ctx);

    const editor = propertyGridSurvey.getQuestionByName("priorityItems");
    expect(editor?.choicesLazyLoadEnabled).not.toBe(true);

    hasDataListSource = true;
    refreshPropertyGridLazyChoices(ctx);

    expect(editor?.choicesLazyLoadEnabled).toBe(true);
    expect(editor?.choices).toHaveLength(1);
    expect(editor?.choices?.[0]?.value).toBe("A");
    expect(editor?.choices?.[0]?.text).toBe("static: (A)");
  });

  it("restores static choices when lazy load is disabled after a source change", () => {
    let hasDataListSource = true;

    registerPropertyGridLazyChoiceProvider({
      propertyName: "priorityItems",
      shouldEnable: () => hasDataListSource,
      getStaticChoices: () =>
        hasDataListSource
          ? []
          : [
              { value: "A", text: "static: (A)" },
              { value: "B", text: "static: (B)" },
            ],
      loadPage: async () => ({ items: [], total: 0 }),
      resolveDisplayValues: async (_ctx, values) => values,
    });

    const designerSurvey = new SurveyModel({ elements: [] });
    const propertyGridSurvey = new Model({
      elements: [{ type: "tagbox", name: "priorityItems" }],
    });
    const ctx = {
      designerSurvey,
      propertyGridSurvey,
      editingObj: { loopSource: ["Cars"] },
    };

    refreshPropertyGridLazyChoices(ctx);

    const editor = propertyGridSurvey.getQuestionByName("priorityItems");
    expect(editor?.choicesLazyLoadEnabled).toBe(true);
    expect(editor?.choices).toHaveLength(0);

    hasDataListSource = false;
    refreshPropertyGridLazyChoices(ctx);

    expect(editor?.choicesLazyLoadEnabled).toBe(false);
    expect(editor?.choices).toHaveLength(2);
    expect(editor?.choices?.[0]?.value).toBe("A");
    expect(editor?.choices?.[1]?.value).toBe("B");
  });

  it("refreshes from an open creator property grid", () => {
    registerPropertyGridLazyChoiceProvider({
      propertyName: "priorityItems",
      shouldEnable: () => true,
      loadPage: async () => ({ items: [], total: 0 }),
      resolveDisplayValues: async (_ctx, values) => values,
    });

    const designerSurvey = new SurveyModel({ elements: [] });
    const propertyGridSurvey = new Model({
      elements: [{ type: "tagbox", name: "priorityItems" }],
    });
    const loopPanel = { loopSource: ["Cars"] };

    refreshPropertyGridLazyChoicesForCreator({
      survey: designerSurvey,
      propertyGrid: propertyGridSurvey,
      selectedElement: loopPanel,
    } as never);

    expect(
      propertyGridSurvey.getQuestionByName("priorityItems")
        ?.choicesLazyLoadEnabled,
    ).toBe(true);
  });
});

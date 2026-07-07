import { beforeEach, describe, expect, it, vi } from "vitest";
import { Model, SurveyModel } from "survey-core";
import {
  clearPropertyGridLazyChoiceProvidersForTests,
  getPropertyGridLazyChoiceProvider,
  registerPropertyGridLazyChoiceProvider,
  setupPropertyGridLazyChoices,
} from "../property-grid-lazy-choice-registry";

describe("property-grid-lazy-choice-registry", () => {
  beforeEach(() => {
    clearPropertyGridLazyChoiceProvidersForTests();
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

    setupPropertyGridLazyChoices({
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

    setupPropertyGridLazyChoices({
      designerSurvey: new SurveyModel({ elements: [] }),
      propertyGridSurvey,
      editingObj: {},
    });

    const editor = propertyGridSurvey.getQuestionByName(
      "edxCarryForwardPriorityItems",
    );
    expect(editor?.choicesLazyLoadEnabled).not.toBe(true);
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
});

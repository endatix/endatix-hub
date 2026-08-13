import { describe, expect, it, vi } from "vitest";
import { Model, QuestionDropdownModel } from "survey-core";
import { wrapSelectBaseLocStrsChangedForLazyLoad } from "../wrap-select-base-loc-strs-changed";

type SelectedChoiceItem = {
  text: string;
  locText: {
    setJson: (json: unknown) => void;
    onStringChanged: { add: (handler: () => void) => void };
  };
};

type LazySelectQuestion = QuestionDropdownModel & {
  selectedItemValues: SelectedChoiceItem[];
};

function stampLazySelectedCity(question: LazySelectQuestion): SelectedChoiceItem {
  const item = question.createItemValue("2462881", "El Aaiún") as SelectedChoiceItem;
  item.locText.setJson({
    default: "Laayoune",
    es: "El Aaiún",
    fr: "Laâyoune",
    it: "El Aaiún",
  });
  question.selectedItemValues = [item];
  return item;
}

describe("wrapSelectBaseLocStrsChangedForLazyLoad", () => {
  wrapSelectBaseLocStrsChangedForLazyLoad();

  it.each(["tagbox", "dropdown"] as const)(
    "notifies lazy %s selectedItemValues from locStrsChanged (SurveyJS locale cascade)",
    (questionType) => {
      const model = new Model({
        locale: "es",
        pages: [
          {
            elements: [
              {
                type: questionType,
                name: "cities",
                choicesLazyLoadEnabled: true,
              },
            ],
          },
        ],
      });
      model.locale = "es";

      const question = model.getQuestionByName("cities") as LazySelectQuestion;
      const item = stampLazySelectedCity(question);
      const onStringChanged = vi.fn();
      item.locText.onStringChanged.add(onStringChanged);

      question.locStrsChanged();

      expect(onStringChanged).toHaveBeenCalled();
    },
  );

  it("notifies lazy tagbox chips when survey locale changes", () => {
    const model = new Model({
      locale: "es",
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
            },
          ],
        },
      ],
    });
    model.locale = "es";

    const question = model.getQuestionByName("cities") as LazySelectQuestion;
    const item = stampLazySelectedCity(question);
    const onStringChanged = vi.fn();
    item.locText.onStringChanged.add(onStringChanged);

    model.locale = "";

    expect(onStringChanged).toHaveBeenCalled();
    expect(item.text).toBe("Laayoune");
  });

  it("does not notify selectedItemValues for non-lazy questions", () => {
    const model = new Model({
      elements: [{ type: "tagbox", name: "cities", choices: ["A"] }],
    });
    const question = model.getQuestionByName("cities") as LazySelectQuestion;
    const item = question.createItemValue("A", "A") as SelectedChoiceItem;
    question.selectedItemValues = [item];
    const onStringChanged = vi.fn();
    item.locText.onStringChanged.add(onStringChanged);

    question.locStrsChanged();

    expect(onStringChanged).not.toHaveBeenCalled();
  });
});

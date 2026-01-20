import { Serializer } from "survey-core";

export function registerDynamicLoopingProperties() {

  Serializer.addProperty("paneldynamic", {
    name: "loopSource",
    displayName: "Select source question",
    category: "questionLoops",
    type: "multiplevalues",
    choices: function (obj: { survey: any; }, choicesCallback: (choices: any[]) => void) {
      const survey = obj ? obj.survey : null;

      if (!survey || typeof choicesCallback !== "function") {
        choicesCallback([]);
        return;
      }

      const questions = survey.getAllQuestions();
      const filteredChoices = [{ value: "", text: "None" }];

      questions
        .filter((q: { getType: any; }) => q && q.getType && typeof q.getType === "function")
        .filter((q: { getType: () => any; }) => {
          const type = q.getType();
          return (
            type === "checkbox" || type === "tagbox" || type === "radiogroup"
          );
        })
        .forEach((q: { name: any; title: any; }) => {
          filteredChoices.push({
            value: q.name,
            text: q.name,
          });
        });

      choicesCallback(filteredChoices);
    },
  });

  Serializer.addProperty("paneldynamic", {
    name: "choicePattern",
    displayName: "Loop over",
    category: "questionLoops",
    default: "Selected Only",
    onSetValue: (obj, value) => {
      obj.choicePattern = value ?? "Selected Only";
    },
    type: "dropdown",
    choices: ["Selected Only", "Unselected Only"],
    visibleIf: function (obj) {
      return Array.isArray(obj.loopSource) && obj.loopSource.length > 0;
    },
  });

  Serializer.addProperty("paneldynamic", {
    name: "randomizeLoop",
    displayName: "Randomize items",
    category: "questionLoops",
    type: "boolean",
    default: false,
    visibleIf: function (obj) {
      return Array.isArray(obj.loopSource) && obj.loopSource.length > 0;
    },
  });

  Serializer.addProperty("paneldynamic", {
    name: "maxLoopCount",
    displayName: "Maximum number of loops",
    category: "questionLoops",
    type: "number",
    default: 0,
    visibleIf: (obj) =>
      Array.isArray(obj.loopSource) && obj.loopSource.length > 0,
  });

  Serializer.addProperty("paneldynamic", {
    name: "priorityItems",
    dependsOn: ["loopSource"],
    displayName: "Pinned items",
    category: "questionLoops",
    type: "multiplevalues",
    choices: function (obj: any, choicesCallback: (choices: any[]) => void) {
      const survey = obj ? obj.survey : null;
      if (!survey || !obj.loopSource) return choicesCallback([]);

      const questions = obj.loopSource
        .map((name: any) => survey.getQuestionByName(name))
        .filter((q: any) => !!q);

      const allChoices: any[] = [];
      questions.forEach((q: { choices: any; }) => {
        (q.choices || []).forEach((c: { value: any; text: any; name: any; }) => {
          if (!allChoices.find((existing) => existing.value === c.value)) {
            allChoices.push({ value: c.value, text: c.name });
          }
        });
      });
      choicesCallback(allChoices);
    },
    visibleIf: (obj) =>
      Array.isArray(obj.loopSource) && obj.loopSource.length > 0,
  });
}
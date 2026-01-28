import { ItemValue, Question, QuestionSelectBase, Serializer, SurveyModel } from "survey-core";

export function registerDynamicLoopingProperties() {

  Serializer.addProperty("paneldynamic", {
    name: "loopSource",
    displayName: "Select source question",
    category: "questionLoops",
    type: "multiplevalues",
    choices: function (obj: { survey: SurveyModel; }, choicesCallback: (choices: { value: string, text: string }[]) => void) {
      const survey = obj ? obj.survey : null;

      if (!survey || typeof choicesCallback !== "function") {
        choicesCallback([]);
        return;
      }

      const questions = survey.getAllQuestions();
      const filteredChoices = [{ value: "", text: "None" }];

      questions
        .filter((q: Question): q is QuestionSelectBase => {

          const type = q.getType();
          return ["checkbox", "tagbox", "radiogroup"].includes(type);
        })
        .forEach((q) => {
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
    choices: function (
  obj: { survey: SurveyModel; loopSource: string[] }, 
  choicesCallback: (choices: { value: string, text: string }[]) => void
) {
  const { survey, loopSource } = obj || {};
  if (!survey || !loopSource) return choicesCallback([]);

  const allChoices: { value: string, text: string }[] = [];

  loopSource
    .map(name => survey.getQuestionByName(name))
    .filter((q): q is QuestionSelectBase => !!q && "choices" in q)
    .forEach(q => {
      q.choices.forEach((c: ItemValue) => {
        if (!allChoices.some(existing => existing.value === c.value)) {
          allChoices.push({ 
            value: c.value, 
            text: String(c.value) 
          });
        }
      });
    });

  choicesCallback(allChoices);
},
    visibleIf: (obj) =>
      Array.isArray(obj.loopSource) && obj.loopSource.length > 0,
});

Serializer.addProperty("paneldynamic", {
  name: "exitLoopCondition",
  displayName: "Exit current loop if...",
  category: "questionLoops",
  type: "condition",
    visibleIf: (obj) =>
      Array.isArray(obj.loopSource) && obj.loopSource.length > 0,
});

Serializer.addProperty("paneldynamic", {
  name: "exitAllLoopsCondition",
  displayName: "Exit all loops if...",
  category: "questionLoops",
  type: "condition",
    visibleIf: (obj) =>
      Array.isArray(obj.loopSource) && obj.loopSource.length > 0,
});

}


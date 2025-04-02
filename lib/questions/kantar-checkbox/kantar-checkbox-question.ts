import { ICustomQuestionTypeConfiguration, Question, QuestionCheckboxModel, Serializer} from "survey-core";
import { SpecializedSurveyQuestion } from "../infrastructure/specialized-survey-question";
import { SurveyCreator } from "survey-creator-react";

export class KantarCheckbox extends SpecializedSurveyQuestion {
  get customQuestionConfig(): ICustomQuestionTypeConfiguration {
    return {
      name: "kantar_checkbox",
      title: "KANTAR Checkboxes",
      iconName: "checkbox",
      elementsJSON: [
            {
              type: "checkbox",
              name: "value",
              title: "",
              titleLocation: "hidden",
              choicesOrder: "random"
            },
            {
              type: "comment",
              name: "other",
              titleLocation: "hidden",
              placeholder: "Please describe",
              visibleIf: "{composite.value} contains '96'"
            }
          ],
        onValueChanging(question, _, newValue) {
          const exclusiveA = "97";
          const exclusiveB = "98";
          const containsExclusive = newValue.some((v: string) => [exclusiveA, exclusiveB].includes(v));
  
          if(containsExclusive && newValue.length > 1) {
            if(newValue.includes(exclusiveA) && !newValue.includes(exclusiveB) && question.currentExclusive != exclusiveA) {
              question.currentExclusive = exclusiveA;
              newValue = [exclusiveA];
              return newValue;
            }
            else {
              if(question.currentExclusive == exclusiveA) {
                newValue = newValue.filter((v: string) => v != exclusiveA);
                question.currentExclusive = null;
                return newValue;
              }
            }
            
            if(newValue.includes(exclusiveB) && !newValue.includes(exclusiveA) && question.currentExclusive != exclusiveB) {
              question.currentExclusive = exclusiveB;
              newValue = [exclusiveB];
              return newValue;
            }
            else {
              if(question.currentExclusive == exclusiveB) {
                newValue = newValue.filter((v: string) => v != exclusiveB);
                question.currentExclusive = null;
                return newValue;
              }
            }
  
            if(newValue.includes(exclusiveA) && newValue.includes(exclusiveB)) {
              if(question.currentExclusive == exclusiveA) {
                question.currentExclusive = exclusiveB;
                newValue = [exclusiveB];
              }
              else {
                question.currentExclusive = exclusiveA;
                newValue = [exclusiveA];
              }
              return newValue;
            }
          }
          else {
            if(!containsExclusive) {
              question.currentExclusive = null;
            }
            else {
              question.currentExclusive = newValue.filter((v: string) => [exclusiveA, exclusiveB].includes(v))
            }
          }
          return newValue;
        },
      onAfterRenderContentElement(_, element, htmlElement) {
        switch(element.name) {
          case "value":  // Ensusres options with values 96, 97, and 98 are at the end of the list
            const choice96 = htmlElement.querySelector('input[value="96"]')?.closest(".sd-item");
            const choice97 = htmlElement.querySelector('input[value="97"]')?.closest(".sd-item");
            const choice98 = htmlElement.querySelector('input[value="98"]')?.closest(".sd-item");
            const fieldSet = htmlElement.querySelector('fieldset');
  
            if(fieldSet) {
              if(choice96) {
                fieldSet.appendChild(choice96);
              }
              if(choice97) {
                fieldSet.appendChild(choice97);
              }
              if(choice98) {
                fieldSet.appendChild(choice98);
              }
            }
            break;
        }
      },
      onInit() {
        Serializer.addProperty("kantar_checkbox", {
          name: "choices",
          type: "itemvalues",
          default: [
            { value: "1", text: "Option 1" },
            { value: "2", text: "Option 2" },
            { value: "3", text: "Option 3" },
            { value: "96", text: "Other – please specify"},
            { value: "98", text: "Not sure/Can’t recall" }
          ],
          category: "general",
        });
        
        Serializer.addProperty("composite", {
          name: "currentExclusive",
          type: "string",
          default: null,
          visible: false
        });
  
        Serializer.addProperty("kantar_checkbox", {
          name: "random",
          type: "boolean",
          default: false,
          category: "general",
        });
  
        Serializer.addProperty("kantar_checkbox", {
          name: "enableVerbatimOther",
          type: "boolean",
          default: false,
          category: "general",
        });
      },
      onLoaded(question) {
        reloadChoices(question);
        const checkbox: QuestionCheckboxModel = question.contentPanel?.getQuestionByName("value");
        checkbox.choicesOrder = question.random ? "random" : "none";
      },
      onPropertyChanged(question, propertyName, _) {
        if (propertyName === "choices") {
          reloadChoices(question);
        }
      }
    };
  }

  static override customizeEditor(creator: SurveyCreator): void {
    creator.toolbox.changeCategory("kantar_checkbox", "choice");
  }
}

function reloadChoices(question: Question) {
  const checkboxes = question.contentPanel?.getQuestionByName("value");
  if(checkboxes) {
    checkboxes.choices = question.choices;
  }
}

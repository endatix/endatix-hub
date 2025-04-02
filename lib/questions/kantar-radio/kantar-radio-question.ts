import { ICustomQuestionTypeConfiguration, Question, QuestionCommentModel, QuestionRadiogroupModel, Serializer} from "survey-core";
import { SpecializedSurveyQuestion } from "../infrastructure/specialized-survey-question";
import { SurveyCreator } from "survey-creator-react";

export class KantarRadio extends SpecializedSurveyQuestion {
  get customQuestionConfig(): ICustomQuestionTypeConfiguration {
    return {
      name: "kantar_radiogroup",
      title: "KANTAR Radio Group",
      iconName: "radiogroup",
      elementsJSON: [
            {
              type: "radiogroup",
              name: "value",
              titleLocation: "hidden",
              choicesOrder: "random"
            },
            {
              type: "comment",
              name: "other",
              titleLocation: "hidden",
              placeholder: "Please describe"
            }
          ],
      onValueChanged(question, name, newValue) {
        if(name == "value") {
          const otherQuestion = question.contentPanel.getQuestionByName("other");
          if(newValue.includes("96")) {
            otherQuestion.visible = true;
          }
          else {
            otherQuestion.visible = false;
          }
        }
      },
      onAfterRenderContentElement(_, element, htmlElement) {
        switch(element.name) {
          case "other": // Moves the "other" text box just below the option with value 96
            const row = htmlElement.closest(".sd-row") as HTMLElement;

            row.style.display = "none";
            row.classList.remove("sd-row");
            row.classList.add("kantar-other-textbox");

            break;
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
        Serializer.addProperty("kantar_radiogroup", {
          name: "choices",
          type: "itemvalues",
          default: [
            { value: "1", text: "Option 1" },
            { value: "2", text: "Option 2" },
            { value: "3", text: "Option 3" },
          ],
          category: "general",
        });

        Serializer.addProperty("kantar_radiogroup", {
          name: "random",
          type: "boolean",
          default: false,
          category: "general",
        });
        
        Serializer.addProperty("kantar_radiogroup", {
          name: "enableVerbatimOther",
          type: "boolean",
          default: false,
          category: "general",
        });
      },
      onLoaded(question) {
        reloadChoices(question);
        const radio: QuestionRadiogroupModel = question.contentPanel?.getQuestionByName("value");
        const other: QuestionCommentModel = question.contentPanel?.getQuestionByName("other");
        radio.choicesOrder = question.random ? "random" : "none";
        other.visible = question.enableVerbatimOther;
      },
      onPropertyChanged(question, propertyName) {
        if (propertyName === "choices") {
          reloadChoices(question);
        }
      }
    };
  }

  static override customizeEditor(creator: SurveyCreator): void {
    creator.toolbox.changeCategory("kantar_radiogroup", "choice");
  }
}

function reloadChoices(question: Question) {
  const radio = question.contentPanel?.getQuestionByName("value");
  if(radio) {
    radio.choices = question.choices;
  }
}

import { ICustomQuestionTypeConfiguration, ItemValue, QuestionCustomModel, Serializer, SurveyModel} from "survey-core";
import { SpecializedSurveyQuestion } from "../infrastructure/specialized-survey-question";
import { SurveyCreator } from "survey-creator-react";

export class KantarRanking extends SpecializedSurveyQuestion {
  get customQuestionConfig(): ICustomQuestionTypeConfiguration {
    return {
      name: "kantar_ranking", 
      title: "KANTAR Ranking", 
      iconName: "ranking",
      defaultQuestionTitle: "Ranking",
      questionJSON: {
          "type": "ranking",
          "visibleIf": "MultipleAnswers({Q2.value})",
          "title": "Q2b: Please rank the top {Q2TopCount}, where 1 = most important",
          "selectToRankEnabled": true,
          "validators": [{
            "type": "answercount",
            "minCount": "3"
          }]
      },
      inheritBaseProps: ["ranking"],
      onInit() {
        Serializer.addProperty("kantar_ranking", {
          name: "sourceQuestion",
          type: "dropdown",
          category: "general",
          choices: function (question: QuestionCustomModel) {
              const s = question.survey as SurveyModel; 
              return s.getAllQuestions()
                  .filter(q => q.getType() === "kantar_checkbox")
                  .map(q => ({
                      value: q.name,
                      text: q.title || q.name
                  }));
          }
        });
      },
      onAfterRenderContentElement(question) {
          if (question.sourceQuestion) {
              const s = question.survey as SurveyModel; 
              const sourceQuestion = s.getQuestionByName(question.sourceQuestion);
              if (sourceQuestion) {
                
                const sourceQ = sourceQuestion.contentPanel.getQuestionByName("value");
                const selected = sourceQuestion.choices.filter((choice: ItemValue) => sourceQ.value.includes(choice.value));

                question.contentQuestion.choices = sourceQuestion.choices
                  .filter((choice: ItemValue) => selected.includes(choice))
                  .map((choice: ItemValue) => { return {text: choice.text, value: choice.value}});

                if(question.contentQuestion.choices.length<3) {
                  question.contentQuestion.validators[0].minCount = question.contentQuestion.choices.length;
                }
              }
          }
      }
    };
  }

  static override customizeEditor(creator: SurveyCreator): void {
    creator.toolbox.changeCategory("kantar_ranking", "choice");
  }
}

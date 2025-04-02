import { Model, QuestionCheckboxModel, QuestionMatrixDropdownModel, ItemValue } from "survey-core";
import PreloadExternalData from "./preload-external-data";
import CustomExpressionFunctions from "./custom-expression-functions";

interface KantarQuestionJson {
  choices: Array<{ value: string; text: string }>;
}

export function customizeSurvey(survey: Model) {
  PreloadExternalData(survey);
  CustomExpressionFunctions();
  
  survey.onComplete.add((sender) => console.log("Survey Results:", sender.data));

  survey.onAfterRenderQuestion.add((_, options) => {
    const questionType = options.question.getType();

    // Q2b: Fill ranking question's options from its custom "sourceQuestion" field
    // if(questionType == "ranking") {
    //   const q = options.question as QuestionRankingModel ;
    //   const sourceQuestion = sender.getQuestionByName(q.sourceQuestion);
    //   const checkboxQuestion = sourceQuestion.contentPanel.getQuestionByName("value");
    //   q.choices = checkboxQuestion.choices.filter((c: { value: string; }) => checkboxQuestion.value.includes(c.value));
    // }

    if(questionType == "checkbox") {
      const otherElem = options.htmlElement.querySelector('input[value="other"]')?.parentNode?.parentNode;
      const noneElem = options.htmlElement.querySelector('input[value="none"]')?.parentNode?.parentNode;
        
      if (otherElem && noneElem) {
        noneElem.parentNode?.insertBefore(otherElem, noneElem);
      }
    }
  });

  survey.onAfterRenderQuestion.add((sender, options) => {
    if(options.question.getType() == "kantar_checkbox") {
      // Q4: Exclude bought brand from the list of choices
      if(options.question.name == "Q4") {
        const checkboxQuestion = options.question.contentPanel.getQuestionByName("value");
        checkboxQuestion.choices = checkboxQuestion.choices.filter((c: { value: string; text: string }) => c.text != sender.getVariable("u_req_brand"));
      }
      // Q6: Fill choices from Q4's selections
      if(options.question.name == "Q6") {
        const Q4 = sender.getQuestionByName("Q4").contentPanel.getQuestionByName("value") as QuestionCheckboxModel;
        const checkboxQuestion = options.question.contentPanel.getQuestionByName("value") as QuestionCheckboxModel;
        console.dir(options.question);
        checkboxQuestion.choices = Q4.choices
          .filter((c: { value: string; text: string }) => Q4.value.includes(c.value))
          .sort(() => Math.random() - 0.5)
          .concat((options.question as unknown as { jsonObj: KantarQuestionJson }).jsonObj.choices);
      }
    }
  });

  // Q13: Dynamically set maximum numeric value based on the selection in Q12
  survey.onAfterRenderPage.add((sender, options) => {
    if(options.page.name == "page_Q13") {
      const max = sender.getQuestionByName("Q12_3").value
      const q = options.page.getQuestionByName("Q13") as QuestionMatrixDropdownModel;
      q.columns[0].max = max;
    }
  });

  // Q13: Custom validation - sum of all answers should not exceed the maximum provided in Q12
  survey.onValidateQuestion.add((sender, options) => {
    if(options.name == "Q13") {
      const q = options.question as QuestionMatrixDropdownModel;
      const max = sender.getQuestionByName("Q12_3").value
      let sum = 0;
      const arrValues = Object.values(q.value)
      
      arrValues.forEach(item => {
        const val = item as { Q13_values: number };
        sum += val.Q13_values;
      });
      
      if(sum > max) {
        options.error = "Total value should not exceed " + max;
      }
    }
  });

  // Q15: Add panels for each selection in Q14
  survey.onValueChanged.add(function(sender, options) {
    if (options.name === "Q14") {
      const Q14 = options.question.contentPanel.getQuestionByName("value") as QuestionCheckboxModel;
      const selections = Q14.value || [];
      const brands = Q14.choices.filter(v => selections.includes(v.value));
      const panelData = brands.map((brand: ItemValue) =>
        ({item: brand.value, title: brand.text})).sort(() => Math.random() - 0.5);
      // Prioritize McVitie brands
      const priorityBrands = ["1", "4"];
      const prioritizedPanelData = 
        [...panelData.filter(v => priorityBrands.includes(v.item)), ...panelData.filter(v => !priorityBrands.includes(v.item  ))]
      // Create maximum 5 panels
      sender.setValue("Q15", prioritizedPanelData.slice(0,5));
    }
  });

  // Q17: Check video duration
  survey.onUploadFiles.add(function (_, options) {
    const file = options.files[0];
    if (file && file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.preload = "metadata";
        
        video.onloadedmetadata = function () {
            window.URL.revokeObjectURL(video.src);
            const durationInSeconds = video.duration;
            alert("Video length: " + durationInSeconds + " seconds");
        };
        
        video.src = URL.createObjectURL(file);

        options.callback({
          file: file,
          content: "https://api.surveyjs.io/private/Surveys/getTempFile?name=123456"
        });
    }
  });
}

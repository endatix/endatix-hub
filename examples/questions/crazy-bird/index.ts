import { createCustomQuestion } from "@/lib/questions/question-factory";

// Example registration function
function registerCrazyBirdQuestion() {
  console.log("Crazy Bird question registered successfully");
}

// Example question model (you would implement this)
class CrazyBirdQuestionModel {
  getType() {
    return "crazy-bird";
  }
}

// Create question module using factory
const crazyBirdQuestion = createCustomQuestion(
  "crazy-bird",
  "Crazy Bird Game",
  CrazyBirdQuestionModel,
  registerCrazyBirdQuestion,
);

export default crazyBirdQuestion; 
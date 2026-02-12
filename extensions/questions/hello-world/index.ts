/**
 * Hello World – custom question for testing the extension loading infrastructure.
 * Importing this module registers the question type with SurveyJS (side effect).
 */

import "./hello-world-component";
import type { ExtensionModule } from "@/lib/survey-extensions/types";

const extension: ExtensionModule = {};

export default extension;
export {
  HELLO_WORLD_QUESTION_TYPE,
  HelloWorldQuestionModel,
} from "./hello-world-model";

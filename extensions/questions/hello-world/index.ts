/**
 * Hello World – custom question for testing the extension loading infrastructure.
 * Importing this module registers the question type with SurveyJS (side effect).
 */

import { createCustomQuestion } from '@/lib/questions/question-factory';
import {
  HELLO_WORLD_QUESTION_TYPE,
  HelloWorldQuestionModel,
} from './hello-world-model';
import './hello-world-component';
import type { ExtensionModule } from '@/lib/survey-extensions/types';

// Side-effects from imports register the question with SurveyJS

const extension: ExtensionModule = {};

export {
  HELLO_WORLD_QUESTION_TYPE,
  HelloWorldQuestionModel,
};
export default extension;

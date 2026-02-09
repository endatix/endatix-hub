import { Question, QuestionFactory, Serializer } from 'survey-core';

export const HELLO_WORLD_QUESTION_TYPE = 'hello-world';

export class HelloWorldQuestionModel extends Question {
  getType() {
    return HELLO_WORLD_QUESTION_TYPE;
  }
}

Serializer.addClass(
  HELLO_WORLD_QUESTION_TYPE,
  [],
  () => new HelloWorldQuestionModel(''),
  'question',
);

QuestionFactory.Instance.registerQuestion(
  HELLO_WORLD_QUESTION_TYPE,
  (name) => new HelloWorldQuestionModel(name),
);

import { QuestionFactory } from 'survey-core';
import { AUDIO_RECORDER_TYPE, AudioQuestionModel } from './audio-question.model';

export function registerAudioQuestionModel() {
    QuestionFactory.Instance.registerQuestion(
      AUDIO_RECORDER_TYPE,
      (name: string) => {
        return new AudioQuestionModel(name);
      },
    );
  }
  
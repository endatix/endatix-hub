import { createCustomQuestion } from "@/lib/questions/question-factory";
import "./audio-question.model";
import {
  AUDIO_RECORDER_TYPE,
  AudioQuestionModel,
} from "./audio-question.model";
import "./audio-question.component";

createCustomQuestion({
  name: AUDIO_RECORDER_TYPE,
  title: "Audio Recorder",
  iconName: AUDIO_RECORDER_TYPE,
  model: AudioQuestionModel,
});

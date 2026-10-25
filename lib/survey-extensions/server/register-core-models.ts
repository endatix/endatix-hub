import { registerAudioQuestionModel } from "@/lib/questions/audio-recorder/audio-question-pdf";
import { registerDragCategorizeModel } from "@/lib/questions/drag-categorize/drag-categorize.registry";
import { registerScreenOutTrigger } from "@/lib/survey-features/screen-out/infrastructure/registry";

/**
 * The platform's custom pieces that need only survey-core, for reading a saved form on the server.
 * A tenant's own custom questions register in the browser; the linter reads them as base questions.
 */
export function registerCoreSurveyModels(): void {
  registerScreenOutTrigger();
  registerAudioQuestionModel();
  registerDragCategorizeModel();
}

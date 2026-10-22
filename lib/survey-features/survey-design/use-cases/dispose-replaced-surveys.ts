import type { SurveyModel } from "survey-core";
import type {
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";

// Preview and Theme run a survey that the Creator replaces (Test again, Preview as, a theme edit)
// without disposing the old one. The simulator's <Survey> keeps its DOM, and question ids restart at
// sq_0 in every survey, so React hands the old question nodes to the new questions. The old file,
// image picker and boolean questions still observe those nodes for responsiveness, and throw
// "Cannot read properties of null (reading 'scrollWidth')" once a node renders another question.
const RESTARTED_SURVEY_AREAS = new Set(["preview-tab", "theme-tab"]);

// Layout elements whose data the Creator shares between the surveys of one tab: the completed page's
// Test again bar. `dispose` disposes every layout element's data, so they come off first.
const SHARED_LAYOUT_ELEMENTS = ["complete-customization"];

function disposeReplaced(replaced: SurveyModel, successor: SurveyModel): void {
  for (const id of SHARED_LAYOUT_ELEMENTS) {
    const data = replaced.findLayoutElement(id)?.data;
    if (data && data === successor.findLayoutElement(id)?.data) {
      replaced.removeLayoutElement(id);
    }
  }
  replaced.dispose();
}

/**
 * Disposes the surveys a Preview or Theme restart replaced, once a successor has rendered: React no
 * longer holds them by then. Returns the unbind.
 */
export function disposeReplacedSurveys(
  creator: SurveyCreatorModel,
): () => void {
  const live = new Map<string, Set<SurveyModel>>();

  const onSurveyCreated = (_: unknown, options: SurveyInstanceCreatedEvent) => {
    if (!RESTARTED_SURVEY_AREAS.has(options.area)) return;

    const surveys = live.get(options.area) ?? new Set<SurveyModel>();
    live.set(options.area, surveys);
    const survey = options.survey;
    surveys.add(survey);
    survey.onAfterRenderSurvey.add(() => {
      for (const replaced of surveys) {
        if (replaced === survey) continue;
        surveys.delete(replaced);
        if (!replaced.isDisposed) disposeReplaced(replaced, survey);
      }
    });
  };

  creator.onSurveyInstanceCreated.add(onSurveyCreated);
  return () => {
    creator.onSurveyInstanceCreated.remove(onSurveyCreated);
    live.forEach((surveys) => surveys.clear());
  };
}

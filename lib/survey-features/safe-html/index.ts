import { installSurveyHtmlSanitizer } from "./sanitize-survey-html";

// Installed on import so that a single side-effect import anywhere in a survey
// rendering path protects every SurveyModel instance in the bundle.
installSurveyHtmlSanitizer();

export {
  installSurveyHtmlSanitizer,
  sanitizeSurveyHtml,
} from "./sanitize-survey-html";

// Runs before any application frontend code. Installing the survey HTML
// sanitizer here makes the guarantee global: every SurveyModel created in the
// browser is covered without each rendering site having to opt in.
import "@/lib/survey-features/safe-html";

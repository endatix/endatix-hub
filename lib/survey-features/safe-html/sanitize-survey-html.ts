import { SurveyModel } from "survey-core";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

/**
 * Marker kept on the prototype so repeated imports/installs never stack wrappers.
 */
const INSTALLED_FLAG = "__endatixSurveyHtmlSanitizerInstalled";

type ProcessHtmlFn = (
  this: SurveyModel,
  html: string,
  reason?: string,
) => string;

type PatchablePrototype = Record<string, unknown>;

/**
 * Sanitizes HTML that survey-core is about to hand to `dangerouslySetInnerHTML`.
 */
export function sanitizeSurveyHtml(html: string): string {
  return htmlSanitizer.sanitize(html, htmlSanitizer.presets.surveyHtml);
}

/**
 * Routes every HTML-bearing survey property through the sanitizer.
 *
 * survey-core renders `html` questions, `completedHtml`,
 * `completedHtmlOnCondition[].html`, `completedBeforeHtml` and `loadingHtml`
 * with `dangerouslySetInnerHTML` and performs no sanitization of its own -
 * the library documents this and expects the host application to sanitize.
 * All five properties funnel through `SurveyModel.processHtml`.
 *
 * This wraps that method rather than subscribing to the documented
 * `onProcessHtml` event on purpose: `processHtml` fires `onProcessHtml` first
 * and only then runs text piping, which substitutes answer values into the
 * markup without encoding them. Sanitizing from the event would therefore be
 * undone by any `{question}` placeholder, letting a respondent's answer reach
 * the DOM as live markup. Wrapping the method sanitizes the final string.
 *
 * Patching the prototype (rather than each instance) keeps the guarantee
 * independent of how a survey is constructed, so ad-hoc models built for
 * dialogs are covered too.
 */
export function installSurveyHtmlSanitizer(): void {
  const prototype = SurveyModel.prototype as unknown as PatchablePrototype;

  if (prototype[INSTALLED_FLAG]) {
    return;
  }

  const originalProcessHtml = prototype.processHtml as
    | ProcessHtmlFn
    | undefined;

  if (typeof originalProcessHtml !== "function") {
    throw new Error(
      "[safe-html] SurveyModel.prototype.processHtml is missing - survey-core changed its HTML rendering path. " +
        "Survey HTML would render unsanitized; update lib/survey-features/safe-html before upgrading.",
    );
  }

  prototype.processHtml = function patchedProcessHtml(
    this: SurveyModel,
    html: string,
    reason?: string,
  ): string {
    const processed = originalProcessHtml.call(this, html, reason);
    return sanitizeSurveyHtml(processed);
  } as ProcessHtmlFn;

  prototype[INSTALLED_FLAG] = true;
}

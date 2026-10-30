// The SurveyJS packages About lists, and the GitHub repo that tags each one's releases.
// Plain data, so both hub-build.mjs (at build) and release-notes-url.ts (in the
// browser) read it without pulling in the other's dependencies. It sits with the
// build identity, not in lib/survey-js/: next.config.ts loads it through
// hub-build.mjs, which can only import plain JavaScript.

export const SURVEYJS_RELEASE_REPOS = Object.freeze({
  "survey-core": "survey-library",
  "survey-react-ui": "survey-library",
  "survey-creator-core": "survey-creator",
  "survey-creator-react": "survey-creator",
  "survey-analytics": "survey-analytics",
});

/** @typedef {keyof typeof SURVEYJS_RELEASE_REPOS} SurveyJsPackage */

/** @type {readonly SurveyJsPackage[]} */
export const SURVEYJS_PACKAGES = Object.freeze(
  /** @type {SurveyJsPackage[]} */ (Object.keys(SURVEYJS_RELEASE_REPOS)),
);

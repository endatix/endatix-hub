import { Model, type LocalizableString } from "survey-core";

// A typed port of SurveyJS's utils/json_obfuscator.js (survey-library), which ships only as a Node
// script. Beyond the original it keeps {placeholders} readable, scrambles letters of any alphabet,
// renames pages, valueNames and calculated values, follows choicesFromQuestion and trigger names,
// removes the completed page html, and renames in one pass so a new name never chains into an old one.

/** Returns a number in [0, 1), like Math.random. */
export type Random = () => number;

const TEXT_PROPERTIES = [
  "title",
  "description",
  "placeholder",
  "requiredErrorText",
  "otherText",
  "otherPlaceholder",
  "otherErrorText",
  "commentText",
  "commentPlaceholder",
  "noneText",
  "selectAllText",
  "labelTrue",
  "labelFalse",
  "minRateDescription",
  "maxRateDescription",
  "templateTitle",
  "templateDescription",
];
const ITEM_ARRAYS = ["choices", "columns", "rows", "validators", "rateValues"];
const ITEM_TEXT_PROPERTIES = ["text", "title"];
/** Html is markup and text mixed, so it is removed rather than scrambled, like html questions. */
const HTML_PROPERTIES = [
  "completedHtml",
  "completedHtmlOnCondition",
  "completedBeforeHtml",
  "loadingHtml",
];
const NAME_REFERENCE_PROPERTIES = new Set([
  "choicesFromQuestion",
  "setToName",
  "fromName",
  "gotoName",
]);
const PLACEHOLDER = /(\{[^{}]*\})/;
const LETTER = /\p{L}/gu;
const ALPHABET_LENGTH = 26;

/** Replaces every letter with a random one of the same case; keeps {placeholders} and the rest. */
export function obfuscateText(
  text: string,
  random: Random = Math.random,
): string {
  return text
    .split(PLACEHOLDER)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(LETTER, (letter) => randomLetter(letter, random)),
    )
    .join("");
}

/**
 * Returns a copy of a form's JSON that keeps its structure, types, logic and validation, with every
 * human-readable text scrambled and every element renamed. The given JSON is not changed.
 */
export function obfuscateSurveyJson(
  json: object,
  random: Random = Math.random,
): object {
  const survey = new Model(structuredClone(json));
  removeHtmlQuestions(survey);
  scrambleTexts(survey, random);
  const names = rename(survey);
  const result = survey.toJSON();
  HTML_PROPERTIES.forEach((property) => delete result[property]);
  return rewriteReferences(result, names);
}

function randomLetter(letter: string, random: Random): string {
  const isUpper = letter !== letter.toLowerCase();
  const first = (isUpper ? "A" : "a").charCodeAt(0);
  return String.fromCharCode(first + Math.floor(random() * ALPHABET_LENGTH));
}

function removeHtmlQuestions(survey: Model): void {
  survey
    .getAllQuestions(false, true)
    .filter((question) => question.getType() === "html")
    .forEach((question) => question.delete());
}

function scrambleTexts(survey: Model, random: Random): void {
  const containers: object[] = [
    survey,
    ...survey.pages,
    ...survey.getAllPanels(false, true),
  ];
  containers.forEach((container) =>
    scrambleProperties(container, TEXT_PROPERTIES, random),
  );
  survey.getAllQuestions(false, true).forEach((question) => {
    scrambleProperties(question, TEXT_PROPERTIES, random);
    ITEM_ARRAYS.forEach((arrayName) => {
      const items = (question as unknown as Record<string, unknown>)[arrayName];
      if (!Array.isArray(items)) return;
      items.forEach((item) =>
        scrambleProperties(item, ITEM_TEXT_PROPERTIES, random),
      );
    });
  });
}

/** Scrambles the text each property holds, in every locale. Leaves a property with no text. */
function scrambleProperties(
  owner: object,
  properties: string[],
  random: Random,
): void {
  properties.forEach((property) => {
    const loc = (owner as Record<string, LocalizableString | undefined>)[
      `loc${property[0].toUpperCase()}${property.slice(1)}`
    ];
    const value: unknown = loc?.getJson();
    if (typeof value === "string") {
      loc!.setJson(obfuscateText(value, random));
    } else if (value && typeof value === "object") {
      const scrambled = Object.fromEntries(
        Object.entries(value).map(([locale, text]) => [
          locale,
          typeof text === "string" ? obfuscateText(text, random) : text,
        ]),
      );
      loc!.setJson(scrambled);
    }
  });
}

/** Renames pages, panels, questions, valueNames and calculated values; returns old to new by lower-case old name. */
function rename(survey: Model): Map<string, string> {
  const names = new Map<string, string>();
  survey.pages.forEach((page, index) => (page.name = `page${index + 1}`));
  survey
    .getAllPanels(false, true)
    .forEach((panel, index) => (panel.name = `panel${index + 1}`));
  survey.getAllQuestions(false, true).forEach((question, index) => {
    const newName = `q${index + 1}`;
    names.set(question.name.toLowerCase(), newName);
    question.name = newName;
  });
  let valueCount = 0;
  survey.getAllQuestions(false, true).forEach((question) => {
    if (!question.valueName) return;
    const key = question.valueName.toLowerCase();
    if (!names.has(key)) names.set(key, `value${++valueCount}`);
    question.valueName = names.get(key)!;
  });
  survey.calculatedValues.forEach((calculated, index) => {
    const newName = `calc${index + 1}`;
    names.set(calculated.name.toLowerCase(), newName);
    calculated.name = newName;
  });
  return names;
}

/** Rewrites {name}, {panel.name} and {row.name} in every string, and the name-valued properties. */
function rewriteReferences(
  json: Record<string, unknown>,
  names: Map<string, string>,
): Record<string, unknown> {
  if (names.size === 0) return json;
  const alternatives = [...names.keys()]
    .sort((a, b) => b.length - a.length)
    .map((name) => escapeRegExp(name))
    .join("|");
  const reference = new RegExp(
    `\\{(\\s*(?:panel\\.|row\\.)?)(${alternatives})(?=\\s*[}.\\[])`,
    "gi",
  );
  const rewrite = (value: unknown, key?: string): unknown => {
    if (typeof value === "string") {
      if (key && NAME_REFERENCE_PROPERTIES.has(key)) {
        return names.get(value.toLowerCase()) ?? value;
      }
      return value.replace(
        reference,
        (_, prefix: string, name: string) =>
          `{${prefix}${names.get(name.toLowerCase())}`,
      );
    }
    if (Array.isArray(value)) return value.map((item) => rewrite(item));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([entryKey, entry]) => [
          entryKey,
          rewrite(entry, entryKey),
        ]),
      );
    }
    return value;
  };
  return rewrite(json) as Record<string, unknown>;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

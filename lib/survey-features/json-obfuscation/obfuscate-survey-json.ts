import {
  Base,
  Model,
  Serializer,
  type IElement,
  type LocalizableString,
  type PanelModel,
  type Question,
  type QuestionPanelDynamicModel,
} from "survey-core";

// A typed port of SurveyJS's utils/json_obfuscator.js (survey-library), which ships only as a Node
// script. Beyond the original it loads the form in design mode (no choicesByUrl requests, no
// evaluated state in the output), finds text through the Serializer's localizable properties,
// scrambles letters of any script, keeps {placeholders}, and renames by scope: a dynamic panel's
// template questions have their own names, and matrix columns and multiple text items keep theirs.

/** Returns a number in [0, 1), like Math.random. */
export type Random = () => number;

/** Lower-case old name to new name, for one scope. */
type Names = Map<string, string>;
/** The survey's names, and each dynamic panel's template names keyed by the panel's new name. */
type Scopes = { survey: Names; panels: Map<string, Names> };

/** Html mixes markup and text, so it is removed rather than scrambled, like html questions. */
const HTML_PROPERTIES = new Set([
  "html",
  "completedHtml",
  "completedHtmlOnCondition",
  "completedBeforeHtml",
  "loadingHtml",
]);
const NAME_PROPERTIES = new Set([
  "choicesFromQuestion",
  "setToName",
  "fromName",
  "gotoName",
]);
const TEMPLATE_NAME_PROPERTIES = new Set(["keyName"]);
const PLACEHOLDER = /(\{[^{}]*\})/;
const LETTER = /\p{L}/gu;
const ALPHABET_LENGTH = 26;
/** {name}, {panel.name} or {parentpanel.name}; a name ends where a path, an index or the brace starts. */
const REFERENCE =
  /\{(\s*)(?:(panel|parentpanel)\.)?([^{}.[\]]+?)(?=\s*[}.[])/gi;
/** {dynamicPanel[0].name}, read once the dynamic panel has its new name. */
const PANEL_ITEM_REFERENCE =
  /\{(\s*)([^{}.[\]]+?)(\[\s*\d+\s*\]\.)([^{}.[\]]+?)(?=\s*[}.[])/gi;
const QUOTED_NAME = /\b(displayValue|propertyValue)\(\s*(['"])([^'"]+)\2/gi;

/** Replaces every letter with a random Latin one of the same case; keeps {placeholders} and the rest. */
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
 * human-readable text scrambled and every page, panel and question renamed. The JSON is not changed.
 */
export function obfuscateSurveyJson(
  json: object,
  random: Random = Math.random,
): object {
  const survey = new Model();
  survey.setDesignMode(true);
  survey.fromJSON(structuredClone(json));
  removeHtmlQuestions(survey);
  scrambleTexts(survey, random, new Set());
  const scopes = rename(survey);
  const result = survey.toJSON();
  HTML_PROPERTIES.forEach((property) => delete result[property]);
  return rewriteReferences(result, scopes);
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

/** Scrambles every localizable property of the owner and of the objects its properties hold. */
function scrambleTexts(owner: Base, random: Random, seen: Set<Base>): void {
  if (seen.has(owner)) return;
  seen.add(owner);
  const values = owner as unknown as Record<string, unknown>;
  Serializer.getPropertiesByObj(owner).forEach((property) => {
    if (HTML_PROPERTIES.has(property.name)) return;
    if (property.isLocalizable) {
      const loc = values[property.serializationProperty];
      scrambleLocalizable(loc as LocalizableString | undefined, random);
      return;
    }
    const value = values[property.name];
    (Array.isArray(value) ? value : [value]).forEach((child) => {
      if (child instanceof Base) scrambleTexts(child, random, seen);
    });
  });
  // A matrix column keeps its cell editor's choices, placeholder and the like on a template question.
  const template = values.templateQuestion;
  if (template instanceof Base) scrambleTexts(template, random, seen);
}

/** Scrambles the text in every locale. Leaves a string with no text of its own. */
function scrambleLocalizable(
  loc: LocalizableString | undefined,
  random: Random,
): void {
  if (typeof loc?.getJson !== "function") return;
  const value: unknown = loc.getJson();
  if (typeof value === "string") {
    loc.setJson(obfuscateText(value, random));
  } else if (value && typeof value === "object") {
    loc.setJson(
      Object.fromEntries(
        Object.entries(value).map(([locale, text]) => [
          locale,
          typeof text === "string" ? obfuscateText(text, random) : text,
        ]),
      ),
    );
  }
}

/** Renames pages, panels, questions, valueNames and calculated values, in document order. */
function rename(survey: Model): Scopes {
  const scopes: Scopes = { survey: new Map(), panels: new Map() };
  let panelCount = 0;
  let questionCount = 0;
  let valueCount = 0;

  const renameIn = (elements: IElement[], names: Names) => {
    elements.forEach((element) => {
      if (element.isPanel) {
        (element as PanelModel).name = `panel${++panelCount}`;
        renameIn((element as PanelModel).elements, names);
        return;
      }
      const question = element as Question;
      const newName = `q${++questionCount}`;
      names.set(question.name.toLowerCase(), newName);
      question.name = newName;
      if (question.valueName) {
        const key = question.valueName.toLowerCase();
        if (!names.has(key)) names.set(key, `value${++valueCount}`);
        question.valueName = names.get(key)!;
      }
      if (question.getType() === "paneldynamic") {
        const templateNames: Names = new Map();
        scopes.panels.set(newName, templateNames);
        renameIn(
          (question as QuestionPanelDynamicModel).template.elements,
          templateNames,
        );
      }
    });
  };

  survey.pages.forEach((page, index) => {
    page.name = `page${index + 1}`;
    renameIn(page.elements, scopes.survey);
  });
  survey.calculatedValues.forEach((calculated, index) => {
    const newName = `calc${index + 1}`;
    scopes.survey.set(calculated.name.toLowerCase(), newName);
    calculated.name = newName;
  });
  return scopes;
}

/** Points every name reference in the JSON at the renamed element, in the scope it is written in. */
function rewriteReferences(
  json: Record<string, unknown>,
  scopes: Scopes,
): Record<string, unknown> {
  const visit = (
    value: unknown,
    key: string | undefined,
    panel: Names | undefined,
    parentPanel: Names | undefined,
  ): unknown => {
    if (typeof value === "string") {
      const lookup = value.toLowerCase();
      if (key && TEMPLATE_NAME_PROPERTIES.has(key)) {
        return panel?.get(lookup) ?? value;
      }
      if (key && NAME_PROPERTIES.has(key)) {
        return scopes.survey.get(lookup) ?? panel?.get(lookup) ?? value;
      }
      return rewriteExpression(value, scopes, panel, parentPanel);
    }
    if (Array.isArray(value)) {
      return value.map((item) => visit(item, undefined, panel, parentPanel));
    }
    if (value && typeof value === "object") {
      const node = value as { type?: unknown; name?: unknown };
      const templateNames =
        node.type === "paneldynamic"
          ? scopes.panels.get(String(node.name).toLowerCase())
          : undefined;
      const [inner, outer] = templateNames
        ? [templateNames, panel]
        : [panel, parentPanel];
      return Object.fromEntries(
        Object.entries(value).map(([entryKey, entry]) => [
          entryKey,
          visit(entry, entryKey, inner, outer),
        ]),
      );
    }
    return value;
  };
  return visit(json, undefined, undefined, undefined) as Record<
    string,
    unknown
  >;
}

function rewriteExpression(
  text: string,
  scopes: Scopes,
  panel: Names | undefined,
  parentPanel: Names | undefined,
): string {
  return text
    .replace(
      REFERENCE,
      (match, space: string, prefix: string | undefined, name: string) => {
        const names = !prefix
          ? scopes.survey
          : prefix.toLowerCase() === "panel"
            ? panel
            : parentPanel;
        const renamed = names?.get(name.trim().toLowerCase());
        return renamed
          ? `{${space}${prefix ? `${prefix}.` : ""}${renamed}`
          : match;
      },
    )
    .replace(
      PANEL_ITEM_REFERENCE,
      (
        match,
        space: string,
        panelName: string,
        index: string,
        name: string,
      ) => {
        const renamed = scopes.panels
          .get(panelName.trim().toLowerCase())
          ?.get(name.trim().toLowerCase());
        return renamed ? `{${space}${panelName}${index}${renamed}` : match;
      },
    )
    .replace(
      QUOTED_NAME,
      (match, functionName: string, quote: string, name: string) => {
        const renamed = scopes.survey.get(name.toLowerCase());
        return renamed ? `${functionName}(${quote}${renamed}${quote}` : match;
      },
    );
}

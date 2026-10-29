import type { Question, SurveyModel } from "survey-core";
import type {
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import { withBasePath } from "@/lib/hosting";
import { formRoutes } from "@/lib/routes/form-routes";
import {
  isPrefillCompatible,
  prefillSourceNamed,
  prefillVariableOf,
  variablesIn,
  type PrefillSource,
} from "../coverage/prefill-match";
import {
  englishList,
  PERSONALIZATION_ICON_SVG,
  propertyTypeLabel,
  targetQuestion,
} from "./prefill";

const MARK = "edx-prefill";
const CHIP = "edx-prefill-chip";
const CARD = "edx-prefill-card";
const MISMATCH = "edx-prefill-chip--mismatch";
const CALCULATED = "edx-prefill-chip--calculated";
const OPENS = "Click to open Properties in a new tab";
const CHANGED = "defaultValueExpression";
const LISTENER = "edx-prefill-chip";

type Watch = {
  question: Question;
  host: HTMLElement;
  sources: () => PrefillSource[];
  formId?: string;
};

/** What the chip says: its words, its accessible name, and the card's heading and lines. */
type Chip = {
  label: string;
  name: string;
  heading: string;
  lines: string[];
  expression?: string;
  tone: "prefill" | "mismatch" | "calculated";
  href: string;
};

const watches = new Map<Question, Watch>();
let cards = 0;

function inputTypeOf(question: Question): string | undefined {
  const inputType = (question as Question & { inputType?: unknown }).inputType;
  return typeof inputType === "string" ? inputType : undefined;
}

function fitsSource(question: Question, source: PrefillSource): boolean {
  if (!Array.isArray(source.prefillTargets)) return true;
  const shape = { type: question.getType(), inputType: inputTypeOf(question) };
  return isPrefillCompatible(shape, source.prefillTargets);
}

function andList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function mismatchChip(source: PrefillSource, href: string): Chip {
  const type = propertyTypeLabel(source);
  const fitting = englishList(
    (source.prefillTargets ?? []).map((target) => targetQuestion(target)),
  );
  const { title } = source;
  return {
    label: title,
    name: `Prefilled from ${title}, which does not fit this question`,
    heading: `${title} does not fit this question`,
    lines: [
      `A ${type} Property prefills ${article(fitting)} ${fitting} question. Clear it from Diagnostics.`,
    ],
    tone: "mismatch",
    href,
  };
}

function prefillChip(
  question: Question,
  source: PrefillSource,
  href: string,
): Chip {
  if (!fitsSource(question, source)) return mismatchChip(source, href);
  const type = propertyTypeLabel(source);
  const heading = `Prefilled from ${source.title}`;
  const edits = question.readOnly ? "can't change it" : "can change it";
  const line = `Starts this answer with the participant's ${source.title}, ${article(type)} ${type} Property. Respondents ${edits}.`;
  return {
    label: source.title,
    name: heading,
    heading,
    lines: [line],
    tone: "prefill",
    href,
  };
}

function calculatedChip(
  sources: PrefillSource[],
  expression: string,
  href: string,
): Chip {
  const titles = andList(sources.map((source) => source.title));
  return {
    label: titles,
    name: `Calculated from ${titles}`,
    heading: `Calculated from ${titles}`,
    lines: [
      `Starts this answer with a value worked out from the participant's ${titles}.`,
    ],
    expression,
    tone: "calculated",
    href,
  };
}

function chipFor(watch: Watch): Chip | undefined {
  const { question, formId } = watch;
  const expression = question.defaultValueExpression?.trim();
  if (!expression || !formId) return undefined;
  const href = withBasePath(
    formRoutes.audience(formId, { search: "view=properties" }),
  );
  const sources = watch.sources();
  const variable = prefillVariableOf(expression);
  if (variable) {
    const source = prefillSourceNamed(sources, variable);
    return source && prefillChip(question, source, href);
  }
  const read = variablesIn(expression).flatMap((name) => {
    const source = prefillSourceNamed(sources, name);
    return source ? [source] : [];
  });
  return read.length ? calculatedChip(read, expression, href) : undefined;
}

function hostOf(element: HTMLElement): HTMLElement | null {
  const host = element.closest(".svc-question__content");
  return host instanceof HTMLElement ? host : null;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createMark(): HTMLElement {
  const mark = element("span", MARK);
  const chip = element("a", CHIP);
  chip.target = "_blank";
  chip.rel = "noopener";
  // The designer selects a question on pointerdown. The link has to win that race.
  const keep = (event: Event) => event.stopPropagation();
  chip.addEventListener("pointerdown", keep);
  chip.addEventListener("click", keep);
  const card = element("span", CARD);
  card.id = `${CARD}-${++cards}`;
  card.setAttribute("role", "tooltip");
  chip.setAttribute("aria-describedby", card.id);
  mark.append(chip, card);
  return mark;
}

function fillChip(chip: HTMLAnchorElement, model: Chip): void {
  chip.innerHTML = PERSONALIZATION_ICON_SVG;
  chip.querySelector("svg")?.setAttribute("aria-hidden", "true");
  chip.append(model.label);
  if (model.tone === "calculated") {
    const fx = element("span", `${CHIP}-fx`, "ƒx");
    fx.setAttribute("aria-hidden", "true");
    chip.append(fx);
  }
  chip.classList.toggle(MISMATCH, model.tone === "mismatch");
  chip.classList.toggle(CALCULATED, model.tone === "calculated");
  chip.href = model.href;
  chip.setAttribute("aria-label", model.name);
}

function fillCard(card: HTMLElement, model: Chip): void {
  const parts: HTMLElement[] = [
    element("strong", `${CARD}-heading`, model.heading),
  ];
  if (model.expression)
    parts.push(element("code", `${CARD}-code`, model.expression));
  for (const line of model.lines)
    parts.push(element("span", `${CARD}-line`, line));
  parts.push(element("span", `${CARD}-hint`, OPENS));
  card.replaceChildren(...parts);
}

function paint(watch: Watch): void {
  const model = chipFor(watch);
  const current = watch.host.querySelector<HTMLElement>(`:scope > .${MARK}`);
  if (!model) {
    current?.remove();
    return;
  }
  const mark = current ?? createMark();
  if (!current) watch.host.append(mark);
  const chip = mark.querySelector<HTMLAnchorElement>(`.${CHIP}`);
  const card = mark.querySelector<HTMLElement>(`.${CARD}`);
  if (chip) fillChip(chip, model);
  if (card) fillCard(card, model);
}

function follow(question: Question): void {
  question.registerFunctionOnPropertyValueChanged(
    CHANGED,
    () => {
      const watch = watches.get(question);
      if (watch?.host.isConnected) paint(watch);
    },
    LISTENER,
  );
}

/** The Property chip for one rendered question: a prefill, or a calculation that reads Properties. */
export function mountPrefillMark(
  element: HTMLElement,
  question: Question,
  sources: () => PrefillSource[],
  formId?: string,
): void {
  const host = hostOf(element);
  if (!host) return;
  if (!watches.has(question)) follow(question);
  const watch = { question, host, sources, formId };
  watches.set(question, watch);
  paint(watch);
}

/** Titles and fit follow a later read of the form's Properties. */
export function repaintPrefillMarks(): void {
  for (const [question, watch] of watches) {
    if (watch.host.isConnected) paint(watch);
    else forget(question);
  }
}

function forget(question: Question): void {
  question.unRegisterFunctionOnPropertyValueChanged(CHANGED, LISTENER);
  watches.delete(question);
}

/** Stops following every question, once the designer is gone. */
export function clearPrefillMarks(): void {
  for (const question of [...watches.keys()]) forget(question);
}

type RenderedQuestion = { htmlElement: HTMLElement; question: Question };

/**
 * Labels each designer question whose default reads a known Property. Preview and the
 * property grid are not the canvas, so they are left alone.
 */
export function installPrefillCanvas(
  creator: SurveyCreatorModel,
  sources: () => PrefillSource[],
  formId?: string,
): () => void {
  const onRender = (_sender: SurveyModel, options: RenderedQuestion) => {
    mountPrefillMark(options.htmlElement, options.question, sources, formId);
  };
  const bind = (survey: SurveyModel) => {
    survey.onAfterRenderQuestion.add(onRender);
  };
  const unbind = (survey: SurveyModel) => {
    survey.onAfterRenderQuestion.remove(onRender);
  };
  let attached: SurveyModel | undefined = creator.survey;
  if (attached) bind(attached);

  const onDesignerSurvey = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ): void => {
    if (options.reason !== "designer") return;
    if (attached) unbind(attached);
    attached = options.survey;
    bind(attached);
  };
  creator.onSurveyInstanceCreated.add(onDesignerSurvey);

  return () => {
    creator.onSurveyInstanceCreated.remove(onDesignerSurvey);
    if (attached) unbind(attached);
    clearPrefillMarks();
  };
}

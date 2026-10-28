import type { Question, SurveyModel } from "survey-core";
import type {
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import { withBasePath } from "@/lib/hosting";
import { formRoutes } from "@/lib/routes/form-routes";
import {
  prefillVariableOf,
  type PrefillSource,
} from "../coverage/prefill-match";
import { PERSONALIZATION_ICON_SVG } from "./prefill";

const MARK = "edx-prefill-mark";
const RING = "edx-prefilled";
const POP = "edx-prefill-pop";

type Watch = {
  question: Question;
  host: HTMLElement;
  sources: () => PrefillSource[];
  formId?: string;
};

const watches = new Set<Watch>();
const listened = new WeakSet<Question>();

function sourceNamed(
  sources: readonly PrefillSource[],
  variable: string,
): PrefillSource | undefined {
  const key = variable.toLowerCase();
  return sources.find((source) => source.variable.toLowerCase() === key);
}

function markFor(
  expression: string | undefined,
  sources: readonly PrefillSource[],
  formId: string | undefined,
): { title: string; href: string } | undefined {
  const variable = prefillVariableOf(expression?.trim());
  if (!variable || !formId) return undefined;
  const source = sourceNamed(sources, variable);
  if (!source) return undefined;
  return {
    title: source.title,
    href: withBasePath(
      formRoutes.audience(formId, { search: "view=properties" }),
    ),
  };
}

function hostOf(element: HTMLElement): HTMLElement | null {
  const host = element.closest(".svc-question__content");
  return host instanceof HTMLElement ? host : null;
}

function fill(widget: HTMLElement, title: string, href: string): void {
  const label = `Prefilled from ${title}`;
  let button = widget.querySelector("button");
  let pop = widget.querySelector(`.${POP}`);
  if (!button || !pop) {
    widget.replaceChildren();
    button = document.createElement("button");
    button.type = "button";
    button.innerHTML = PERSONALIZATION_ICON_SVG;
    pop = document.createElement("div");
    pop.className = POP;
    const heading = document.createElement("strong");
    const note = document.createElement("span");
    note.textContent = "Property on this form";
    const link = document.createElement("a");
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Properties";
    // The designer selects a question on pointerdown. The link has to win that race.
    const keepLink = (event: Event) => event.stopPropagation();
    link.addEventListener("pointerdown", keepLink);
    link.addEventListener("click", keepLink);
    pop.append(heading, note, link);
    widget.append(button, pop);
  }
  button.setAttribute("aria-label", label);
  const heading = pop.querySelector("strong");
  if (heading) heading.textContent = label;
  const link = pop.querySelector("a");
  if (link) link.href = href;
}

function paint(watch: Watch): void {
  const mark = markFor(
    watch.question.defaultValueExpression,
    watch.sources(),
    watch.formId,
  );
  const widget = watch.host.querySelector(`:scope > .${MARK}`);
  if (!mark) {
    watch.host.classList.remove(RING);
    widget?.remove();
    return;
  }
  watch.host.classList.add(RING);
  const node =
    widget instanceof HTMLElement ? widget : document.createElement("div");
  node.className = MARK;
  if (!widget) watch.host.append(node);
  fill(node, mark.title, mark.href);
}

function watchFor(question: Question): Watch | undefined {
  for (const watch of watches) {
    if (watch.question === question) return watch;
  }
  return undefined;
}

/** The designer ring and button for one rendered question. A calculation gets neither. */
export function mountPrefillMark(
  element: HTMLElement,
  question: Question,
  sources: () => PrefillSource[],
  formId?: string,
): void {
  const host = hostOf(element);
  if (!host) return;
  const existing = watchFor(question);
  const watch: Watch = existing ?? { question, host, sources, formId };
  watch.host = host;
  watch.sources = sources;
  watch.formId = formId;
  watches.add(watch);
  paint(watch);
  if (listened.has(question)) return;
  listened.add(question);
  question.registerFunctionOnPropertyValueChanged(
    "defaultValueExpression",
    () => {
      const current = watchFor(question);
      if (current?.host.isConnected) paint(current);
    },
  );
}

/** Titles and fit follow a later read of the form's Properties. */
export function repaintPrefillMarks(): void {
  for (const watch of watches) {
    if (!watch.host.isConnected) {
      watches.delete(watch);
      continue;
    }
    paint(watch);
  }
}

type RenderedQuestion = { htmlElement: HTMLElement; question: Question };

/**
 * Rings each designer question whose default names a known Property. Preview and the
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
    attached = undefined;
  };
}

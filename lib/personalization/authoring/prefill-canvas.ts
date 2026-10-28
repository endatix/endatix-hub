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
  type PrefillSource,
} from "../coverage/prefill-match";
import { PERSONALIZATION_ICON_SVG } from "./prefill";

const CHIP = "edx-prefill-chip";
const MISMATCH = "edx-prefill-chip--mismatch";
const OPENS = "Opens the form's Properties in a new tab";
const CHANGED = "defaultValueExpression";
const LISTENER = "edx-prefill-chip";

type Watch = {
  question: Question;
  host: HTMLElement;
  sources: () => PrefillSource[];
  formId?: string;
};

type Chip = { title: string; href: string; fits: boolean };

const watches = new Map<Question, Watch>();

function inputTypeOf(question: Question): string | undefined {
  const inputType = (question as Question & { inputType?: unknown }).inputType;
  return typeof inputType === "string" ? inputType : undefined;
}

function fitsSource(question: Question, source: PrefillSource): boolean {
  if (!Array.isArray(source.prefillTargets)) return true;
  const shape = { type: question.getType(), inputType: inputTypeOf(question) };
  return isPrefillCompatible(shape, source.prefillTargets);
}

function chipFor(watch: Watch): Chip | undefined {
  const { question, formId } = watch;
  const variable = prefillVariableOf(question.defaultValueExpression?.trim());
  if (!variable || !formId) return undefined;
  const source = prefillSourceNamed(watch.sources(), variable);
  if (!source) return undefined;
  return {
    title: source.title,
    href: withBasePath(
      formRoutes.audience(formId, { search: "view=properties" }),
    ),
    fits: fitsSource(question, source),
  };
}

function hostOf(element: HTMLElement): HTMLElement | null {
  const host = element.closest(".svc-question__content");
  return host instanceof HTMLElement ? host : null;
}

function createChip(): HTMLAnchorElement {
  const chip = document.createElement("a");
  chip.className = CHIP;
  chip.target = "_blank";
  chip.rel = "noopener";
  chip.title = "Open the form's Properties in a new tab";
  // The designer selects a question on pointerdown. The link has to win that race.
  const keep = (event: Event) => event.stopPropagation();
  chip.addEventListener("pointerdown", keep);
  chip.addEventListener("click", keep);
  return chip;
}

function fill(chip: HTMLAnchorElement, { title, href, fits }: Chip): void {
  const text = `Prefilled from ${title}`;
  chip.innerHTML = PERSONALIZATION_ICON_SVG;
  chip.querySelector("svg")?.setAttribute("aria-hidden", "true");
  chip.append(fits ? text : `${text} · does not fit`);
  chip.classList.toggle(MISMATCH, !fits);
  chip.href = href;
  chip.setAttribute(
    "aria-label",
    fits
      ? `${text}. ${OPENS}`
      : `${text}, which does not fit this question. See Diagnostics. ${OPENS}`,
  );
}

function paint(watch: Watch): void {
  const chip = chipFor(watch);
  const current = watch.host.querySelector(`:scope > .${CHIP}`);
  if (!chip) {
    current?.remove();
    return;
  }
  const node = current instanceof HTMLAnchorElement ? current : createChip();
  if (!current) watch.host.append(node);
  fill(node, chip);
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

/** The "Prefilled from {Property}" chip for one rendered question. A calculation gets none. */
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
 * Labels each designer question whose default names a known Property. Preview and the
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

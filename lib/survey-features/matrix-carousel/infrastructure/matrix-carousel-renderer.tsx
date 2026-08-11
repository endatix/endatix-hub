import * as React from "react";
import type { LocalizableString, Question, QuestionMatrixModel, SurveyModel } from "survey-core";
import { Action, ActionContainer } from "survey-core";
import { ReactQuestionFactory, SurveyActionBar, SurveyQuestion, SurveyQuestionMatrix } from "survey-react-ui";
import { StoragePresignedImage } from "@/features/asset-storage/ui/storage-presigned-image";
import { MATRIX_TYPE } from "../constants";
import type { MatrixCarouselQuestion, MatrixRowItemValue } from "../types";
import { isCarouselDisplayMode } from "../use-cases/matrix-carousel-state";
import {
  getDecomposedRowQuestions,
  isFirstRow,
  isLastRow,
  nextRow,
  prevRow,
  goToRow,
} from "../use-cases/navigate-carousel";
import { getCurrentRowIndex } from "../utils/carousel-state";
import { resyncMatrixCarouselDecomposition } from "./survey-bindings";
import "./matrix-carousel.styles.css";

const SCROLL_EPSILON_PX = 4;
const PROGRAMMATIC_SCROLL_RESET_MS = 400;

const FOCUSABLE_ROW_CONTROL_SELECTOR =
  'input, [role="radio"], [role="checkbox"], [role="radiogroup"], [role="group"]';

/**
 * Property names syncActions() depends on — isFirstRow/isLastRow read row
 * count via `rows`; edxDisplayMode gates whether the carousel (and its
 * Back/Next) is active at all. Any of these changing outside a Next/
 * Previous click or swipe (e.g. row-sourcing repopulating `rows` when its
 * source question's value changes while the survey is already running)
 * must still re-sync the Back/Next Actions, or their visible/title state
 * goes stale. Concretely: with 0 rows, both isFirstRow and isLastRow are
 * true (0 === 0, and 0 >= 0 - 1), so componentDidMount's initial
 * syncActions() hides both buttons — if rows are populated later by row-
 * sourcing and nothing re-syncs, they silently never reappear even though
 * there's now real content to navigate.
 */
const ACTION_RELEVANT_PROPERTIES = new Set(["rows", "edxDisplayMode"]);

/**
 * The survey's own page-navigation LocalizableStrings ("Previous"/"Next") —
 * the same keys PanelDynamic's prevPanelText/nextPanelText default to
 * (question_paneldynamic.ts declares `localizable: { defaultStr:
 * "pagePrevText" }` / `"pageNextText"`), so labels match the rest of the
 * survey's navigation. Returning the LocalizableString itself (passed to
 * Action as `locTitle`, not `title`) rather than a resolved string is
 * deliberate: PanelDynamic itself only snapshots a plain string for its own
 * Prev/Next buttons, which is why changing survey.locale at runtime doesn't
 * update its captions either — confirmed by reading question_paneldynamic.ts's
 * initFooterToolbar() — so that pattern isn't one to copy. survey.ts's own
 * page-navigation buttons use the live-binding form
 * (createNavigationActions(): `locTitle: this.locPagePrevText`); this mirrors
 * that instead. `locPagePrevText`/`locPageNextText` aren't listed in
 * survey-core's public .d.ts (a gap in the generated typings for this
 * decorator-created companion getter) but exist at runtime — confirmed in
 * both the installed bundle and the survey-library checkout.
 */
function getSurveyNavLocStrings(question: Question): {
  locPrev?: LocalizableString;
  locNext?: LocalizableString;
} {
  const survey = question.survey as
    | (SurveyModel & {
        locPagePrevText?: LocalizableString;
        locPageNextText?: LocalizableString;
      })
    | undefined;
  return { locPrev: survey?.locPagePrevText, locNext: survey?.locPageNextText };
}

/**
 * Overrides SurveyQuestionMatrix.renderElement — the single method that
 * builds the grid table (reactquestion_matrix.tsx:35 in the SurveyJS
 * source) — to branch into a scroll-snap carousel when edxDisplayMode is
 * "carousel", delegating to super.renderElement() for the grid otherwise.
 * Registered under the same "matrix" type, overwriting SurveyJS's own
 * built-in registration entirely (ReactQuestionFactory is a flat,
 * non-inheriting registry — only one component can own a type string).
 * super.renderElement() is real delegation to the shipped implementation, not
 * a copy, so grid-mode matrix questions keep getting SurveyJS's own
 * rendering fixes on every version bump.
 *
 * Navigation is built on the same primitives PanelDynamic's own carousel
 * mode uses — Action/ActionContainer (survey-core) rendered via
 * SurveyActionBar (survey-react-ui), SurveyJS's public, documented toolbar
 * mechanism (see the "add-custom-navigation-button" demo) — rather than
 * plain <button> elements, so the buttons/CSS/keyboard behavior genuinely
 * match the rest of the SurveyJS UI instead of just resembling it. Layout
 * mirrors PanelDynamic's own structure: progress bar (if configured) above
 * the content, Back/Next below it in a footer row — not beside it — matching
 * question_paneldynamic.ts's renderElement()/renderNavigatorV2() ordering.
 */
export class MatrixCarouselRenderer extends SurveyQuestionMatrix {
  private stripRef = React.createRef<HTMLDivElement>();
  private isProgrammaticScroll = false;
  private programmaticScrollTimeout?: ReturnType<typeof setTimeout>;
  private intersectionObserver?: IntersectionObserver;
  // Set by the visibleRowsChangedCallback wrapper (componentDidMount) when
  // rows change for any reason (reassignment or a visibleIf cascade),
  // consumed by componentDidUpdate to refresh the IntersectionObserver —
  // see its own comment for why a fresh observer is needed here, not just
  // one that already exists.
  private pendingObserverRefresh = false;

  private prevAction = new Action({
    id: "sv-matrixcarousel-prev",
    locTitle: getSurveyNavLocStrings(this.question as unknown as Question).locPrev,
    action: () => this.handlePrev(),
  });
  private nextAction = new Action({
    id: "sv-matrixcarousel-next",
    locTitle: getSurveyNavLocStrings(this.question as unknown as Question).locNext,
    action: () => this.handleNext(),
  });
  // Plain ActionContainer (not AdaptiveActionContainer) — deliberately: with
  // only two fixed actions there's no overflow-into-a-dots-menu scenario
  // AdaptiveActionContainer's ResizeObserver-driven fit() pass exists for,
  // and that class also renders opacity:0 until its first measurement
  // resolves (fine in a real browser, permanent in jsdom). Plain
  // ActionContainer has neither concern — but see syncActions() below for
  // the one thing it does still need: an explicit flushUpdates() call.
  //
  // cssClasses is assigned explicitly to the survey's own theme actionBar
  // classes (sd-action-bar/sd-action/...) — the same one-liner
  // SurveyElement.createActionContainer() uses internally
  // (`actionContainer.cssClasses = this.survey.getCss().actionBar`,
  // confirmed in the installed survey-core bundle at the call sites for both
  // PanelDynamic's own footer toolbar and the generic base). Without this,
  // ActionContainer falls back to actionBarCss.ts's bare sv- names, which
  // exist but carry none of the current theme's button styling (pill shape,
  // primary-teal text, spacing) — this is what makes Prev/Next actually look
  // like PanelDynamic's Back/Next rather than unstyled default buttons.
  private actionsContainer = (() => {
    const container = new ActionContainer<Action>();
    container.setItems([this.prevAction, this.nextAction]);
    const survey = this.carouselQuestion.survey;
    if (survey && survey.getCss().actionBar) {
      container.cssClasses = survey.getCss().actionBar;
    }
    return container;
  })();

  componentDidMount(): void {
    super.componentDidMount();
    const question = this.carouselQuestion;
    // super.componentDidMount() (SurveyQuestionMatrix, survey-react-ui) just
    // assigned question.visibleRowsChangedCallback to its own handler (a
    // setState() that re-renders the grid/carousel content) — capture it and
    // wrap, don't overwrite: it's a single-slot callback, not a multi-
    // subscriber event, and losing it would break the base class's own
    // re-render-on-rows-change behavior. QuestionMatrixModel.onRowsChanged()
    // (confirmed in survey.core.js) fires this callback unconditionally,
    // covering both rows being reassigned *and* a row's visibleIf flipping
    // via the condition cascade — the second of which onPropertyChanged
    // never fires for (see resyncMatrixCarouselDecomposition's comment).
    // Firing resyncMatrixCarouselDecomposition() here, before the base
    // callback's setState/re-render, keeps getDecomposedRowQuestions()
    // aligned with visibleRows for whatever render that setState triggers.
    const baseVisibleRowsChangedCallback = question.visibleRowsChangedCallback;
    question.visibleRowsChangedCallback = () => {
      resyncMatrixCarouselDecomposition(question as unknown as QuestionMatrixModel);
      this.pendingObserverRefresh = true;
      baseVisibleRowsChangedCallback?.();
    };
    question.onPropertyChanged.add(this.handleQuestionPropertyChanged);
    if (this.isCarousel) {
      this.setupObserver();
      this.syncActions();
    }
  }

  componentDidUpdate(prevProps: unknown, prevState: unknown): void {
    super.componentDidUpdate(prevProps, prevState);

    if (this.isCarousel) {
      // Refresh on pendingObserverRefresh too, not just "doesn't exist yet"
      // — an existing observer keeps watching whatever DOM nodes it
      // .observe()'d at setup time. If rows changed since then, React may
      // have replaced slide nodes (new/removed row keys), leaving the
      // observer watching detached elements and never seeing the new ones —
      // swipe would still scroll visually, but handleIntersection would stop
      // updating currentRowIndex/progress/Back-Next.
      if (!this.intersectionObserver || this.pendingObserverRefresh) {
        this.teardownObserver();
        this.setupObserver();
        this.pendingObserverRefresh = false;
      }
      this.reconcileScrollPosition();
    } else if (this.intersectionObserver) {
      this.teardownObserver();
    }
  }

  componentWillUnmount(): void {
    super.componentWillUnmount();
    this.carouselQuestion.onPropertyChanged.remove(this.handleQuestionPropertyChanged);
    this.teardownObserver();
    if (this.programmaticScrollTimeout) {
      clearTimeout(this.programmaticScrollTimeout);
    }
    // Deliberately not disposing prevAction/nextAction/actionsContainer here.
    // They're class-field-initialized once per component instance, not
    // recreated per mount — calling .dispose() on unmount breaks React
    // StrictMode's mount->unmount->mount double-invoke (the second mount
    // reuses these same, now-disposed instances, and clicking either button
    // then throws "this.action is not a function"). PanelDynamic's own
    // SurveyQuestionPanelDynamic.componentWillUnmount doesn't dispose its
    // footer actions either — it only clears model-level callbacks — so this
    // isn't a corner being cut, it matches the reference implementation.
  }

  private get isCarousel(): boolean {
    return isCarouselDisplayMode(this.question as unknown as Question);
  }

  private get carouselQuestion(): MatrixCarouselQuestion {
    return this.question as unknown as MatrixCarouselQuestion;
  }

  protected renderElement(): React.JSX.Element {
    if (this.isCarousel) {
      return this.renderCarousel();
    }

    return super.renderElement();
  }

  private handlePrev = (): void => {
    prevRow(this.carouselQuestion);
    this.syncActions();
    this.forceUpdate();
  };

  private handleNext = (): void => {
    nextRow(this.carouselQuestion);
    this.syncActions();
    this.forceUpdate();
  };

  /**
   * Re-syncs Back/Next whenever a property syncActions() depends on changes
   * for a reason other than this component's own Next/Previous/swipe
   * handlers — chiefly row-sourcing (carry-forward) repopulating `rows` in
   * response to its source question's value changing while the survey is
   * already running. Safe to call flushUpdates()-triggering syncActions()
   * from here for the same reason it's safe from handlePrev/handleNext: this
   * fires as a SurveyJS model event (question.onPropertyChanged), not from a
   * React lifecycle method — see syncActions()'s own comment for why that
   * distinction matters.
   */
  private handleQuestionPropertyChanged = (
    _sender: unknown,
    options: { name: string },
  ): void => {
    if (!this.isCarousel || !ACTION_RELEVANT_PROPERTIES.has(options.name)) {
      return;
    }

    this.syncActions();
    this.forceUpdate();
  };

  private handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    // Radio/checkbox groups already use Left/Right to move selection within
    // the group — don't hijack that inside a row's own controls.
    const target = event.target as HTMLElement;
    if (target.closest(FOCUSABLE_ROW_CONTROL_SELECTOR)) {
      return;
    }

    event.preventDefault();
    if (event.key === "ArrowLeft") {
      this.handlePrev();
    } else {
      this.handleNext();
    }
  };

  private setupObserver(): void {
    const strip = this.stripRef.current;
    if (!strip || typeof IntersectionObserver === "undefined") {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(this.handleIntersection, {
      root: strip,
      threshold: 0.5,
    });

    Array.from(strip.children).forEach((child) => this.intersectionObserver!.observe(child));
  }

  private teardownObserver(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
  }

  private handleIntersection = (entries: IntersectionObserverEntry[]): void => {
    if (this.isProgrammaticScroll) {
      return;
    }

    const mostVisible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!mostVisible) {
      return;
    }

    const index = Number((mostVisible.target as HTMLElement).dataset.index);
    if (Number.isNaN(index) || index === getCurrentRowIndex(this.carouselQuestion)) {
      return;
    }

    goToRow(this.carouselQuestion, index);
    this.syncActions();
    this.forceUpdate();
  };

  private clearProgrammaticScrollFlag = (): void => {
    this.isProgrammaticScroll = false;
    this.stripRef.current?.removeEventListener("scrollend", this.clearProgrammaticScrollFlag);
    if (this.programmaticScrollTimeout) {
      clearTimeout(this.programmaticScrollTimeout);
      this.programmaticScrollTimeout = undefined;
    }
  };

  private reconcileScrollPosition(): void {
    const strip = this.stripRef.current;
    if (!strip) {
      return;
    }

    const index = getCurrentRowIndex(this.carouselQuestion);
    const target = strip.children.item(index) as HTMLElement | null;
    if (!target) {
      return;
    }

    if (Math.abs(strip.scrollLeft - target.offsetLeft) <= SCROLL_EPSILON_PX) {
      return;
    }

    this.isProgrammaticScroll = true;
    strip.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
    strip.addEventListener("scrollend", this.clearProgrammaticScrollFlag, { once: true });
    this.programmaticScrollTimeout = setTimeout(
      this.clearProgrammaticScrollFlag,
      PROGRAMMATIC_SCROLL_RESET_MS,
    );
  }

  /** Progress bar — rendered above the content, matching PanelDynamic's renderRange() placement. Only for progressIndicatorType "bar"; "text" renders in the footer instead, see renderFooter. */
  private renderProgressBar(currentIndex: number, total: number): React.JSX.Element | null {
    const question = this.carouselQuestion;
    if (question.showProgressIndicator === false || question.progressIndicatorType !== "bar" || total === 0) {
      return null;
    }

    const percent = ((currentIndex + 1) / total) * 100;
    return (
      <div className="sv-matrixcarousel__progress" aria-live="polite">
        <div
          className="sv-matrixcarousel__progress-bar-track sd-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={currentIndex + 1}
        >
          <div
            className="sv-matrixcarousel__progress-bar-fill sd-progress__bar"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  /**
   * Syncs the Back/Next Actions' visible/title from current question state,
   * then flushes: ActionContainer.onSet() (run once by setItems, in the
   * class-field initializer) wires each action's onPropertyChanged listener
   * but never computes visibleActions itself, so mutating .visible queues a
   * *debounced* recompute that mutates reactive state on commit — and
   * SurveyActionBar reacts to that by calling its own setState.
   *
   * Called from the same event handlers that change currentRowIndex
   * (handlePrev/handleNext/handleIntersection), right before forceUpdate,
   * plus handleQuestionPropertyChanged (rows changing for a reason other
   * than this component's own navigation, chiefly row-sourcing) — not from
   * a React lifecycle method reacting afterward. This mirrors
   * PanelDynamic's own pattern exactly: question_paneldynamic.ts's
   * `this.footerToolbar.flushUpdates()` runs inside goToNextPanel() etc. —
   * i.e. as part of the *event handling* that changes state, not from
   * componentDidUpdate. That distinction matters: calling flushUpdates() (and
   * the nested SurveyActionBar.setState it triggers) from componentDidUpdate
   * — even though componentDidUpdate itself runs after commit, not during
   * render — still throws "Cannot update during an existing state
   * transition" in practice (observed in the actual Survey Creator/Form
   * Editor host, not just a synthetic test), because React is still
   * finishing its own commit-phase lifecycle pass across the tree at that
   * point. Firing from the click/observer handler avoids that entirely: it
   * runs as ordinary event-handling code, fully before any render this
   * change causes even starts.
   */
  private syncActions(): void {
    const question = this.carouselQuestion;
    this.prevAction.visible = !isFirstRow(question);
    this.nextAction.visible = !isLastRow(question);
    this.actionsContainer.flushUpdates();
  }

  /**
   * Footer: separator, "N of M" text (if progressIndicatorType is "text"),
   * then Back/Next — same row, same order as PanelDynamic's
   * renderNavigatorV2(). The text is hidden once question.isMobile is true,
   * mirroring question_paneldynamic.ts's own
   * `progressText.visible = !isRenderModeList && !isMobile` — isMobile is a
   * real property on the shared Question base (container-width-driven, not
   * literal device detection), not something PanelDynamic-specific.
   *
   * The text itself is localized via getLocalizationFormatString (a public
   * Base method, reads the survey's current locale each call) with the
   * "panelDynamicProgressText" key ("{0} of {1}") — the same key
   * question_paneldynamic.ts's own progressText getter uses, so this reads
   * correctly in any locale SurveyJS ships rather than a hardcoded " of ".
   */
  private renderFooter(currentIndex: number, total: number): React.JSX.Element | null {
    const question = this.carouselQuestion;
    const showText =
      question.showProgressIndicator !== false &&
      question.progressIndicatorType !== "bar" &&
      total > 0 &&
      !question.isMobile;

    return (
      <div className="sv-matrixcarousel__footer sd-paneldynamic__footer">
        <hr className="sv-matrixcarousel__separator sd-paneldynamic__separator" />
        <div className="sv-matrixcarousel__footer-row sd-paneldynamic__buttons-container">
          {showText && (
            <div
              className="sv-matrixcarousel__progress-text sd-paneldynamic__progress-text"
              aria-live="polite"
            >
              {question.getLocalizationFormatString(
                "panelDynamicProgressText",
                currentIndex + 1,
                total,
              )}
            </div>
          )}
          <SurveyActionBar model={this.actionsContainer} />
        </div>
      </div>
    );
  }

  private renderCarousel(): React.JSX.Element {
    const question = this.carouselQuestion;
    const rows = question.visibleRows;
    const decomposed = getDecomposedRowQuestions(question);
    const currentIndex = getCurrentRowIndex(question);
    const cssClasses = question.cssClasses;

    return (
      <div className="sv-matrixcarousel" ref={(root) => this.setControl(root)}>
        {this.renderProgressBar(currentIndex, rows.length)}
        <div
          className="sv-matrixcarousel__strip"
          ref={this.stripRef}
          onKeyDown={this.handleKeyDown}
          // tabIndex 0 (not -1) so the strip is reachable via Tab — without
          // it, arrow-key navigation is only reachable by clicking dead
          // space on the slide chrome, effectively undiscoverable for a
          // keyboard-only user. aria-label announces what the keys do, since
          // there's no visual affordance otherwise.
          tabIndex={0}
          aria-label="Use arrow keys to move between questions"
        >
          {rows.map((row, i) => {
            const item = row.item as MatrixRowItemValue;
            // hasText (not a truthy check on .text) — ItemValue.text always
            // falls back to String(value) when no text was authored, so
            // `item.text || fallback` would never actually reach the
            // fallback; hasText reflects whether text was genuinely
            // authored. Matches matrix-answer.tsx/pdf-matrix-answer.tsx's
            // own convention for the same image-only-row case, so
            // submission views and the live carousel describe an unlabeled
            // row the same way.
            const imageAlt = item.hasText ? item.text : `Row ${i + 1}`;
            return (
              <div key={row.uniqueId} className="sv-matrixcarousel__slide" data-index={i}>
                {item.imageUrl && (
                  // StoragePresignedImage (not a plain <img>) — matches how
                  // imagepicker/logo/signature-pad already handle images in
                  // this app: resolves a presigned GET URL for private-
                  // storage deployments instead of assigning an unsigned
                  // blob URL to src, which would 403. Safe to use
                  // unconditionally — it passes the URL through unchanged,
                  // synchronously, when storage isn't private or the URL
                  // isn't a storage object URL at all (confirmed in
                  // usePrivateStorageDisplayUrl).
                  <StoragePresignedImage
                    className="sv-matrixcarousel__slide-image"
                    src={item.imageUrl}
                    alt={imageAlt}
                  />
                )}
                <SurveyQuestion element={decomposed[i]} creator={this.creator} css={cssClasses} />
              </div>
            );
          })}
        </div>
        {this.renderFooter(currentIndex, rows.length)}
      </div>
    );
  }
}

export function registerMatrixCarouselRenderer(): void {
  ReactQuestionFactory.Instance.registerQuestion(
    MATRIX_TYPE,
    // The factory's "name" param is actually the full props object passed
    // through from createQuestion(type, params) — registerQuestion's own
    // .d.ts names it loosely. Must return a rendered element, not a
    // manually-constructed instance (new MatrixCarouselRenderer(props)
    // throws — React refuses to render a bare class instance as a child).
    (props: unknown) => <MatrixCarouselRenderer {...(props as object)} />,
  );
}

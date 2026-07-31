import React from "react";
import type { Base } from "survey-core";
import {
  ReactQuestionFactory,
  SurveyQuestionElementBase,
} from "survey-react-ui";
import { DRAG_CATEGORIZE_TYPE, POOL_ZONE_ID } from "./constants";
import type { DragCategorizeQuestion } from "./drag-categorize.model";
import { registerDragCategorizeModel } from "./drag-categorize.registry";
import { getDisplayLabel } from "./utils";
import type {
  DragCategorizeItemValue,
  DragCategorizeZoneItemValue,
} from "./drag-categorize.item-values";
import "./drag-categorize.styles.css";

/**
 * Renders the item pool plus N drop zones. Zone containers carry
 * `data-categorize={zoneId}` — the attribute DragDropCategorize scans for
 * during drag-over. Item chips reuse the `sv-ranking-item` class so the
 * floating drag shortcut inherits theme styling and the engine's cursor
 * handling keeps working.
 */
export class DragCategorizeComponent extends SurveyQuestionElementBase {
  protected get question(): DragCategorizeQuestion {
    return this.questionBase as unknown as DragCategorizeQuestion;
  }

  /**
   * Items and zones are ItemValue objects, so editing them in the Creator's
   * property grid changes no property of the question itself and nothing tells
   * this component to re-render — an image, a renamed zone or a changed
   * capacity would only appear once something else redrew the canvas, such as
   * selecting a different element.
   *
   * SurveyJS solves this by giving each choice its own component subscribed to
   * that item (see SurveyQuestionImagePickerItem.getStateElement). Chips are
   * rendered inline here, so the question component subscribes to them all.
   */
  protected getStateElements(): Base[] {
    const question = this.question;
    return [
      ...super.getStateElements(),
      ...question.visibleChoices,
      ...question.zones,
    ];
  }

  protected renderElement(): React.JSX.Element {
    const question = this.question;
    return (
      <div
        className={question.rootClass}
        ref={(root: HTMLDivElement | null) => {
          this.control = root as HTMLElement;
        }}
      >
        {this.renderPool()}
        <div
          className="sv-categorize__zones"
          style={
            {
              "--sv-categorize-zone-min-width": `${question.zoneMinWidth}px`,
            } as React.CSSProperties
          }
        >
          {question.zones.map((zone) => this.renderZone(zone))}
        </div>
      </div>
    );
  }

  private renderPool(): React.JSX.Element {
    const pool = this.question.pool;
    const isOver = this.question.hoveredZoneId === POOL_ZONE_ID;
    return (
      <div
        className={`sv-categorize__pool${
          isOver ? " sv-categorize__zone--over" : ""
        }`}
        data-categorize={POOL_ZONE_ID}
      >
        {pool.map((item) => this.renderItem(item, POOL_ZONE_ID))}
        {pool.length === 0 && (
          <span className="sv-categorize__pool-empty">All items placed</span>
        )}
      </div>
    );
  }

  private renderZone(zone: DragCategorizeZoneItemValue): React.JSX.Element {
    const question = this.question;
    const zoneId = String(zone.value);
    const isOver = question.hoveredZoneId === zoneId;
    return (
      <div
        key={zoneId}
        className={`sv-categorize__zone${
          isOver ? " sv-categorize__zone--over" : ""
        }`}
        data-categorize={zoneId}
      >
        <div className="sv-categorize__zone-title">
          {/* Localizable strings live outside the property hash, so they need
              their own subscribed viewer to stay live while editing. */}
          {this.renderLocString(zone.locText)}
        </div>
        <div className="sv-categorize__zone-body">
          {question
            .getZoneItems(zoneId)
            .map((item) => this.renderItem(item, zoneId))}
        </div>
        {(zone.minItems > 0 || zone.maxItems > 0) && (
          <span className="sv-categorize__zone-hint">
            {[
              zone.minItems > 0 ? `Min ${zone.minItems}` : "",
              zone.maxItems > 0 ? `Max ${zone.maxItems}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </div>
    );
  }

  /**
   * Caption for an image item: the authored label, or "" when the scripter
   * left it blank or the question has labels turned off.
   */
  private getItemCaption(item: DragCategorizeItemValue): string {
    if (!this.question.showItemLabels) {
      return "";
    }
    return getDisplayLabel(item);
  }

  private renderItem(
    item: DragCategorizeItemValue,
    zoneId: string,
  ): React.JSX.Element | null {
    const question = this.question;
    if (item.isGhost) {
      // Design-mode "newitem" placeholder appended by SurveyJS.
      if (!question.isDesignMode) return null;
      const addItem = () => question.addItemFromDesigner();
      return (
        <div
          key="newitem"
          className="sv-categorize__item sv-categorize__item--ghost"
          // A plain div would leave the only way to add an item on this
          // surface unreachable without a mouse.
          role="button"
          tabIndex={0}
          onClick={addItem}
          onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            // Space would otherwise scroll the design surface.
            event.preventDefault();
            addItem();
          }}
        >
          <div className="sv-categorize__item-content">
            <span className="sv-categorize__item-text">+ Add an item</span>
          </div>
        </div>
      );
    }
    const isInteractive = !this.isDisplayMode && !question.isReadOnly;
    // Both walk hasExplicitLabel; hoisted because hoveredZoneId changes
    // re-render every chip in the pool and every zone on each drop-target move.
    const label = getDisplayLabel(item);
    const caption = this.getItemCaption(item);
    return (
      <div
        key={`${zoneId}:${item.value}`}
        className="sv-ranking-item sv-categorize__item"
        data-categorize-item={String(item.value)}
        onPointerDown={
          isInteractive
            ? (event: React.PointerEvent<HTMLDivElement>) => {
                // Stop the browser from starting a text selection during the
                // pre-drag mouse movement (before the engine disables
                // user-select on <body>).
                event.preventDefault();
                question.handlePointerDown(
                  event.nativeEvent,
                  item,
                  zoneId,
                  event.currentTarget,
                );
              }
            : undefined
        }
      >
        <div
          className={`sv-ranking-item__content sv-categorize__item-content${
            item.imageUrl && caption
              ? " sv-categorize__item-content--captioned"
              : ""
          }`}
        >
          {item.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                // Empty alt when no label was authored: the fallback would be
                // the item's value ("item1"), which is meaningless to read out.
                alt={label}
                className="sv-categorize__item-img"
                draggable={false}
              />
              {caption && (
                <span className="sv-ranking-item__text sv-categorize__item-text">
                  {this.renderLocString(item.locText)}
                </span>
              )}
            </>
          ) : (
            <span className="sv-ranking-item__text sv-categorize__item-text">
              {this.renderLocString(item.locText)}
            </span>
          )}
        </div>
      </div>
    );
  }
}

/** Registers model + ReactQuestionFactory. Invoked from the extension / Creator bindings. */
export function registerDragCategorizeQuestion(): void {
  registerDragCategorizeModel();
  ReactQuestionFactory.Instance.registerQuestion(
    DRAG_CATEGORIZE_TYPE,
    (props) => React.createElement(DragCategorizeComponent, props),
  );
}

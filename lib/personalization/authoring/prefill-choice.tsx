"use client";

import type { ItemValue } from "survey-core";
import { ReactElementFactory } from "survey-react-ui";

const PREFILL_CHOICE = "edx-prefill-choice";
let registered = false;

function hintOf(item: ItemValue): string | undefined {
  const kind = item.getPropertyValue("edxPrefillKind");
  if (typeof kind !== "string" || kind.length === 0) return undefined;
  return kind;
}

/**
 * Popup row. The name is its own line so a narrow property panel does not
 * ellipsize it beside the type. SurveyJS sets `.sv-string-viewer` to block
 * and the list item to `nowrap`, so the row needs `flex!` and `whitespace-normal!`.
 */
function prefillChoice(item: ItemValue) {
  const hint = hintOf(item);
  if (!hint) {
    return <span className="sv-string-viewer block min-w-0 truncate">{item.text}</span>;
  }
  return (
    <span className="edx-prefill-choice sv-string-viewer flex! w-full min-w-0 flex-col gap-0.5 whitespace-normal!">
      <span className="whitespace-normal! break-words">{item.text}</span>
      <span className="whitespace-normal! break-words text-xs leading-snug">
        {hint}
      </span>
    </span>
  );
}

/** A Prefill from row: the Property name, and its type under it. */
export function registerPrefillChoice(): void {
  if (registered) return;
  registered = true;
  ReactElementFactory.Instance.registerElement(PREFILL_CHOICE, (props) =>
    prefillChoice(props.item as ItemValue),
  );
}

export { PREFILL_CHOICE };

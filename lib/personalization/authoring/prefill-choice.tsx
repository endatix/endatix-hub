"use client";

import type { ItemValue } from "survey-core";
import { ReactElementFactory } from "survey-react-ui";

const PREFILL_CHOICE = "edx-prefill-choice";
let registered = false;

/** A Prefill from row: the Property name, and its type beside it. */
export function registerPrefillChoice(): void {
  if (registered) return;
  registered = true;
  ReactElementFactory.Instance.registerElement(PREFILL_CHOICE, (props) => {
    const item = props.item as ItemValue;
    const kind = item.getPropertyValue("edxPrefillKind");
    return (
      // SurveyJS sets `.sv-string-viewer` to block in the list, so the row needs `flex!`.
      <span className="sv-string-viewer flex! min-w-0 items-baseline justify-between gap-3">
        <span className="shrink-0">{item.text}</span>
        {typeof kind === "string" && kind ? (
          <span className="min-w-0 text-right text-xs text-muted-foreground">{kind}</span>
        ) : null}
      </span>
    );
  });
}

export { PREFILL_CHOICE };

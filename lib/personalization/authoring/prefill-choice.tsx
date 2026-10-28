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
      <span className="sv-string-viewer flex min-w-0 items-baseline justify-between gap-3">
        <span className="truncate">{item.text}</span>
        {typeof kind === "string" && kind ? (
          <span className="shrink-0 text-xs text-muted-foreground">{kind}</span>
        ) : null}
      </span>
    );
  });
}

export { PREFILL_CHOICE };

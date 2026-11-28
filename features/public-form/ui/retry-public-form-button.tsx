"use client";

import { publicStatusClassNames } from "@/components/public-status/public-status-page";
import { reloadPage } from "@/lib/utils/reload-page";

export function RetryPublicFormButton() {
  return (
    <button
      className={publicStatusClassNames.action}
      onClick={reloadPage}
      type="button"
    >
      Try again
    </button>
  );
}

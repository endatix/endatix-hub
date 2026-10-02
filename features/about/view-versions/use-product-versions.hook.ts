"use client";

import { useEffect, useState } from "react";
import type { ProductVersions } from "../types";
import { getProductVersionsAction } from "./get-product-versions.action";

const UNAVAILABLE: ProductVersions = { hub: null, api: null };

/** A complete read is kept for the page; a partial one is asked again on the next open. */
let cachedVersions: ProductVersions | undefined;

/** Asks once the reader opens the view, after paint — never on page load. */
export function useProductVersions(open: boolean): ProductVersions | undefined {
  const [versions, setVersions] = useState(cachedVersions);

  useEffect(() => {
    if (!open || cachedVersions) {
      return;
    }

    let cancelled = false;
    void loadVersions().then((result) => !cancelled && setVersions(result));
    return () => {
      cancelled = true;
    };
  }, [open]);

  return versions;
}

async function loadVersions(): Promise<ProductVersions> {
  const result = await getProductVersionsAction().catch(() => UNAVAILABLE);
  if (result.hub && result.api) {
    cachedVersions = result;
  }

  return result;
}

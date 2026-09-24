"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Keeps a list region at its last rendered height while `isPending`, so the
 * skeleton that stands in for the next page can't shrink the page or move the
 * pager from under the pointer. Once rows render again the region takes their
 * natural height: a filter with one result shrinks to one row, every time.
 */
export function useHeldHeight<T extends HTMLElement = HTMLDivElement>(
  isPending: boolean,
) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const element = ref.current;
    if (isPending || !element) {
      return;
    }

    const measure = () => setHeight(element.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isPending]);

  return {
    ref,
    style: isPending && height ? { minHeight: height } : undefined,
  };
}

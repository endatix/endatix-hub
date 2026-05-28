"use client";

import { useEffect, useRef, useState } from "react";

export type UseNearViewportOptions = {
  /** Preload before the element enters the viewport (default 200px). */
  rootMargin?: string;
  threshold?: number;
  /** When true, behaves as if the element is always near the viewport. */
  disabled?: boolean;
};

/**
 * Returns whether an element is near or inside the viewport (one-shot: stays true after first intersect).
 */
export function useNearViewport(options?: UseNearViewportOptions) {
  const {
    rootMargin = "200px",
    threshold = 0,
    disabled = false,
  } = options ?? {};
  const ref = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(disabled);

  useEffect(() => {
    if (disabled) {
      setIsNearViewport(true);
      return;
    }

    const element = ref.current;
    if (element === null) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled, rootMargin, threshold]);

  return { ref, isNearViewport };
}

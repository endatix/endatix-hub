"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { cn } from "@/lib/utils";

interface StableListRegionProps extends ComponentProps<"div"> {
  /**
   * `listScopeKey(listKey)`: filters, sort, and page size — not page. Paging
   * inside one scope keeps the height; a new scope releases it.
   */
  scopeKey: string;
}

/**
 * Holds a list's rows region at the tallest height it reached in one scope,
 * as a flex column. A loading skeleton or a shorter last page can then neither
 * shrink the document (no scroll jump) nor pull the pager up: footers use
 * `mt-auto` and stay at the bottom, under the pointer.
 */
export function StableListRegion({
  scopeKey,
  className,
  style,
  ...props
}: Readonly<StableListRegionProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number>();
  const [heldScope, setHeldScope] = useState(scopeKey);

  if (heldScope !== scopeKey) {
    setHeldScope(scopeKey);
    setMinHeight(undefined);
  }

  const hold = (height: number) =>
    setMinHeight((current) =>
      current === undefined || height > current ? height : current,
    );

  useLayoutEffect(() => {
    if (minHeight === undefined && ref.current) {
      hold(ref.current.getBoundingClientRect().height);
    }
  }, [minHeight]);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() =>
      hold(element.getBoundingClientRect().height),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-slot="stable-list-region"
      className={cn("flex flex-col", className)}
      style={minHeight ? { ...style, minHeight } : style}
      {...props}
    />
  );
}

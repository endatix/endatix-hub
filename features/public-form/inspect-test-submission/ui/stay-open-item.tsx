"use client";

import { DropdownMenu } from "radix-ui";
import { useEffect, useRef, type ReactNode } from "react";

type StayOpenItemProps = {
  className: string;
  onAct: () => void;
  /** Takes focus once true. Radix menu items take programmatic focus. */
  focused?: boolean;
  disabled?: boolean;
  /** What typeahead matches, when the text holds a glyph. */
  textValue?: string;
  children: ReactNode;
};

function useFocusWhen(focused: boolean) {
  const item = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused) item.current?.focus();
  }, [focused]);
  return item;
}

/** A menu item whose action keeps the menu open: drill in, Back, Copy as JSON, Start over. */
export function StayOpenItem({
  onAct,
  focused = false,
  children,
  ...item
}: Readonly<StayOpenItemProps>) {
  const ref = useFocusWhen(focused);
  return (
    <DropdownMenu.Item
      {...item}
      onSelect={(event) => {
        event.preventDefault();
        onAct();
      }}
      ref={ref}
    >
      {children}
    </DropdownMenu.Item>
  );
}

"use client";

import { DropdownMenu } from "radix-ui";
import { useEffect, useRef, type ReactNode } from "react";

type StayOpenItemProps = {
  className: string;
  onAct: () => void;
  /** Takes focus once true. Radix menu items take programmatic focus. */
  focused?: boolean;
  children: ReactNode;
};

function useFocusWhen(focused: boolean) {
  const item = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused) item.current?.focus();
  }, [focused]);
  return item;
}

/** A menu item whose action keeps the menu open: drill in, Back, Copy as JSON. */
export function StayOpenItem({
  className,
  onAct,
  focused = false,
  children,
}: Readonly<StayOpenItemProps>) {
  const item = useFocusWhen(focused);
  return (
    <DropdownMenu.Item
      className={className}
      onSelect={(event) => {
        event.preventDefault();
        onAct();
      }}
      ref={item}
    >
      {children}
    </DropdownMenu.Item>
  );
}

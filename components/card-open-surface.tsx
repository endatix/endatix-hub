"use client";

import type { KeyboardEvent, MouseEventHandler, ReactNode } from "react";

type CardOpenSurfaceProps = {
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  children: ReactNode;
};

/** Enter and Space open the card, as a click would. */
function openOnKey(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  event.currentTarget.click();
}

/** Opens from this region only. Portaled dialogs rendered beside it do not. */
export function CardOpenSurface({
  onClick,
  className,
  children,
}: Readonly<CardOpenSurfaceProps>) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={className}
      onClick={onClick}
      onKeyDown={openOnKey}
    >
      {children}
    </div>
  );
}

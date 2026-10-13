"use client";

import type { KeyboardEvent, MouseEventHandler, ReactNode } from "react";

type CardOpenSurfaceProps = {
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  children: ReactNode;
};

/** Opens from this region only. Portaled dialogs rendered beside it do not. */
export function CardOpenSurface({
  onClick,
  className,
  children,
}: Readonly<CardOpenSurfaceProps>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.currentTarget.click();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={className}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

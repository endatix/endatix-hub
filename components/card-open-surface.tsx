"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardOpenSurfaceProps = {
  /** The button's accessible name: the card's title. */
  label: string;
  onOpen?: () => void;
  className?: string;
  children: ReactNode;
};

/**
 * Opens the card from this region only; portaled dialogs rendered beside it do not. A native button
 * stretched over the region does the opening, so keyboards and screen readers get a real button,
 * while the region keeps block content that a button may not contain.
 */
export function CardOpenSurface({
  label,
  onOpen,
  className,
  children,
}: Readonly<CardOpenSurfaceProps>) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <button
        type="button"
        aria-label={label}
        onClick={onOpen}
        className="absolute inset-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </div>
  );
}

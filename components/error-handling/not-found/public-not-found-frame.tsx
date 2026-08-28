import type { ReactNode } from "react";

/**
 * Full-viewport shell for public share/embed/maintenance 404s.
 * Share layouts do not use Hub chrome; without this, a row-flex ancestor
 * shrink-wraps the canvas to content width (~half the screen).
 */
export function PublicNotFoundFrame({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="fixed inset-0 z-10 flex w-full items-center justify-center bg-content-canvas px-4">
      {children}
    </div>
  );
}

import type { Metadata } from "next";

/**
 * Robots metadata for the application.
 */
export const ROBOTS = {
  /**
   * Robots metadata for a hidden page.
   */
  hiddenPage: { index: false, follow: false },
} satisfies Record<string, NonNullable<Metadata["robots"]>>;

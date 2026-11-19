"use client";

import { isPoweredByShown, useOptionalBrand } from "@/lib/branding/client";

interface PoweredByProps {
  /** `ENDATIX_SHOW_POWERED_BY`, read where the page renders; the pack's `poweredBy` wins over it. */
  readonly envShown: boolean;
  readonly className: string;
  readonly href: string;
}

/** The vendor attribution line. Its text names Endatix on purpose: a pack turns it off, not into its own name. */
export function PoweredBy({ envShown, className, href }: PoweredByProps) {
  if (!isPoweredByShown(useOptionalBrand(), envShown)) return null;
  return (
    <p className={className}>
      Powered by{" "}
      <a href={href} rel="noopener" target="_blank">
        Endatix
      </a>
    </p>
  );
}

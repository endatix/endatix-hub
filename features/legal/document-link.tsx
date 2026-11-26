import type { ReactNode } from "react";
import { TextLink } from "@/components/common/text-link";

export function DocumentLink({ href, children, newTab }: Readonly<{ href?: string; children: ReactNode; newTab?: boolean }>) {
  if (!href) return null;
  if (newTab || !href.startsWith("/")) return <TextLink href={href} external>{children}</TextLink>;
  return <a className="underline" href={href}>{children}</a>;
}

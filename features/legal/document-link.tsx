import type { ReactNode } from "react";

export function DocumentLink({ href, children }: Readonly<{ href?: string; children: ReactNode }>) {
  if (!href) return null;
  return <a className="underline" href={href} target="_blank" rel="noreferrer">{children}</a>;
}

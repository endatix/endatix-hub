import Link from "next/link";
import type { ComponentProps } from "react";

export const workspaceSetupId = "workspace-setup";

export function WorkspaceSetupLink(props: Readonly<Omit<ComponentProps<typeof Link>, "href">>) {
  return <Link {...props} href={`/forms#${workspaceSetupId}`} />;
}

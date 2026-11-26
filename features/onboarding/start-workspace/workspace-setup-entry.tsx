import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { workspaceSetupHref } from "@/lib/routes/workspace-path";
import { canResumeWorkspaceSetup } from "./workspace-api.server";

async function WorkspaceSetupEntry({ admission }: Readonly<{ admission: Promise<boolean> }>) {
  if (!(await admission) || !(await canResumeWorkspaceSetup())) return null;
  return (
    <Button asChild variant="outline" size="sm" className="mb-3 w-fit">
      <Link href={workspaceSetupHref}>
        <ListChecks aria-hidden="true" />
        Workspace setup
      </Link>
    </Button>
  );
}

/** Compose with the admitted page content, never its loading, denial or error view. */
export function withWorkspaceSetupEntry(content: ReactNode) {
  return withWorkspaceSetupAfter(true, content);
}

/** Some pages stream their main data. Only its successful load admits the optional entry. */
export function withWorkspaceSetupAfter(admission: boolean | Promise<boolean>, content: ReactNode) {
  const ready = Promise.resolve(admission).catch(() => false);
  return <>
    <Suspense fallback={null}><WorkspaceSetupEntry admission={ready} /></Suspense>
    {content}
  </>;
}

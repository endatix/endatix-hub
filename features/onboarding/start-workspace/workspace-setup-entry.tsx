import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { workspaceSetupHref } from "@/lib/routes/workspace-path";
import { Result } from "@/lib/result";
import { getFormDesignHref } from "@/features/forms/form-workspace";
import { canResumeWorkspaceSetup, currentWorkspaceStart } from "./workspace-api.server";

async function WorkspaceSetupEntry({ admission }: Readonly<{ admission: Promise<boolean> }>) {
  if (!(await admission) || !(await canResumeWorkspaceSetup())) return null;
  return <ResumeLink />;
}

export async function FormsSetupEntry({ admission }: Readonly<{ admission: Promise<boolean> }>) {
  if (!(await admission)) return null;
  const current = await currentWorkspaceStart();
  if (!current || Result.isError(current.result)) return null;
  const choice = current.result.value;
  if (choice.kind !== "complete") return <ResumeLink />;
  if (!choice.formId) return null;
  return <Button asChild variant="outline" size="sm" className="mb-3 w-fit">
    <Link href={getFormDesignHref(choice.formId, "forms")}>Open my survey</Link>
  </Button>;
}

function ResumeLink() {
  return (
    <Button asChild variant="outline" size="sm" className="mb-3 w-fit">
      <Link href={workspaceSetupHref}>
        <ListChecks aria-hidden="true" />
        Resume workspace setup
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

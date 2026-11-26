import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import { WorkspaceStartSection } from "@/features/onboarding/start-workspace/workspace-start-section";
import { BrandLogo } from "@/lib/branding/client";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";

export const metadata = { title: "Workspace setup" };

export default async function WorkspaceSetupPage() {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await admitWorkspacePage(requireHubAccess());
  const setup = await WorkspaceStartSection();
  if (!setup) redirect("/forms");
  return <>
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-6">
        <BrandLogo className="h-7 w-auto" priority />
        <Link href="/forms" replace className="text-sm font-medium underline-offset-4 hover:underline">Go to my workspace</Link>
      </div>
    </header>
    <main data-workspace-scope={workspaceScope(session?.accessToken)} className="mx-auto max-w-[1200px] px-5 pt-6 pb-20 sm:px-6 sm:pt-8">{setup}</main>
  </>;
}

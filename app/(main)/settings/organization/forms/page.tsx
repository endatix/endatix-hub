import PageTitle from "@/components/headings/page-title";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { RequireFolderAssignmentForm } from "@/features/settings/ui/require-folder-assignment-form";
import { ApiErrorType, EndatixApi } from "@/lib/endatix-api";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { SIGNIN_PATH } from "@/features/auth";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";

export default async function OrganizationFormsSettingsPage() {
  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const canManage = (await checkPermission(Permissions.Tenant.ManageSettings))
    .success;
  if (!canManage) {
    return <UnauthorizedComponent variant="card" />;
  }

  const api = new EndatixApi(session?.accessToken);
  const settingsResult = await api.tenant.getSettings();

  if (!settingsResult.success) {
    if (settingsResult.error.type === ApiErrorType.AuthError) {
      redirect(SIGNIN_PATH);
    }
    return (
      <div className="text-sm text-destructive">
        {settingsResult.error.message}
      </div>
    );
  }

  const requireFolder = settingsResult.data.requireFolderAssignment ?? false;

  return (
    <div className="space-y-6">
      <div>
        <PageTitle title="Organization settings" className="text-2xl" />
        <p className="mt-2 text-sm text-muted-foreground">
          Manage organization-wide behavior for forms and templates.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Form management</h2>
        <p className="text-sm text-muted-foreground">
          Configure folder assignment policies and manage folders from{" "}
          <Link href={"/folders" as Route} className="text-primary underline">
            Folders
          </Link>{" "}
          . For browsing active folders in the Forms area, use{" "}
          <Link
            href={"/forms/folders" as Route}
            className="text-primary underline"
          >
            Form folders
          </Link>
          .
        </p>
      </section>

      <RequireFolderAssignmentForm
        initialRequireFolderAssignment={requireFolder}
      />
    </div>
  );
}

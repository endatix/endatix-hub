import { StandingRefusal } from "@/components/error-handling/standing-refusal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { workspaceSetupHref } from "@/lib/routes/workspace-path";
import type { CreateTenantUserActionState } from "../create-tenant-user.action";

export function InviteFeedback({ state: { feedback } }: Readonly<{ state: CreateTenantUserActionState }>) {
  if (!feedback) return null;
  if (feedback.kind === "standing") return <StandingRefusal refusal={feedback.refusal} />;
  return (
    <Alert role="alert">
      <AlertDescription>
        {feedback.kind === "unavailable"
          ? "Invitations are temporarily unavailable. Try sending the invite again."
          : "This workspace can’t invite teammates yet."}
        {feedback.kind === "setup" && (
          <Link href={workspaceSetupHref} className="font-medium text-primary underline underline-offset-4">
            Continue workspace setup
          </Link>
        )}
        {feedback.kind === "declined" && " You can keep working and try again later."}
      </AlertDescription>
    </Alert>
  );
}

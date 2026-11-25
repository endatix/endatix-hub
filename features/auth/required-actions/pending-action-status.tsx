import Link from "next/link";
import { ReviewActionLink } from "./review-action-link";
import { resolverPath } from "@/lib/routes/resolve-target";
import type { RequiredAction } from "@/lib/endatix-api/auth/required-action";
import { AuthStatus } from "../ui/auth-status";
import {
  DEFAULT_RETURN_URL,
  SIGNOUT_PATH,
} from "../infrastructure/auth-constants";

interface StatusProps {
  actions: RequiredAction[];
}

export function PendingActionStatus({ actions }: Readonly<StatusProps>) {
  const blocking = actions.filter((a) => a.severity === "blocking");
  if (!blocking.length)
    return (
      <AuthStatus tone="success" title="No action required">
        <Link href={DEFAULT_RETURN_URL}>Return to workspace</Link>
      </AuthStatus>
    );
  const href = blocking.map(resolverPath).find(Boolean);
  return (
    <AuthStatus
      tone="warning"
      title="Account action required"
      description={instruction(blocking, href)}
    >
      <ReviewActionLink href={href} />
      <Link href={SIGNOUT_PATH}>Sign out</Link>
    </AuthStatus>
  );
}

function instruction(
  blocking: RequiredAction[],
  href: string | undefined | null,
) {
  if (href) return "Complete the pending account action to continue.";
  if (blocking.some((a) => !a.canResolve))
    return "Your organization’s admin must complete the pending account action before you can continue.";
  return "The page for this action is unavailable. Contact your administrator for help.";
}

"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { Result } from "@/lib/result";
import type { PlatformAdminUserListItem } from "@/lib/endatix-api";
import { grantPlatformAdminAction } from "../../grant-platform-admin/grant-platform-admin.action";

interface PlatformAdminGrantButtonProps {
  user: PlatformAdminUserListItem;
}

export function PlatformAdminGrantButton({
  user,
}: Readonly<PlatformAdminGrantButtonProps>) {
  const router = useRouter();
  const { trackEvent } = useTrackEvent();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const displayName = user.displayName || user.userName;
  const email = user.email || user.userName;

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await grantPlatformAdminAction(user.id);

      if (Result.isSuccess(result)) {
        toast.success(result.value || "Platform administrator access granted.");
        trackEvent("platform_admin_access_granted", {
          success: true,
          user_id: user.id,
        });
        setIsOpen(false);
        router.refresh();
        return;
      }

      toast.error(
        result.message || "Failed to grant platform administrator access.",
      );
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        title="Grant platform admin access"
      >
        Grant
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant platform admin access?</AlertDialogTitle>
            <AlertDialogDescription>
              Grant platform administrator access to{" "}
              <GrantTargetUser displayName={displayName} email={email} />? They
              will be able to manage all platform settings, tenants, and
              organizations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                handleConfirm();
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Granting...
                </>
              ) : (
                "Grant access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GrantTargetUser({
  displayName,
  email,
}: Readonly<{ displayName: string; email: string }>) {
  const showEmail = email !== displayName;

  return (
    <span className="font-medium text-foreground">
      {displayName}
      {showEmail ? ` (${email})` : null}
    </span>
  );
}

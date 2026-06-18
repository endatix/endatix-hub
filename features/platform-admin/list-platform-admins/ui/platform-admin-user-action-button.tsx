"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Result } from "@/lib/result";

type PlatformAdminUserActionButtonProps = {
  userId: string;
  actionLabel: string;
  pendingLabel: string;
  fallbackErrorMessage: string;
  action: (userId: string) => Promise<Result<string>>;
};

export function PlatformAdminUserActionButton({
  userId,
  actionLabel,
  pendingLabel,
  fallbackErrorMessage,
  action,
}: Readonly<PlatformAdminUserActionButtonProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await action(userId);

      if (Result.isSuccess(result)) {
        toast.success(result.value || `${actionLabel} completed`);
        router.refresh();
        return;
      }

      toast.error(result.message || fallbackErrorMessage);
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        actionLabel
      )}
    </Button>
  );
}

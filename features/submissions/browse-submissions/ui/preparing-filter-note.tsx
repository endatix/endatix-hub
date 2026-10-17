"use client";

import { Button } from "@/components/ui/button";
import { Hourglass, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * A header filter whose search copy is being rebuilt: no inputs until the
 * columns say it is ready, and a way to read them again.
 */
export function PreparingFilterNote() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div className="w-56 space-y-2 text-xs">
      <PreparingHint />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
      >
        <RefreshCw className="size-3.5" />
        Check again
      </Button>
    </div>
  );
}

function PreparingHint() {
  return (
    <p className="flex items-start gap-2 text-muted-foreground">
      <Hourglass aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      This filter is being prepared. It works once every answer is ready.
    </p>
  );
}

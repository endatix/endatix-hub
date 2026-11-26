"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Result } from "@/lib/result/result";
import { readPreparation } from "./preparation-status.action";

function watchPreparation(check: () => Promise<boolean>, changed: () => void) {
  let live = true;
  const tick = async () => {
    const finished = await check().catch(() => false);
    if (!live) return;
    if (finished) changed();
    else timer = window.setTimeout(tick, 5000);
  };
  let timer = window.setTimeout(tick, 5000);
  return () => {
    live = false;
    window.clearTimeout(timer);
  };
}

export function PreparingStatus({ scope }: Readonly<{ scope: string }>) {
  const router = useRouter();
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const visible = () => {
      const bounds = status.current?.getBoundingClientRect();
      return !document.hidden && !!bounds && bounds.bottom > 0 && bounds.top < window.innerHeight &&
        !status.current?.closest("details:not([open])");
    };
    return watchPreparation(async () => visible() && await needsRefresh(scope) && visible(), () => router.refresh());
  }, [scope, router]);
  return <p role="status" ref={status}>You can leave this page and come back while we prepare your survey.</p>;
}

async function needsRefresh(scope: string) {
  const result = await readPreparation(scope);
  if (Result.isSuccess(result)) return result.value.kind !== "working";
  return !!result.requiredAction || [401, 403, 404].includes(result.statusCode ?? 0);
}

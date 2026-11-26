"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { preparationChanged } from "./preparation-status.action";

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
  useEffect(() => watchPreparation(async () => {
    if (document.hidden || !status.current?.checkVisibility()) return false;
    return preparationChanged(scope);
  }, () => router.refresh()), [scope, router]);
  return <p role="status" ref={status}>You can leave this page and come back while we prepare your survey.</p>;
}

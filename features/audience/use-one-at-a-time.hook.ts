"use client";

import { useRef, useState } from "react";

/** Runs one task at a time: a call while one runs is ignored. */
export function useOneAtATime() {
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const run = async (task: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    try {
      await task();
    } finally {
      running.current = false;
      setPending(false);
    }
  };
  return { pending, run };
}

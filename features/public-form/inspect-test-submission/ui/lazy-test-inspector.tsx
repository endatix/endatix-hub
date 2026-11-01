"use client";

import dynamic from "next/dynamic";

/** The Test inspector's own chunk: requested only when the server sent a tester's view. */
export const TestInspector = dynamic(() => import("./test-inspector"), {
  ssr: false,
});

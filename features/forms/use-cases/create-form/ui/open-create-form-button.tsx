"use client";

import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";

let openCreateFormSheet: (() => void) | undefined;

/** The header sheet registers this. Empty-state buttons call it. */
export function registerOpenCreateFormSheet(open: () => void): () => void {
  openCreateFormSheet = open;
  return () => {
    if (openCreateFormSheet === open) {
      openCreateFormSheet = undefined;
    }
  };
}

export function OpenCreateFormButton() {
  return (
    <Button
      type="button"
      onClick={() => {
        openCreateFormSheet?.();
      }}
    >
      <FilePlus2 data-icon="inline-start" />
      Create a Form
    </Button>
  );
}

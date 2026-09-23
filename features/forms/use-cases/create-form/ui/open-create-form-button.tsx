"use client";

import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import { requestOpenCreateFormSheet } from "../open-create-form-sheet";

export function OpenCreateFormButton() {
  return (
    <Button type="button" onClick={requestOpenCreateFormSheet}>
      <FilePlus2 data-icon="inline-start" />
      Create a Form
    </Button>
  );
}

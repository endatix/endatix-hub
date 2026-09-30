"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { runCreateProperty } from "./audience-runs";

export function useCreateProperty(formId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<AudienceDataType>("text");

  function create(): void {
    startTransition(async () => {
      if (await runCreateProperty(formId, name, dataType)) {
        setName("");
        router.refresh();
      }
    });
  }

  return { pending, name, setName, dataType, setDataType, create };
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { runDeletePerson, runUpdatePersonValues } from "./audience-runs";

export function usePersonRow(formId: string, person: AudiencePerson) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const saveValue = (propertyId: string, nextValue: string) =>
    startTransition(async () => {
      const ok = await runUpdatePersonValues({
        formId, person, propertyId, nextValue,
      });
      if (ok) router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (await runDeletePerson(formId, person.membershipId)) router.refresh();
    });

  return { pending, saveValue, remove };
}

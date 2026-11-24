import { useEffect, useState } from "react";
import { Result } from "@/lib/result";
import { listFormReportingLocalesAction } from "./list-form-reporting-locales.action";

const NO_LOCALES: string[] = [];

async function readLanguages(formId: string) {
  try {
    const result = await listFormReportingLocalesAction(formId);
    return Result.isSuccess(result) ? result.value : null;
  } catch {
    return null;
  }
}

/** A retained schema needs its own locale read: fetching its languages cannot establish readiness. */
export function useExportLocaleCatalog(formId: string, retained: boolean) {
  const [catalog, setFormLocales] = useState<string[] | null>(NO_LOCALES);
  const needsRead = retained && catalog?.length === 0;
  useEffect(() => {
    if (!needsRead) return;
    let cancelled = false;
    void readLanguages(formId).then((languages) => {
      if (!cancelled) setFormLocales(languages);
    });
    return () => {
      cancelled = true;
    };
  }, [formId, needsRead]);
  return {
    formLocales: catalog ?? NO_LOCALES,
    setFormLocales,
    unavailable: catalog === null,
  };
}

"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FormPdfSettings } from "@/lib/endatix-api/forms/types";
import { Result } from "@/lib/result";
import { reloadPage } from "@/lib/utils/reload-page";
import { Button } from "@/components/ui/button";
import { savePdfSettings } from "./save-pdf-settings.action";

type Props = Readonly<{ formId: string; settings: FormPdfSettings }>;

function useSaveSettings({ formId, settings }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const router = useRouter();
  function change(usesFormTheme: boolean) {
    start(async () => {
      const result = await savePdfSettings(formId, {
        version: settings.version,
        pdf: { usesFormTheme },
      }).catch(() => undefined);
      if (!result) {
        setError(
          "Could not confirm the save. Reload settings before trying again.",
        );
        setNeedsReload(true);
        return;
      }
      setError(Result.isError(result) ? result.message : "");
      router.refresh();
    });
  }
  return { change, error, pending, needsReload };
}

export function PdfThemeSwitch(props: Props) {
  const { change, error, pending, needsReload } = useSaveSettings(props);
  return (
    <>
      <div className="flex items-center gap-3">
        <Switch
          id="pdf-form-theme"
          checked={props.settings.pdf.usesFormTheme}
          disabled={pending || needsReload}
          onCheckedChange={change}
        />
        <Label htmlFor="pdf-form-theme">
          Use the form’s theme on submission PDFs
        </Label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {needsReload && (
        <Button type="button" variant="outline" size="sm" onClick={reloadPage}>
          Reload settings
        </Button>
      )}
    </>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  submit: (form: FormData) => Promise<string>;
}

export function ConsentForm({ submit }: Readonly<Props>) {
  const [checked, setChecked] = useState(false);
  const [error, action, pending] = useActionState(
    async (_: string, form: FormData) => submit(form),
    "",
  );
  return (
    <form action={action} className="grid gap-3">
      <AcceptanceCheckbox checked={checked} onChange={setChecked} />
      <Button type="submit" disabled={!checked || pending}>
        {pending ? "Accepting…" : "Accept and continue"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function AcceptanceCheckbox({
  checked,
  onChange,
}: Readonly<{ checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        name="accept"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      I have read and accept these Terms.
    </label>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  submit: (form: FormData) => Promise<string>;
  decline: () => Promise<void>;
}

export function ConsentForm({ submit, decline }: Readonly<Props>) {
  const [checked, setChecked] = useState(false);
  const [error, action, pending] = useDecision({submit, decline});
  return (
    <form action={action} className="grid gap-3">
      <AcceptanceCheckbox checked={checked} onChange={setChecked} />
      <Button type="submit" disabled={!checked || pending}>
        {pending ? "Accepting…" : "Accept and continue"}
      </Button>
      <Button name="choice" value="decline" formNoValidate variant="outline" disabled={pending}>Decline and sign out</Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function useDecision({submit, decline}: Props) {
  return useActionState(async (_: string, form: FormData) => {
    if (form.get("choice") !== "decline") return submit(form);
    await decline();
    return "";
  }, "");
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

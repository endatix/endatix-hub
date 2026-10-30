"use client";

import { ListChecks } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CHOICES_ID = "add-property-choices";
const OTHER_ID = "add-property-other";
const FIXED =
  "Each line is one choice key, as surveys and exports store it. Choices can't be changed after the property is created.";
const OTHER_HELP =
  "A participant's value can also be something not in the list.";

type ChoicesEditor = {
  choicesText: string;
  setChoicesText: (value: string) => void;
  choices: readonly string[];
  choicesError: string | null;
  allowsOther: boolean;
  setAllowsOther: (value: boolean) => void;
  pending: boolean;
};

/** An empty list is not an error yet: the scripter has not typed a choice. */
const shownError = (form: ChoicesEditor) =>
  form.choicesText.trim() ? form.choicesError : null;

function choicesHelp(form: ChoicesEditor) {
  const error = shownError(form);
  if (error) return error;
  const count = form.choices.length;
  if (count === 0) return "One choice per line, for example north.";
  return count === 1 ? "1 choice." : `${count} choices.`;
}

function choicesInputProps(form: ChoicesEditor) {
  return {
    id: CHOICES_ID,
    value: form.choicesText,
    rows: 5,
    placeholder: "north\nsouth",
    disabled: form.pending,
    "aria-invalid": Boolean(shownError(form)),
    "aria-describedby": helpId(CHOICES_ID),
    spellCheck: false,
    className: "font-mono",
  };
}

function ChoicesField({ form }: Readonly<{ form: ChoicesEditor }>) {
  return (
    <FieldWithHelp
      id={CHOICES_ID}
      label="Choices"
      invalid={Boolean(shownError(form))}
      help={choicesHelp(form)}
    >
      <Textarea
        {...choicesInputProps(form)}
        onChange={(event) => form.setChoicesText(event.target.value)}
      />
    </FieldWithHelp>
  );
}

function OtherField({ form }: Readonly<{ form: ChoicesEditor }>) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={OTHER_ID}
        checked={form.allowsOther}
        disabled={form.pending}
        aria-describedby={helpId(OTHER_ID)}
        onCheckedChange={(checked) => form.setAllowsOther(checked === true)}
      />
      <div className="grid gap-1">
        <Label htmlFor={OTHER_ID}>Accept other values</Label>
        <p id={helpId(OTHER_ID)} className="text-xs text-muted-foreground">
          {OTHER_HELP}
        </p>
      </div>
    </div>
  );
}

/** The choice keys of a new single or multiple choice property, fixed once it is created. */
export function ChoicesFields({ form }: Readonly<{ form: ChoicesEditor }>) {
  return (
    <PanelSection icon={ListChecks} title="Choices" description={FIXED}>
      <div className="grid gap-4">
        <ChoicesField form={form} />
        <OtherField form={form} />
      </div>
    </PanelSection>
  );
}

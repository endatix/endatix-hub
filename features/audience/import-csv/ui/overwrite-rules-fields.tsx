"use client";

import { Users } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AudienceImportOption,
  type AudienceImportOptions,
} from "@/lib/endatix-api/audience/types";
import { OVERWRITE_RULES, type OverwriteRule } from "../overwrite-rules";

type RuleFieldProps = {
  rule: OverwriteRule;
  value: AudienceImportOption;
  disabled: boolean;
  onChange: (option: Partial<AudienceImportOptions>) => void;
};

/** Keep is listed first and recommended; Clear is never preselected. */
const OPTIONS = [AudienceImportOption.Keep, AudienceImportOption.Clear];

const ruleId = (rule: OverwriteRule) => `import-${rule.key}`;

function optionLabel(rule: OverwriteRule, option: AudienceImportOption) {
  const label = rule.labels[option];
  return option === AudienceImportOption.Keep
    ? `${label} (recommended)`
    : label;
}

function RuleOption({
  rule,
  option,
}: Readonly<{ rule: OverwriteRule; option: AudienceImportOption }>) {
  const id = `${ruleId(rule)}-${option}`;
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={option} />
      <Label htmlFor={id} className="font-normal">
        {optionLabel(rule, option)}
      </Label>
    </div>
  );
}

function RuleHeading({ rule }: Readonly<{ rule: OverwriteRule }>) {
  return (
    <div className="grid gap-1">
      <p id={ruleId(rule)} className="text-sm font-medium">
        {rule.title}
      </p>
      <p className="text-xs text-muted-foreground">{rule.help}</p>
    </div>
  );
}

function RuleField({ rule, onChange, ...state }: Readonly<RuleFieldProps>) {
  const choose = (next: string) =>
    onChange({ [rule.key]: next as AudienceImportOption });
  return (
    <div className="grid gap-2">
      <RuleHeading rule={rule} />
      <RadioGroup
        aria-labelledby={ruleId(rule)}
        {...state}
        onValueChange={choose}
        className="gap-2"
      >
        {OPTIONS.map((option) => (
          <RuleOption key={option} rule={rule} option={option} />
        ))}
      </RadioGroup>
    </div>
  );
}

type FieldsProps = {
  options: AudienceImportOptions;
  disabled: boolean;
  onChange: (option: Partial<AudienceImportOptions>) => void;
};

const SECTION_DESCRIPTION =
  "What the import does to participants already on this form. Fixed when the import starts.";

/** The Columns step's overwrite choices (D5, D6), sent with Start. */
export function OverwriteRulesFields(props: Readonly<FieldsProps>) {
  return (
    <PanelSection
      icon={Users}
      title="Existing participants"
      description={SECTION_DESCRIPTION}
    >
      {OVERWRITE_RULES.map((rule) => (
        <RuleField
          key={rule.key}
          rule={rule}
          value={props.options[rule.key]}
          disabled={props.disabled}
          onChange={props.onChange}
        />
      ))}
    </PanelSection>
  );
}

/** The same choices, read-only, as the import was started with. */
export function OverwriteRulesSummary({
  options,
}: Readonly<{ options: AudienceImportOptions }>) {
  return (
    <dl className="grid gap-2">
      {OVERWRITE_RULES.map((rule) => (
        <SummaryRow
          key={rule.key}
          label={rule.title}
          value={rule.labels[options[rule.key]]}
        />
      ))}
    </dl>
  );
}

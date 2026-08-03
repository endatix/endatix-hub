"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatOrganizationDefaultLabel,
  formatSessionExpiryHours,
  type SessionExpiryHours,
} from "../session-expiry-hours";

type SessionExpiryHoursControlProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /**
   * `organization` — sets the org-wide default (empty = never expire).
   * `form` — form override; empty / restore inherits organization default.
   */
  variant: "organization" | "form";
  /** Organization default used for form placeholders and helper copy. */
  organizationDefaultHours?: SessionExpiryHours;
  /** True when the form currently stores an override (not inheriting). */
  isOverridden?: boolean;
  /** Form: restore inheritance to the organization default. */
  onRestoreDefault?: () => void;
  /** Optional commit action (shown only when `showCommit` is true). */
  onCommit?: () => void;
  showCommit?: boolean;
  /** When false, render without the outer label (e.g. form-details grid). */
  showLabel?: boolean;
  label?: string;
};

export function SessionExpiryHoursControl({
  id,
  value,
  onChange,
  disabled = false,
  variant,
  organizationDefaultHours = null,
  isOverridden = false,
  onRestoreDefault,
  onCommit,
  showCommit = false,
  showLabel = true,
  label = variant === "organization"
    ? "Default session expiry (hours)"
    : "Session expiry (hours)",
}: Readonly<SessionExpiryHoursControlProps>) {
  const orgDefaultLabel = formatOrganizationDefaultLabel(
    organizationDefaultHours,
  );
  const placeholder =
    variant === "form"
      ? formatSessionExpiryHours(organizationDefaultHours)
      : "Never expires";

  const helperText =
    variant === "organization"
      ? "Organization default for public form sessions. Forms can override this in Form details. Leave empty for sessions that never expire."
      : isOverridden
        ? `Override active. ${orgDefaultLabel}. Applies on the next respondent save.`
        : `Using ${orgDefaultLabel.toLowerCase()}. Set a value to override for this form. Applies on the next respondent save.`;

  const showRestore =
    variant === "form" && isOverridden && Boolean(onRestoreDefault);

  return (
    <div className="space-y-2">
      {showLabel ? (
        <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          <p className="text-sm text-muted-foreground">{helperText}</p>
        </div>
      ) : null}

      <div className="flex max-w-md flex-wrap items-center gap-2">
        <Input
          id={id}
          type="number"
          min={1}
          inputMode="numeric"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-40"
        />
        {showCommit && onCommit ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={onCommit}
          >
            Save
          </Button>
        ) : null}
        {showRestore ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onRestoreDefault}
          >
            Restore default
          </Button>
        ) : null}
      </div>

      {!showLabel ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

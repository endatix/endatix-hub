import type { ComponentType } from "react";
import type { StatusTone } from "@/components/common/status-badge";

export interface FacetedFilterOption {
  label: string;
  value: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: StatusTone;
}

export interface FacetedFilterGroup {
  label: string;
  tone?: StatusTone;
  options: readonly FacetedFilterOption[];
}

export type GroupSelection = "all" | "some" | "none";

export interface SelectionChip {
  key: string;
  label: string;
  tone?: StatusTone;
}

export function toFacetedFilterGroups(
  options: readonly FacetedFilterOption[],
): FacetedFilterGroup[] {
  return options.map((option) => ({
    label: option.label,
    tone: option.tone,
    options: [option],
  }));
}

export function groupSelection(
  group: FacetedFilterGroup,
  selected: ReadonlySet<string>,
): GroupSelection {
  const count = group.options.filter((option) =>
    selected.has(option.value),
  ).length;
  if (count === 0) {
    return "none";
  }
  return count === group.options.length ? "all" : "some";
}

export function toggleValue(
  value: string,
  selected: ReadonlySet<string>,
): Set<string> {
  const next = new Set(selected);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function toggleGroup(
  group: FacetedFilterGroup,
  selected: ReadonlySet<string>,
): Set<string> {
  const next = new Set(selected);
  const clear = groupSelection(group, selected) === "all";
  for (const option of group.options) {
    if (clear) {
      next.delete(option.value);
    } else {
      next.add(option.value);
    }
  }
  return next;
}

export function summarizeSelection(
  groups: readonly FacetedFilterGroup[],
  selected: ReadonlySet<string>,
): SelectionChip[] {
  return groups.flatMap((group) => {
    const whole =
      group.options.length > 1 && groupSelection(group, selected) === "all";
    if (whole) {
      return [toChip(`group:${group.label}`, group)];
    }
    return group.options
      .filter((option) => selected.has(option.value))
      .map((option) => toChip(option.value, option));
  });
}

function toChip(
  key: string,
  { label, tone }: { label: string; tone?: StatusTone },
): SelectionChip {
  return { key, label, tone };
}

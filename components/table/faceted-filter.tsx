"use client";

import { Check, Minus } from "lucide-react";
import { StatusBadge, StatusDot } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  type FacetedFilterGroup,
  type FacetedFilterOption,
  type GroupSelection,
  type SelectionChip,
  groupSelection,
  summarizeSelection,
  toFacetedFilterGroups,
  toggleGroup,
  toggleValue,
} from "./faceted-filter-selection";

export type {
  FacetedFilterGroup,
  FacetedFilterOption,
} from "./faceted-filter-selection";

/** More chips than this collapse to "n selected". */
const MAX_TRIGGER_CHIPS = 2;

interface FacetedFilterBaseProps {
  title: string;
  selectedValues: Set<string>;
  onValueChange: (values: Set<string>) => void;
  disabled?: boolean;
}

/**
 * Flat `options`, or `groups` whose heading selects every option in it. A
 * one-option group renders as a plain row.
 */
export type FacetedFilterProps = FacetedFilterBaseProps &
  (
    | { options: FacetedFilterOption[]; groups?: never }
    | { groups: readonly FacetedFilterGroup[]; options?: never }
  );

export function FacetedFilter({
  title,
  options,
  groups,
  selectedValues,
  onValueChange,
  disabled = false,
}: Readonly<FacetedFilterProps>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const sections = groups ?? toFacetedFilterGroups(options ?? []);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-dashed"
          disabled={disabled}
        >
          {title}
          <TriggerSummary
            chips={summarizeSelection(sections, selectedValues)}
            count={selectedValues.size}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {sections.map((section) => (
              <FilterSection
                key={section.label}
                section={section}
                grouped={groups !== undefined}
                selectedValues={selectedValues}
                onValueChange={onValueChange}
              />
            ))}
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onValueChange(new Set())}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const CHIP_CLASS_NAME = "rounded-sm px-1 font-normal";

interface TriggerSummaryProps {
  chips: SelectionChip[];
  count: number;
}

function TriggerSummary({ chips, count }: Readonly<TriggerSummaryProps>) {
  if (count === 0) {
    return null;
  }

  return (
    <>
      <Separator orientation="vertical" className="mx-2 h-4" />
      <Badge variant="secondary" className={cn(CHIP_CLASS_NAME, "lg:hidden")}>
        {count}
      </Badge>
      <div className="hidden gap-1 lg:flex">
        <TriggerChips chips={chips} count={count} />
      </div>
    </>
  );
}

function TriggerChips({ chips, count }: Readonly<TriggerSummaryProps>) {
  if (chips.length > MAX_TRIGGER_CHIPS) {
    return (
      <Badge variant="secondary" className={CHIP_CLASS_NAME}>
        {count} selected
      </Badge>
    );
  }

  return chips.map((chip) => <TriggerChip key={chip.key} chip={chip} />);
}

function TriggerChip({ chip }: Readonly<{ chip: SelectionChip }>) {
  if (!chip.tone) {
    return (
      <Badge variant="secondary" className={CHIP_CLASS_NAME}>
        {chip.label}
      </Badge>
    );
  }

  const className = "px-1.5 py-0 font-normal";
  return (
    <StatusBadge tone={chip.tone} label={chip.label} className={className} />
  );
}

interface FilterSectionProps {
  section: FacetedFilterGroup;
  /** From `groups`: every section is a top-level row, even with one option. */
  grouped: boolean;
  selectedValues: Set<string>;
  onValueChange: (values: Set<string>) => void;
}

/**
 * In a grouped facet every section is a heading row (checkbox, dot, label), so
 * a one-option group sits level with the others; its option has no row of its
 * own. Flat options render as plain rows.
 */
function FilterSection(props: Readonly<FilterSectionProps>) {
  const { section, grouped, selectedValues: selected, onValueChange } = props;
  return (
    <CommandGroup>
      {grouped && (
        <GroupHeadingRow
          section={section}
          selection={groupSelection(section, selected)}
          onSelect={() => onValueChange(toggleGroup(section, selected))}
        />
      )}
      {(!grouped || section.options.length > 1) && <OptionRows {...props} />}
    </CommandGroup>
  );
}

function OptionRows({
  section,
  grouped,
  selectedValues: selected,
  onValueChange,
}: Readonly<FilterSectionProps>) {
  const groupLabel = grouped ? section.label : undefined;
  return section.options.map((option) => (
    <OptionRow
      key={option.value}
      option={option}
      groupLabel={groupLabel}
      selected={selected.has(option.value)}
      onSelect={() => onValueChange(toggleValue(option.value, selected))}
    />
  ));
}

const GROUP_SELECTION_SR_TEXT: Record<GroupSelection, string> = {
  all: "all selected",
  some: "some selected",
  none: "none selected",
};

/** A one-option heading is one choice: "selected", not "all selected". */
function selectionSrText(size: number, selection: GroupSelection): string {
  if (size > 1) {
    return GROUP_SELECTION_SR_TEXT[selection];
  }
  return selection === "all" ? "selected" : "not selected";
}

interface GroupHeadingRowProps {
  section: FacetedFilterGroup;
  selection: GroupSelection;
  onSelect: () => void;
}

function GroupHeadingRow(props: Readonly<GroupHeadingRowProps>) {
  const { section, selection, onSelect } = props;
  const keywords = [section.label, ...section.options.map((o) => o.label)];
  return (
    <CommandItem
      value={`group:${section.label}`}
      keywords={keywords}
      onSelect={onSelect}
      data-selection={selection}
      className="font-medium"
    >
      <SelectionBox selection={selection} />
      {section.tone && <StatusDot tone={section.tone} />}
      <span>{section.label}</span>
      <span className="sr-only">
        , {selectionSrText(section.options.length, selection)}
      </span>
    </CommandItem>
  );
}

interface OptionRowProps {
  option: FacetedFilterOption;
  /** Set when the row sits under a group heading: indents it, and search finds it by the group. */
  groupLabel?: string;
  selected: boolean;
  onSelect: () => void;
}

function OptionRow(props: Readonly<OptionRowProps>) {
  const { option, groupLabel, selected, onSelect } = props;
  const selection: GroupSelection = selected ? "all" : "none";
  return (
    <CommandItem
      value={option.value}
      keywords={groupLabel ? [option.label, groupLabel] : [option.label]}
      onSelect={onSelect}
      data-selection={selection}
      className={cn(groupLabel && "pl-8")}
    >
      <SelectionBox selection={selection} />
      <OptionLabel option={option} />
    </CommandItem>
  );
}

function OptionLabel({ option }: Readonly<{ option: FacetedFilterOption }>) {
  if (option.tone) {
    return <StatusBadge tone={option.tone} label={option.label} />;
  }

  return (
    <>
      {option.icon && <option.icon className="h-4 w-4 text-muted-foreground" />}
      <span>{option.label}</span>
    </>
  );
}

function SelectionBox({ selection }: Readonly<{ selection: GroupSelection }>) {
  const Mark = selection === "some" ? Minus : Check;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
        selection === "none"
          ? "opacity-50 [&_svg]:invisible"
          : "bg-primary text-primary-foreground",
      )}
    >
      <Mark className="h-4 w-4 text-current" />
    </div>
  );
}

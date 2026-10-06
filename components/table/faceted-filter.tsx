"use client";

import { Check, ChevronsUpDown, Minus } from "lucide-react";
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

const MAX_TRIGGER_CHIPS = 2;

interface FacetedFilterBaseProps {
  title: string;
  selectedValues: Set<string>;
  onValueChange: (values: Set<string>) => void;
  disabled?: boolean;
  /**
   * `toolbar` (default): a dashed pill named by `title`, for a list toolbar.
   * `field`: a full-width form control under its own `<Label htmlFor={id}>`;
   * it always names what is selected, `emptyLabel` when nothing is.
   */
  variant?: "toolbar" | "field";
  id?: string;
  /** Field only: ids of the help lines under the control. */
  describedBy?: string;
  /** Field only: what an empty selection means, e.g. "All statuses". */
  emptyLabel?: string;
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

export function FacetedFilter(props: Readonly<FacetedFilterProps>) {
  const { groups, options, disabled = false } = props;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const sections = groups ?? toFacetedFilterGroups(options ?? []);
  const isField = props.variant === "field";

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button {...triggerButtonProps(props)}>
          {isField ? (
            <FieldTriggerContent {...props} sections={sections} />
          ) : (
            <ToolbarTriggerContent {...props} sections={sections} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0",
          isField ? "w-(--radix-popover-trigger-width)" : "w-[260px]",
        )}
        align="start"
      >
        <FacetedFilterMenu
          {...props}
          sections={sections}
          grouped={groups !== undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

function triggerButtonProps(props: Readonly<FacetedFilterBaseProps>) {
  if (props.variant === "field") {
    return {
      id: props.id,
      type: "button" as const,
      variant: "outline" as const,
      className: "h-auto min-h-9 w-full justify-between font-normal",
      "aria-describedby": props.describedBy,
      disabled: props.disabled,
    };
  }
  return {
    id: props.id,
    type: "button" as const,
    variant: "outline" as const,
    size: "sm" as const,
    className: "rounded-full border-dashed",
    disabled: props.disabled,
  };
}

type TriggerContentProps = Readonly<
  FacetedFilterBaseProps & { sections: readonly FacetedFilterGroup[] }
>;

function ToolbarTriggerContent(props: TriggerContentProps) {
  const { title, sections, selectedValues } = props;
  return (
    <>
      {title}
      <TriggerSummary
        chips={summarizeSelection(sections, selectedValues)}
        count={selectedValues.size}
      />
    </>
  );
}

/** A field names its whole selection at every width and never goes blank. */
function FieldTriggerContent(props: TriggerContentProps) {
  const { emptyLabel, sections, selectedValues } = props;
  const chips = summarizeSelection(sections, selectedValues);
  return (
    <>
      <span className="flex flex-wrap items-center gap-1">
        {chips.length === 0 ? (
          <span className="text-muted-foreground">{emptyLabel}</span>
        ) : (
          <TriggerChips chips={chips} count={selectedValues.size} />
        )}
      </span>
      <ChevronsUpDown className="size-4 opacity-50" aria-hidden="true" />
    </>
  );
}

interface FacetedFilterMenuProps extends FacetedFilterBaseProps {
  sections: readonly FacetedFilterGroup[];
  grouped: boolean;
}

function FacetedFilterMenu(props: Readonly<FacetedFilterMenuProps>) {
  const { title, selectedValues, onValueChange } = props;
  return (
    <Command>
      <CommandInput placeholder={title} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <FilterSections {...props} />
        {selectedValues.size > 0 && (
          <ClearSelection
            label={
              props.variant === "field" ? "Clear selection" : "Clear filters"
            }
            onClear={() => onValueChange(new Set())}
          />
        )}
      </CommandList>
    </Command>
  );
}

function FilterSections(props: Readonly<FacetedFilterMenuProps>) {
  return props.sections.map((section) => (
    <FilterSection
      key={section.label}
      section={section}
      grouped={props.grouped}
      selectedValues={props.selectedValues}
      onValueChange={props.onValueChange}
    />
  ));
}

function ClearSelection({
  label,
  onClear,
}: Readonly<{ label: string; onClear: () => void }>) {
  return (
    <>
      <CommandSeparator />
      <CommandGroup>
        <CommandItem onSelect={onClear} className="justify-center text-center">
          {label}
        </CommandItem>
      </CommandGroup>
    </>
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
  grouped: boolean;
  selectedValues: Set<string>;
  onValueChange: (values: Set<string>) => void;
}

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

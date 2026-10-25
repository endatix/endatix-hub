"use client";

import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { CopyJsonItem } from "./copy-json-item";
import { StayOpenItem } from "./stay-open-item";
import styles from "./test-inspector.module.css";

const MISSING = "—";

/**
 * A value as the panel shows it: text as is, anything else as JSON, and "—" when it is missing.
 * Blank text is quoted, so a value frozen as "" never reads as missing.
 */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return MISSING;
  if (typeof value !== "string") return JSON.stringify(value);
  return value.trim() === "" ? JSON.stringify(value) : value;
}

export type PanelField = readonly [name: string, value: unknown];

type InertItemProps = {
  className: string;
  label: string;
  textValue: string;
  children: ReactNode;
};

/** A menu item that does nothing: in a menu only items take focus, so arrow keys and screen readers reach it. */
function InertItem({
  className,
  label,
  textValue,
  children,
}: Readonly<InertItemProps>) {
  return (
    <DropdownMenu.Item
      aria-label={label}
      className={className}
      onSelect={(event) => event.preventDefault()}
      textValue={textValue}
    >
      {children}
    </DropdownMenu.Item>
  );
}

/** A field as an inert item named "name: value". */
function PanelFieldItem({
  field: [name, value],
}: Readonly<{ field: PanelField }>) {
  const shown = displayValue(value);
  return (
    <InertItem
      className={styles.field}
      label={`${name}: ${shown}`}
      textValue={name}
    >
      <span className={styles.fieldName}>{name}</span>
      <span className={styles.fieldValue}>{shown}</span>
    </InertItem>
  );
}

/** Name and value pairs, one item each. */
export function PanelFields({
  fields,
}: Readonly<{ fields: ReadonlyArray<PanelField> }>) {
  return fields.map((field) => <PanelFieldItem field={field} key={field[0]} />);
}

function EmptyItem({ text }: Readonly<{ text: string }>) {
  return (
    <InertItem className={styles.empty} label={text} textValue={text}>
      {text}
    </InertItem>
  );
}

type PanelSectionProps = {
  title: string;
  /** Shown as an item when there are no fields, so it is announced too. */
  empty: string;
  fields: ReadonlyArray<PanelField>;
};

/** A titled run of fields, in a group named by its title, so a screen reader says where it starts. */
export function PanelSection({
  title,
  empty,
  fields,
}: Readonly<PanelSectionProps>) {
  return (
    <DropdownMenu.Group aria-label={title}>
      <DropdownMenu.Label className={styles.sectionLabel}>
        {title}
      </DropdownMenu.Label>
      {fields.length === 0 ? (
        <EmptyItem text={empty} />
      ) : (
        <PanelFields fields={fields} />
      )}
    </DropdownMenu.Group>
  );
}

/** Back, which takes focus when the panel opens, then the title and the Frozen tag. */
function PanelHeader({
  title,
  onBack,
}: Readonly<{ title: string; onBack: () => void }>) {
  return (
    <div className={styles.panelHeader}>
      <StayOpenItem
        className={styles.back}
        focused
        onAct={onBack}
        textValue="Back"
      >
        <span aria-hidden="true">‹</span> Back
      </StayOpenItem>
      <span className={styles.panelTitle}>{title}</span>
      <span className={styles.frozen}>Frozen</span>
    </div>
  );
}

type InspectorPanelProps = {
  title: string;
  /** What Copy as JSON writes. */
  data: unknown;
  onBack: () => void;
  children: ReactNode;
};

/**
 * A drill-in from the menu, tagged Frozen: it shows what the test submission was stored with,
 * which editing the person later does not change.
 * Back takes focus on open, so Enter, then Esc or Enter on Back, round-trips from the keyboard.
 */
export function InspectorPanel({
  title,
  data,
  onBack,
  children,
}: Readonly<InspectorPanelProps>) {
  return (
    <DropdownMenu.Group
      aria-label={`${title}, Frozen`}
      className={styles.panel}
    >
      <PanelHeader onBack={onBack} title={title} />
      {children}
      <DropdownMenu.Separator className={styles.separator} />
      <CopyJsonItem data={data} />
    </DropdownMenu.Group>
  );
}

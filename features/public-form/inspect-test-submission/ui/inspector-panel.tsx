"use client";

import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { CopyJsonItem } from "./copy-json-item";
import { StayOpenItem } from "./stay-open-item";
import styles from "./test-inspector.module.css";

const MISSING = "—";

/** A value as the panel shows it: text as is, anything else as JSON, and "—" when it is missing. */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return MISSING;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export type PanelField = readonly [name: string, value: unknown];

/** An inert menu item named "name: value": in a menu only items take focus, so arrow keys and screen readers reach it. */
function PanelFieldItem({
  field: [name, value],
}: Readonly<{ field: PanelField }>) {
  const shown = displayValue(value);
  return (
    <DropdownMenu.Item
      aria-label={`${name}: ${shown}`}
      className={styles.field}
      onSelect={(event) => event.preventDefault()}
      textValue={name}
    >
      <span className={styles.fieldName}>{name}</span>
      <span className={styles.fieldValue}>{shown}</span>
    </DropdownMenu.Item>
  );
}

/** Name and value pairs, or `empty` when there are none. */
export function PanelFields({
  empty,
  fields,
}: Readonly<{ empty?: string; fields: ReadonlyArray<PanelField> }>) {
  if (fields.length === 0) return <p className={styles.empty}>{empty}</p>;
  return fields.map((field) => <PanelFieldItem field={field} key={field[0]} />);
}

/** Back, which takes focus when the panel opens, then the title and the Frozen tag. */
function PanelHeader({
  title,
  onBack,
}: Readonly<{ title: string; onBack: () => void }>) {
  return (
    <div className={styles.panelHeader}>
      <StayOpenItem className={styles.back} focused onAct={onBack}>
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
    <DropdownMenu.Group aria-label={title} className={styles.panel}>
      <PanelHeader onBack={onBack} title={title} />
      {children}
      <DropdownMenu.Separator className={styles.separator} />
      <CopyJsonItem data={data} />
    </DropdownMenu.Group>
  );
}

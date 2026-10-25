"use client";

import {
  submissionDetailsHref,
  type TestInspectorView,
} from "@/features/public-form/inspect-test-submission/test-inspector-view";
import { useOptionalFormRuntime } from "@/lib/form-runtime/form-runtime.context";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { SnapshotPanel } from "./snapshot-panel";
import type { StartOverControls } from "./start-over";
import { StayOpenItem } from "./stay-open-item";
import { SubmittingAsPanel } from "./submitting-as-panel";
import styles from "./test-inspector.module.css";

type RowProps = { label: string; hint?: string; icon?: string };

/** A row that does nothing yet: its panel comes later, so it only names what it holds. */
function InertRow({ label, hint, icon }: Readonly<RowProps>) {
  return (
    <DropdownMenu.Item className={styles.row} disabled>
      <span>{label}</span>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      {icon ? <span aria-hidden="true">{icon}</span> : null}
    </DropdownMenu.Item>
  );
}

function LinkRow({
  label,
  href,
}: Readonly<{ label: string; href: string | null }>) {
  if (!href) return <InertRow hint="Not saved yet" label={label} />;
  return (
    <DropdownMenu.Item asChild className={styles.row}>
      <a href={href} rel="noopener noreferrer" target="_blank">
        <span>{label}</span>
        <span aria-hidden="true">↗</span>
      </a>
    </DropdownMenu.Item>
  );
}

/** Start over from the menu. The result lives on the trigger, so closing the menu does not forget it. */
function StartOverRow({ restart }: Readonly<{ restart: StartOverControls }>) {
  const { pending, problem, canRun, run } = restart;
  return (
    <>
      {canRun ? (
        <StayOpenItem className={styles.row} disabled={pending} onAct={run}>
          Start over
        </StayOpenItem>
      ) : null}
      {problem ? <output className={styles.problem}>{problem}</output> : null}
    </>
  );
}

/** Submission Details for the view's submission, else the one the first save put in the runtime. */
function useSubmissionHref(view: TestInspectorView): string | null {
  const runtime = useOptionalFormRuntime();
  const savedId = runtime?.stateRef.current?.submissionId;
  return submissionDetailsHref(view.formId, view.submissionId ?? savedId);
}

function snapshotHint({ snapshot }: TestInspectorView): string {
  if (!snapshot) return "None";
  const count = snapshot.values.length;
  return count === 1 ? "1 value" : `${count} values`;
}

type PanelName = "submitter" | "snapshot";

/** Which panel is open, and which row to focus once Back closes it. */
type PanelNavigation = {
  panel: PanelName | null;
  returnedFrom: PanelName | null;
  open: (panel: PanelName) => void;
  back: () => void;
  /** Esc in a panel goes back instead of closing the menu. */
  onEscape: (event: KeyboardEvent) => void;
};

function usePanelNavigation(): PanelNavigation {
  const [panel, setPanel] = useState<PanelName | null>(null);
  const [returnedFrom, setReturnedFrom] = useState<PanelName | null>(null);
  const back = () => {
    setReturnedFrom(panel);
    setPanel(null);
  };
  const onEscape = (event: KeyboardEvent) => {
    if (!panel) return;
    event.preventDefault();
    back();
  };
  return { panel, returnedFrom, open: setPanel, back, onEscape };
}

type PanelRowProps = RowProps & {
  /** Takes focus on mount: the row Back returns to. */
  focused: boolean;
  onOpen: () => void;
};

/** A row that drills into its panel; the menu stays open. */
function PanelRow({ label, hint, focused, onOpen }: Readonly<PanelRowProps>) {
  return (
    <StayOpenItem className={styles.row} focused={focused} onAct={onOpen}>
      <span>{label}</span>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      <span aria-hidden="true">›</span>
    </StayOpenItem>
  );
}

function identityRows(view: TestInspectorView) {
  return [
    {
      panel: "submitter",
      label: "Submitting as",
      hint: view.submitter.identifier ?? "Anonymous",
    },
    { panel: "snapshot", label: "Snapshot", hint: snapshotHint(view) },
  ] as const;
}

type NavigatedProps = { view: TestInspectorView; nav: PanelNavigation };

/** Who the test submits as and what it was opened with. Each drills into its Frozen panel. */
function IdentityRows({ view, nav }: Readonly<NavigatedProps>) {
  return identityRows(view).map(({ panel, label, hint }) => (
    <PanelRow
      focused={nav.returnedFrom === panel}
      hint={hint}
      key={panel}
      label={label}
      onOpen={() => nav.open(panel)}
    />
  ));
}

function OpenPanel({
  panel,
  view,
  onBack,
}: Readonly<{
  panel: PanelName;
  view: TestInspectorView;
  onBack: () => void;
}>) {
  return panel === "submitter" ? (
    <SubmittingAsPanel onBack={onBack} submitter={view.submitter} />
  ) : (
    <SnapshotPanel onBack={onBack} snapshot={view.snapshot} />
  );
}

/** Where the tester goes next: the submission, its participant, or a fresh test submission. */
function ActionRows({
  restart,
  view,
}: Readonly<{ restart: StartOverControls | null; view: TestInspectorView }>) {
  const submissionHref = useSubmissionHref(view);
  return (
    <>
      <LinkRow href={submissionHref} label="Submission" />
      <LinkRow
        href={view.links.participant.href}
        label={view.links.participant.label}
      />
      {restart ? <StartOverRow restart={restart} /> : null}
    </>
  );
}

type MenuProps = { restart: StartOverControls | null; view: TestInspectorView };

/** The rows, top to bottom, until one drills into a panel. */
function MenuRows({
  restart,
  view,
  nav,
}: Readonly<MenuProps & NavigatedProps>) {
  return (
    <>
      <IdentityRows nav={nav} view={view} />
      <DropdownMenu.Separator className={styles.separator} />
      <ActionRows restart={restart} view={view} />
      <DropdownMenu.Separator className={styles.separator} />
      <InertRow hint="Coming soon" icon="⚙" label="Preferences" />
    </>
  );
}

/**
 * The Test inspector's menu. Esc in a panel goes back to the rows; Esc in the rows closes the
 * menu and Radix returns focus to the trigger. Closing unmounts it, so it reopens on the rows.
 */
export function TestInspectorMenu({ restart, view }: Readonly<MenuProps>) {
  const nav = usePanelNavigation();
  return (
    <DropdownMenu.Content
      align="end"
      aria-label="Test inspector"
      className={styles.menu}
      onEscapeKeyDown={nav.onEscape}
      side="top"
      sideOffset={8}
    >
      {nav.panel ? (
        <OpenPanel onBack={nav.back} panel={nav.panel} view={view} />
      ) : (
        <MenuRows nav={nav} restart={restart} view={view} />
      )}
    </DropdownMenu.Content>
  );
}

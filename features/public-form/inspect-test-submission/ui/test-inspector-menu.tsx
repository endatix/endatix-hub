"use client";

import {
  submissionDetailsHref,
  type TestInspectorView,
} from "@/features/public-form/inspect-test-submission/test-inspector-view";
import { useOptionalFormRuntime } from "@/lib/form-runtime/form-runtime.context";
import { DropdownMenu } from "radix-ui";
import type { StartOverControls } from "./start-over";
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
        <DropdownMenu.Item
          className={styles.row}
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            run();
          }}
        >
          Start over
        </DropdownMenu.Item>
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

/** Who the test submits as and what it was opened with; the panels come next. */
function IdentityRows({ view }: Readonly<{ view: TestInspectorView }>) {
  const identifier = view.submitter.identifier ?? "Anonymous";
  return (
    <>
      <InertRow hint={identifier} icon="›" label="Submitting as" />
      <InertRow hint={snapshotHint(view)} icon="›" label="Snapshot" />
    </>
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

/** The Test inspector's rows, top to bottom. */
export function TestInspectorMenu({
  restart,
  view,
}: Readonly<{ restart: StartOverControls | null; view: TestInspectorView }>) {
  return (
    <DropdownMenu.Content
      align="end"
      aria-label="Test inspector"
      className={styles.menu}
      side="top"
      sideOffset={8}
    >
      <IdentityRows view={view} />
      <DropdownMenu.Separator className={styles.separator} />
      <ActionRows restart={restart} view={view} />
      <DropdownMenu.Separator className={styles.separator} />
      <InertRow hint="Coming soon" icon="⚙" label="Preferences" />
    </DropdownMenu.Content>
  );
}

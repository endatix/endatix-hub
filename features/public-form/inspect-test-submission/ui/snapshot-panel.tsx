"use client";

import type { InspectedSnapshot } from "@/features/public-form/inspect-test-submission/test-inspector-view";
import { InspectorPanel, PanelFields } from "./inspector-panel";
import styles from "./test-inspector.module.css";

const capturedFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

/** The same shape with or without a Snapshot, so a pasted copy always reads the same way. */
function snapshotJson(snapshot: InspectedSnapshot | null) {
  const values = snapshot?.values ?? [];
  return {
    capturedAt: snapshot?.capturedAt ?? null,
    variables: Object.fromEntries(
      values.map(({ name, value }) => [name, value]),
    ),
  };
}

function capturedAt(snapshot: InspectedSnapshot | null): string | null {
  const captured = snapshot?.capturedAt ? new Date(snapshot.capturedAt) : null;
  return captured && !Number.isNaN(captured.getTime())
    ? capturedFormat.format(captured)
    : null;
}

/** The Snapshot: the frozen values the survey was opened with, and when they were captured. */
export function SnapshotPanel({
  snapshot,
  onBack,
}: Readonly<{ snapshot: InspectedSnapshot | null; onBack: () => void }>) {
  const values = snapshot?.values ?? [];
  return (
    <InspectorPanel
      data={snapshotJson(snapshot)}
      onBack={onBack}
      title="Snapshot"
    >
      <PanelFields fields={[["Captured", capturedAt(snapshot)]]} />
      <p className={styles.sectionLabel}>Values</p>
      <PanelFields
        empty="No Snapshot values"
        fields={values.map(({ name, value }) => [name, value] as const)}
      />
    </InspectorPanel>
  );
}

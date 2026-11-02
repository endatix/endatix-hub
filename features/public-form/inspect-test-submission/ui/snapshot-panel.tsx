"use client";

import type { InspectedSnapshot } from "@/features/public-form/inspect-test-submission/test-inspector-view";
import { formatDetailsDateTime, toValidDate } from "@/lib/date-utils";
import { InspectorPanel, PanelFields, PanelSection } from "./inspector-panel";

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

/** As Submission Details shows it, so the same Snapshot reads the same on both pages. */
function capturedAt(snapshot: InspectedSnapshot | null): string | null {
  const captured = toValidDate(snapshot?.capturedAt);
  return captured ? formatDetailsDateTime(captured) : null;
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
      <PanelSection
        empty="No Snapshot values"
        fields={values.map(({ name, value }) => [name, value] as const)}
        title="Values"
      />
    </InspectorPanel>
  );
}

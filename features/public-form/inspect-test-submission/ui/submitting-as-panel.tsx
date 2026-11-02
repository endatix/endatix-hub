"use client";

import type { InspectedSubmitter } from "@/features/public-form/inspect-test-submission/test-inspector-view";
import { snapshotSourceLabel } from "@/lib/personalization/snapshot-source";
import {
  InspectorPanel,
  PanelFields,
  PanelSection,
  type PanelField,
} from "./inspector-panel";

function submitterJson({
  identifier,
  label,
  source,
  fields,
}: InspectedSubmitter) {
  return { identifier, label, source, fields: Object.fromEntries(fields) };
}

function identityFields(submitter: InspectedSubmitter): PanelField[] {
  const source = submitter.source
    ? snapshotSourceLabel(submitter.source)
    : null;
  return [
    ["Identifier", submitter.identifier],
    ["Label", submitter.label],
    ["Snapshot source", source],
  ];
}

/** Who the test submits as: identifier, Label, the Snapshot source, and the Submitter fields. */
export function SubmittingAsPanel({
  submitter,
  onBack,
}: Readonly<{ submitter: InspectedSubmitter; onBack: () => void }>) {
  return (
    <InspectorPanel
      data={submitterJson(submitter)}
      onBack={onBack}
      title="Submitting as"
    >
      <PanelFields fields={identityFields(submitter)} />
      <PanelSection
        empty="No Submitter fields"
        fields={submitter.fields}
        title="Submitter fields"
      />
    </InspectorPanel>
  );
}

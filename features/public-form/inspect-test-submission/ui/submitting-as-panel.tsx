"use client";

import type { InspectedSubmitter } from "@/features/public-form/inspect-test-submission/test-inspector-view";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
import {
  InspectorPanel,
  PanelFields,
  type PanelField,
} from "./inspector-panel";
import styles from "./test-inspector.module.css";

const SOURCE_LABELS: Record<PersonalizationSource, string> = {
  [PersonalizationSource.Test]: "Test as this person",
  [PersonalizationSource.Link]: "Personalised link",
  [PersonalizationSource.OnBehalf]: "On behalf",
};

function submitterJson({
  identifier,
  label,
  source,
  fields,
}: InspectedSubmitter) {
  return { identifier, label, source, fields: Object.fromEntries(fields) };
}

function identityFields(submitter: InspectedSubmitter): PanelField[] {
  const source = submitter.source ? SOURCE_LABELS[submitter.source] : null;
  return [
    ["Identifier", submitter.identifier],
    ["Label", submitter.label],
    ["Source", source],
  ];
}

/** Who the test submits as: identifier, Label, how the Snapshot was frozen, and the Submitter fields. */
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
      <p className={styles.sectionLabel}>Submitter fields</p>
      <PanelFields empty="No submitter fields" fields={submitter.fields} />
    </InspectorPanel>
  );
}

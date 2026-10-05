"use client";

import { StatusBadge } from "@/components/common/status-badge";
import { describeCollectionStatus } from "../describe-collection-status";

type CellCompleteStatusProps = {
  isComplete: boolean;
  collectionStatus?: string;
};

export function CellCompleteStatus({
  isComplete,
  collectionStatus,
}: Readonly<CellCompleteStatusProps>) {
  const view = describeCollectionStatus(collectionStatus, isComplete);
  return <StatusBadge tone={view.tone} label={view.label} />;
}

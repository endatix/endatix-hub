import { LockedValue } from "@/components/common/locked-value";
import { SummaryRow } from "@/components/common/summary-row";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { VariableName } from "../../ui/variable-name";
import { dataTypeLabel } from "../../property-types";

/** The key, copyable, with the lock on the field it constrains (DESIGN.md §6). */
function LockedVariableName({ value }: Readonly<{ value: string }>) {
  return (
    <LockedValue>
      <VariableName value={value} />
    </LockedValue>
  );
}

/** What a rename cannot change, as rows, with the one line saying why. */
export function LockedPropertyFacts({
  property,
}: Readonly<{ property: AudienceProperty }>) {
  return (
    <>
      <dl className="grid gap-3">
        <SummaryRow
          label="Variable name"
          value={<LockedVariableName value={property.variableName} />}
        />
        <SummaryRow label="Type" value={dataTypeLabel(property.dataType)} />
      </dl>
      <p className="text-xs text-muted-foreground">
        The variable name and type are set when a property is added and never
        change.
      </p>
    </>
  );
}

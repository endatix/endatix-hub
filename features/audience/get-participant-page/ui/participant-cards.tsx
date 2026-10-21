"use client";

import { useId, type ReactNode } from "react";
import { SummaryRow } from "@/components/common/summary-row";
import { TextLink } from "@/components/common/text-link";
import { CellDate } from "@/components/table";
import {
  AudienceLinkStatusKind,
  type AudienceParticipant,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { formRoutes } from "@/lib/routes/form-routes";
import { LinkStatusBadge } from "../../ui/link-status-badge";
import { NotSet } from "../../ui/not-set";
import { formatPropertyValue } from "../../utils";

type FactCardProps = { title: string; children: ReactNode };

/** A titled card of label → value rows, named for screen readers by its title. */
function FactCard({ title, children }: Readonly<FactCardProps>) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
    >
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      <dl className="grid gap-2">{children}</dl>
    </section>
  );
}

type ValuesCardProps = {
  participant: AudienceParticipant;
  properties: AudienceProperty[];
};

/** Their value for each of the form's properties; left out when the form has none. */
export function ValuesCard({
  participant,
  properties,
}: Readonly<ValuesCardProps>) {
  if (properties.length === 0) return null;
  const value = (p: AudienceProperty) =>
    formatPropertyValue(p, participant.values[p.id]) ?? <NotSet />;
  return (
    <FactCard title="Values">
      {properties.map((p) => (
        <SummaryRow key={p.id} label={p.name} value={value(p)} />
      ))}
    </FactCard>
  );
}

type LinkCardProps = { formId: string; participant: AudienceParticipant };

/** Their personalised link: shown only once one was issued (a test participant never has one). */
export function LinkCard({ formId, participant }: Readonly<LinkCardProps>) {
  const { link } = participant;
  if (link.status === AudienceLinkStatusKind.None) return null;
  const opened = link.status === AudienceLinkStatusKind.Opened ? link : null;
  return (
    <FactCard title="Link">
      <SummaryRow
        label="Status"
        value={<LinkStatusBadge status={link.status} />}
      />
      {opened ? (
        <SummaryRow
          label="Opened on"
          value={<CellDate date={opened.openedAt} />}
        />
      ) : null}
      {opened?.submissionId ? (
        <SummaryRow
          label="Response"
          value={
            <TextLink href={formRoutes.submission(formId, opened.submissionId)}>
              View response
            </TextLink>
          }
        />
      ) : null}
    </FactCard>
  );
}

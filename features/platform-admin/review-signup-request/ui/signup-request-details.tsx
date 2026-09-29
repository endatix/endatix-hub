"use client";

import { Building2, Gavel, Inbox } from "lucide-react";
import type { Route } from "next";
import { PanelSection } from "@/components/common/panel-section";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryRow } from "@/components/common/summary-row";
import { TextLink } from "@/components/common/text-link";
import { TruncatedId } from "@/components/common/truncated-id";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { formatPreciseDateTime } from "@/lib/date-utils";
import { describeSignupRequest } from "../signup-request-state";
import type { SignupRequestView, SignupReviewers } from "../types";
import { SignupReviewerLabel } from "./signup-reviewer-label";
import { SignupVisitorSection, visitorKey } from "./signup-visitor-section";

interface SignupRequestDetailsProps {
  request: SignupRequestView;
  reviewers: SignupReviewers;
}

/** The record, then who decided and how, then what the decision produced. */
export function SignupRequestDetails({
  request,
  reviewers,
}: Readonly<SignupRequestDetailsProps>) {
  const state = describeSignupRequest(request);
  const isDecided = request.status !== "pending";

  return (
    <>
      <PanelSection
        icon={Inbox}
        title="Request"
        // Once decided, the Decision section owns the state; one badge per fact.
        aside={isDecided ? undefined : <StatusBadge {...state.decision} />}
      >
        <dl className="grid gap-3">
          <SummaryRow
            label="Email"
            value={
              <span className="flex min-w-0 items-center gap-1">
                <span className="break-all">{request.email}</span>
                <CopyToClipboard
                  copyValue={request.email}
                  label="Copy email"
                  layout="inline"
                />
              </span>
            }
          />
          <SummaryRow
            label="Company"
            value={request.companyName ?? <NotSet />}
          />
          <SummaryRow
            label="Submitted"
            value={formatPreciseDateTime(request.createdAt)}
          />
        </dl>
      </PanelSection>

      {request.visitor && (
        <SignupVisitorSection
          key={visitorKey(request.visitor)}
          visitor={request.visitor}
        />
      )}

      {isDecided && (
        <PanelSection
          icon={Gavel}
          title="Decision"
          description="Recorded when the request was approved or rejected."
          aside={<StatusBadge {...state.decision} />}
        >
          <dl className="grid gap-3">
            <SummaryRow
              label="Decided by"
              value={
                <SignupReviewerLabel
                  userId={request.decidedByUserId}
                  reviewers={reviewers}
                />
              }
            />
            {request.decidedAt ? (
              <SummaryRow
                label="Decided"
                value={formatPreciseDateTime(request.decidedAt)}
              />
            ) : (
              <SummaryRow
                label="Last updated"
                value={
                  request.modifiedAt ? (
                    formatPreciseDateTime(request.modifiedAt)
                  ) : (
                    <NotSet />
                  )
                }
              />
            )}
          </dl>
          {request.status === "rejected" && (
            <figure className="grid gap-1.5">
              <figcaption className="text-sm text-muted-foreground">
                Reason
              </figcaption>
              <blockquote className="rounded-md bg-surface-container-lowest p-3 text-sm break-words whitespace-pre-wrap">
                {request.rejectionComment?.trim() || <NotSet />}
              </blockquote>
            </figure>
          )}
        </PanelSection>
      )}

      {state.provisioning && (
        <PanelSection
          icon={Building2}
          title="Workspace"
          description="The tenant created for the requester, who is invited as its Admin."
          aside={<StatusBadge {...state.provisioning} />}
        >
          <dl className="grid gap-3">
            <SummaryRow label="Name" value={request.tenantName ?? <NotSet />} />
            <SummaryRow
              label="Tenant id"
              value={
                request.approvedTenantId ? (
                  <TruncatedId
                    id={request.approvedTenantId}
                    copyLabel="Copy tenant id"
                  />
                ) : (
                  <NotSet label="Not created yet" />
                )
              }
            />
          </dl>
          {request.approvedTenantId && request.tenantName && (
            <TextLink
              href={
                `/admin/tenants?search=${encodeURIComponent(request.tenantName)}` as Route
              }
              className="w-fit text-sm"
            >
              Open in Tenants
            </TextLink>
          )}
        </PanelSection>
      )}
    </>
  );
}

function NotSet({ label = "Not set" }: Readonly<{ label?: string }>) {
  return (
    <span className="font-normal text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

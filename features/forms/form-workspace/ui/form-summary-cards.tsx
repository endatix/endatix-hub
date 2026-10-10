import type { Route } from "next";
import { Clock, Globe, List, Lock, Power } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { cn, getFormattedDate } from "@/lib/utils";
import type { Form } from "@/types";
import { formatRelativeOrCompactDateTime } from "@/lib/date-utils";

function submissionsCard(form: Form) {
  const count = form.submissionsCount ?? 0;
  return (
    <StatCard
      icon={List}
      label="Submissions"
      value={count.toLocaleString()}
      detail={count === 0 ? "No submissions yet" : "Received so far"}
      href={`/forms/${form.id}/submissions` as Route}
    />
  );
}

function statusCard(form: Form, settings: Route) {
  const on = form.isEnabled;
  return (
    <StatCard
      icon={Power}
      label="Status"
      value={
        <StatusBadge
          tone={on ? "on" : "off"}
          label={on ? "Enabled" : "Disabled"}
        />
      }
      detail={on ? "Accepting submissions" : "Not accepting submissions"}
      href={settings}
    />
  );
}

const VISIBILITY = Object.freeze({
  public: {
    icon: Globe,
    label: "Public",
    detail: "Anyone with the link can respond",
  },
  private: {
    icon: Lock,
    label: "Private",
    detail: "Only respondents you give access",
  },
});

function visibilityCard(form: Form, settings: Route) {
  const v = form.isPublic ? VISIBILITY.public : VISIBILITY.private;
  const tone = form.isPublic ? "on" : "off";
  return (
    <StatCard
      icon={v.icon}
      label="Visibility"
      value={<StatusBadge tone={tone} label={v.label} />}
      detail={v.detail}
      href={settings}
    />
  );
}

function modifiedCard(form: Form) {
  const now = new Date();
  return (
    <StatCard
      icon={Clock}
      label="Last changed"
      value={
        <span className="text-base">
          {formatRelativeOrCompactDateTime(form.modifiedAt, now)}
        </span>
      }
      detail={`Created ${formatRelativeOrCompactDateTime(form.createdAt, now)}`}
    />
  );
}

/**
 * The form's facts as cards: what came back, whether it is collecting, who can answer, and
 * when it last changed. Each card opens the page where it is explored or changed.
 */
export function FormSummaryCards({
  form,
  className,
}: Readonly<{ form: Form; className?: string }>) {
  const settings = `/forms/${form.id}/settings` as Route;
  return (
    <div className={cn("grid-card-list [--grid-card-min:200px]", className)}>
      {submissionsCard(form)}
      {statusCard(form, settings)}
      {visibilityCard(form, settings)}
      {modifiedCard(form)}
    </div>
  );
}

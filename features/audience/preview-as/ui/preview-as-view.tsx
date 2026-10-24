"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TextLink } from "@/components/common/text-link";
import { CellDate } from "@/components/table";
import { formRoutes } from "@/lib/routes/form-routes";
import { cn } from "@/lib/utils";
import { useAudienceReturnHref } from "../../get-audience-page/ui/use-audience-return-href";
import type { PreviewAsData } from "../load-preview-as.server";
import { ParticipantPicker } from "./participant-picker";
import { ParticipantStrip } from "./participant-strip";
import { pickerGroups, previewedPerson } from "./picker-groups";
import { PreviewSurvey } from "./preview-survey";

type PreviewAsViewProps = PreviewAsData & {
  formId: string;
  /** The form's workspace header, composed by the route so this feature does not import forms. */
  header?: ReactNode;
};

function Notice({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function SavedLine({ savedAt }: Readonly<{ savedAt: string }>) {
  return (
    <p className="text-sm text-muted-foreground">
      Saved form, last saved{" "}
      <time dateTime={savedAt}>
        <CellDate date={savedAt} />
      </time>
      . Answers here are not saved.
    </p>
  );
}

/** Why there is no form to show, or `null` when there is one. */
function emptyReason(props: PreviewAsViewProps): string | null {
  if (!props.form) return "Save the form in the designer to preview it.";
  if (!props.hasVariables)
    return "This form has no Properties yet. Add one on the Audience tab to preview the form as a participant.";
  if (!props.selected)
    return "Nobody to preview as yet. Add a Test participant, or find any participant by search.";
  if (props.selected.status === "gone")
    return "This participant is no longer on the form.";
  return null;
}

type PaneProps = PreviewAsViewProps & { pending: boolean };

function PreviewPane(props: Readonly<PaneProps>) {
  const { form, selected } = props;
  if (!form || selected?.status !== "found")
    return <Notice>{emptyReason(props)}</Notice>;
  const pane = cn("flex min-w-0 flex-col gap-4", props.pending && "opacity-60");
  return (
    <div className={pane}>
      <ParticipantStrip {...props} person={selected.person} />
      <SavedLine savedAt={form.savedAt} />
      <div className="rounded-xl border bg-card">
        <PreviewSurvey
          key={selected.person.audienceMemberId}
          {...form}
          variables={selected.variables}
        />
      </div>
    </div>
  );
}

function BackToAudience({ formId }: Readonly<{ formId: string }>) {
  return (
    <TextLink href={useAudienceReturnHref(formId)} className="self-start">
      <ArrowLeft aria-hidden="true" className="size-4" />
      Audience
    </TextLink>
  );
}

/**
 * The participant the list shows as selected. It moves on a key press at once, before the
 * server answers, so a second press steps on from it; a new server selection resets it.
 */
function useActiveMember(serverId: string | undefined) {
  const [active, setActive] = useState(serverId);
  const [seen, setSeen] = useState(serverId);
  if (serverId !== seen) {
    setSeen(serverId);
    setActive(serverId);
  }
  return [active, setActive] as const;
}

/** The participant and the search live in the URL, so a preview can be linked to. */
function usePreviewNavigation({
  formId,
  search,
  selected,
}: PreviewAsViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useActiveMember(
    previewedPerson(selected)?.audienceMemberId,
  );
  const go = (query: { member?: string; search?: string }) =>
    startTransition(() =>
      router.replace(formRoutes.previewAs(formId, query), { scroll: false }),
    );
  const select = (member: string) => {
    setActiveId(member);
    go({ member, search });
  };
  return { pending, activeId, select, find: (q: string) => go({ search: q }) };
}

/**
 * Audience Preview as: participants on the left, the saved form on the right as the selected
 * one gets it.
 */
export function PreviewAsView(props: Readonly<PreviewAsViewProps>) {
  const { pending, activeId, select, find } = usePreviewNavigation(props);
  return (
    <div className="flex flex-col gap-6">
      <BackToAudience formId={props.formId} />
      {props.header}
      <div className="grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
        <ParticipantPicker
          groups={pickerGroups(props)}
          search={props.search}
          selectedId={activeId}
          onSelect={select}
          onSearch={find}
        />
        <PreviewPane {...props} pending={pending} />
      </div>
    </div>
  );
}

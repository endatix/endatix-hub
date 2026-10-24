"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TextLink } from "@/components/common/text-link";
import { CellDate } from "@/components/table";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { formRoutes } from "@/lib/routes/form-routes";
import { cn } from "@/lib/utils";
import { useAudienceReturnHref } from "../../get-audience-page/ui/use-audience-return-href";
import type { PreviewAsData } from "../load-preview-as.server";
import { ParticipantPicker, type PickerGroup } from "./participant-picker";
import { ParticipantStrip } from "./participant-strip";
import { PreviewSurvey } from "./preview-survey";

type PreviewAsViewProps = PreviewAsData & {
  formId: string;
  /** The form's workspace header, composed by the route so this feature does not import forms. */
  header?: ReactNode;
};

const shownOf = (shown: number, total: number, what: string) =>
  total > shown
    ? `First ${shown} of ${total} ${what}. Search to find the rest.`
    : undefined;

function matchesNote(shown: number, others: number, total: number) {
  if (total === 0) return "Nobody on this form matches.";
  if (others === 0) return "Every match is listed above.";
  return shownOf(shown, total, "matches");
}

/** The previewed participant, when a link names one neither list holds. */
function previewingGroup(
  groups: PickerGroup[],
  person: AudiencePerson | undefined,
): PickerGroup[] {
  const listed = groups.some((group) =>
    group.people.some((p) => p.audienceMemberId === person?.audienceMemberId),
  );
  return person && !listed ? [{ label: "Previewing", people: [person] }] : [];
}

/** Test participants first; a search adds everyone it finds who is not already listed. */
function pickerGroups(props: PreviewAsViewProps): PickerGroup[] {
  const groups = listGroups(props);
  return [
    ...previewingGroup(groups, selectedPerson(props.selected)),
    ...groups,
  ];
}

function listGroups(props: PreviewAsViewProps): PickerGroup[] {
  const { testParticipants, totalTest, matches, totalMatches, search } = props;
  const test: PickerGroup = {
    label: "Test participants",
    people: testParticipants,
    note:
      totalTest === 0
        ? "No Test participants yet."
        : shownOf(testParticipants.length, totalTest, "Test participants"),
  };
  if (!matches) return [test];
  const listed = new Set(testParticipants.map((p) => p.audienceMemberId));
  const others = matches.filter((p) => !listed.has(p.audienceMemberId));
  const found: PickerGroup = {
    label: `Matching “${search}”`,
    people: others,
    note: matchesNote(matches.length, others.length, totalMatches),
  };
  return [test, found];
}

function selectedPerson(
  selected: PreviewAsData["selected"],
): AudiencePerson | undefined {
  return selected?.status === "found" ? selected.person : undefined;
}

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

function PreviewPane(
  props: Readonly<PreviewAsViewProps & { pending: boolean }>,
) {
  const reason = emptyReason(props);
  const { form, selected } = props;
  if (reason || !form || selected?.status !== "found")
    return <Notice>{reason}</Notice>;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-4",
        props.pending && "opacity-60",
      )}
    >
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
 * Audience Preview as: participants on the left, the saved form on the right as the selected
 * one gets it. The participant and the search live in the URL, so a preview can be linked to.
 */
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

export function PreviewAsView(props: Readonly<PreviewAsViewProps>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { formId, search } = props;
  const [activeId, setActiveId] = useActiveMember(
    selectedPerson(props.selected)?.audienceMemberId,
  );
  const go = (query: { member?: string; search?: string }) =>
    startTransition(() =>
      router.replace(formRoutes.previewAs(formId, query), { scroll: false }),
    );
  const select = (member: string) => {
    setActiveId(member);
    go({ member, search });
  };
  return (
    <div className="flex flex-col gap-6">
      <BackToAudience formId={formId} />
      {props.header}
      <div className="grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
        <ParticipantPicker
          groups={pickerGroups(props)}
          search={search}
          selectedId={activeId}
          onSelect={select}
          onSearch={(next) => go({ search: next })}
        />
        <PreviewPane {...props} pending={pending} />
      </div>
    </div>
  );
}
